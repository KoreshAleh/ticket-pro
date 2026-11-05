import { Express } from "express";
import pool from "./config/db";
import redisClient from "./config/redis";
import { SeatDto } from "./dto/ticketId.dto";
import { TicketSeatEntity } from "./entities/ticket.seat.entity";
import { kafkaConsumer } from "./config/kafka";
import QRCode from "qrcode";
import crypto from "crypto"

const eventListCacheVersionKey = "ticket:all:version:v1";


export class BookingService {
    static async initialize() {
        await pool.query(`ALTER TABLE ticket_seats ADD COLUMN IF NOT EXISTS qr_token_hash TEXT`);
        await pool.query(`ALTER TABLE ticket_seats ADD COLUMN IF NOT EXISTS qr_code TEXT`);
        await pool.query(`ALTER TABLE ticket_seats ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ`);
        await pool.query(`
            UPDATE ticket_seats
            SET hold_expires_at = COALESCE(locked_at + INTERVAL '15 minutes', NOW())
            WHERE status = 'selected' AND hold_expires_at IS NULL
        `);
        const missingCodes = await pool.query<{ id: number }>(
            `SELECT DISTINCT ts.id
             FROM ticket_seats ts
             JOIN purchases p ON p.ticket_seat_id = ts.id
             WHERE ts.status = 'sold' AND (ts.qr_token_hash IS NULL OR ts.qr_code IS NULL)`
        );
        for (const seat of missingCodes.rows) {
            const qr = await this.generateQrCode();
            await pool.query(
                `UPDATE ticket_seats SET qr_token_hash = $1, qr_code = $2 WHERE id = $3`,
                [qr.tokenHash, qr.qrCode, seat.id]
            );
        }
        if (missingCodes.rowCount) {
            console.log(`[QR] Generated codes for ${missingCodes.rowCount} existing purchased seats.`);
        }
    }

    static async CheckSeat(dto: SeatDto) {

        const event = await pool.query(
            `SELECT 1 FROM tickets WHERE id = $1 AND event_date > NOW()`,
            [dto.ticketId]
        );
        if (!event.rowCount) throw new Error("EVENT_NOT_AVAILABLE");

        const permPayCheck = await pool.query(`SELECT status FROM ticket_seats 
             WHERE ticket_id = $1 AND sector_id = $2 AND row_number = $3 AND seat_number = $4`,
            [dto.ticketId, dto.sectorId, dto.row, dto.seat])


        if (permPayCheck.rows.length > 0 && permPayCheck.rows[0].status === "sold") {
            throw new Error("SEAT_ALREADY_PURCHASED");

        }

        const bookSeat = await pool.query<TicketSeatEntity>(`
            UPDATE
                ticket_seats 
            SET 
                status = $1,     
                user_id = $2,    
                locked_at = NOW(),
                hold_expires_at = NOW() + INTERVAL '15 minutes'
            WHERE 
                ticket_id = $3   
                AND sector_id = $4 
                AND row_number = $5 
                AND seat_number = $6 
                AND (
                    status = 'available' 
                    OR 
                    (status = 'selected' AND (hold_expires_at IS NULL OR hold_expires_at <= NOW())))
                AND EXISTS (SELECT 1 FROM tickets WHERE id = ticket_seats.ticket_id AND event_date > NOW())
                RETURNING *`, ['selected', dto.userId, dto.ticketId, dto.sectorId, dto.row, dto.seat])

        if (bookSeat.rowCount === 0) {
            throw new Error("SEAT_ACQUISITION_FAILED_ALREADY_TAKEN");
        }

        const updatedSeatData = bookSeat.rows[0];
        await this.invalidateEventListCache();

        return { data: updatedSeatData }

    }

    static async GetSeatsBySector(ticketId: number, sectorId: string, userId: number) {
        if (!ticketId || isNaN(ticketId) || !sectorId) {
            console.error(`[GetSeatsBySector] Bad arguments: ticketId=${ticketId}, sectorId=${sectorId}`);
            throw new Error("INVALID_SEAT_QUERY");
        }

        const expiredHolds = await pool.query<{ row_number: number; seat_number: number }>(
            `UPDATE ticket_seats
             SET status = 'available', user_id = NULL, locked_at = NULL, hold_expires_at = NULL
             WHERE ticket_id = $1 AND sector_id = $2
               AND status = 'selected'
               AND (hold_expires_at IS NULL OR hold_expires_at <= NOW())
             RETURNING row_number, seat_number`,
            [ticketId, sectorId]
        );
        if (expiredHolds.rowCount) await this.invalidateEventListCache();
        const result = await pool.query(`
    SELECT 
        id,
        row_number as "row",
        seat_number as "number",
        status,
        price::float AS price,
        COALESCE(status = 'selected' AND user_id = $3 AND hold_expires_at > NOW(), FALSE) AS is_mine
    FROM public.ticket_seats
    WHERE ticket_id = $1 AND sector_id = $2
    ORDER BY row_number ASC, seat_number ASC
`, [ticketId, sectorId, userId]);



        return result.rows
    }


    static async cancelBookSeat(dto: SeatDto) {
        const result = await pool.query(`
        UPDATE ticket_seats 
        SET status = 'available', user_id = NULL, locked_at = NULL, hold_expires_at = NULL
        WHERE ticket_id = $1 
          AND sector_id = $2 
          AND row_number = $3 
          AND seat_number = $4 
          AND status = 'selected' 
          AND user_id = $5
    `, [dto.ticketId, dto.sectorId, dto.row, dto.seat, dto.userId]);
    if (result.rowCount) await this.invalidateEventListCache();
    }

    static async buyWithBalance(dto: SeatDto) {
        const client = await pool.connect();
        let seatId: number;
        let balance: number;
        try {
            await client.query("BEGIN");
            const seat = await client.query<{ id: number; price: string | number; row_number: number; seat_number: number }>(
                `SELECT ts.id, ts.price, ts.row_number, ts.seat_number
                 FROM ticket_seats ts
                 JOIN tickets t ON t.id = ts.ticket_id
                 WHERE ts.ticket_id = $1 AND ts.sector_id = $2 AND ts.row_number = $3 AND ts.seat_number = $4
                   AND ts.status = 'selected' AND ts.user_id = $5
                   AND ts.hold_expires_at > NOW()
                   AND t.event_date > NOW()
                 FOR UPDATE OF ts`,
                [dto.ticketId, dto.sectorId, dto.row, dto.seat, dto.userId]
            );
            const selectedSeat = seat.rows[0];
            if (!selectedSeat) throw new Error("SEAT_NOT_HELD_BY_USER");
            const price = Number(selectedSeat.price);

            const debit = await client.query<{ balance: number | string }>(
                `UPDATE users SET balance = COALESCE(balance, 0) - $1
                 WHERE id = $2 AND COALESCE(balance, 0) >= $1
                 RETURNING balance`,
                [price, dto.userId]
            );
            const updatedBalance = debit.rows[0]?.balance;
            if (updatedBalance === undefined) throw new Error("INSUFFICIENT_BALANCE");
            balance = Number(updatedBalance);

            const sold = await client.query(
                `UPDATE ticket_seats SET status = 'sold', locked_at = NULL, hold_expires_at = NULL
                 WHERE id = $1 AND status = 'selected' AND user_id = $2
                 RETURNING id`,
                [selectedSeat.id, dto.userId]
            );
            if (!sold.rowCount) throw new Error("SEAT_NOT_HELD_BY_USER");

            const purchase = await client.query(
                `INSERT INTO purchases (user_id, ticket_seat_id, purchase_date)
                 VALUES ($1, $2, NOW()) RETURNING id`,
                [dto.userId, selectedSeat.id]
            );
            await client.query(
                `INSERT INTO balance_transactions (user_id, purchase_id, amount, transaction_type)
                 VALUES ($1, $2, $3, 'purchase')`,
                [dto.userId, purchase.rows[0].id, -price]
            );

            const qr = await this.generateQrCode();
            await client.query(
                `UPDATE ticket_seats SET qr_token_hash = $1, qr_code = $2 WHERE id = $3`,
                [qr.tokenHash, qr.qrCode, selectedSeat.id]
            );

            await client.query("COMMIT");
            seatId = selectedSeat.id;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        try {
            await redisClient.del(`user:${dto.userId}:ticket`);
        } catch (error) {
            console.error("[Booking] Purchase succeeded, but cache invalidation failed:", error);
        }
        await this.invalidateEventListCache();
        return {
            message: "Ticket purchased successfully.",
            seatId,
            balance
        };
    }

    static async claimFreeSeat(dto: SeatDto) {
        const client = await pool.connect();
        let seatId: number;
        try {
            await client.query("BEGIN");
            const seat = await client.query<{ id: number; price: string | number }>(
                `SELECT ts.id, ts.price
                 FROM ticket_seats ts
                 JOIN tickets t ON t.id = ts.ticket_id
                 WHERE ts.ticket_id = $1 AND ts.sector_id = $2 AND ts.row_number = $3 AND ts.seat_number = $4
                   AND ts.status = 'selected' AND ts.user_id = $5
                   AND ts.hold_expires_at > NOW() AND t.event_date > NOW()
                 FOR UPDATE OF ts`,
                [dto.ticketId, dto.sectorId, dto.row, dto.seat, dto.userId]
            );
            const selectedSeat = seat.rows[0];
            if (!selectedSeat) throw new Error("SEAT_NOT_HELD_BY_USER");
            if (Number(selectedSeat.price) !== 0) throw new Error("SEAT_NOT_FREE");

            const sold = await client.query(
                `UPDATE ticket_seats
                 SET status = 'sold', locked_at = NULL, hold_expires_at = NULL
                 WHERE id = $1 AND status = 'selected' AND user_id = $2
                 RETURNING id`,
                [selectedSeat.id, dto.userId]
            );
            if (!sold.rowCount) throw new Error("SEAT_NOT_HELD_BY_USER");

            await client.query(
                `INSERT INTO purchases (user_id, ticket_seat_id, purchase_date)
                 VALUES ($1, $2, NOW())`,
                [dto.userId, selectedSeat.id]
            );

            const qr = await this.generateQrCode();
            await client.query(
                `UPDATE ticket_seats SET qr_token_hash = $1, qr_code = $2 WHERE id = $3`,
                [qr.tokenHash, qr.qrCode, selectedSeat.id]
            );
            await client.query("COMMIT");
            seatId = selectedSeat.id;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        try {
            await redisClient.del(`user:${dto.userId}:ticket`);
        } catch (error) {
            console.error("[Booking] Free ticket claimed, but cache invalidation failed:", error);
        }
        await this.invalidateEventListCache();
        return { message: "Free ticket claimed successfully.", seatId };
    }


    static async SuccessConsumer() {
        await kafkaConsumer.connect()

        await kafkaConsumer.subscribe({ topic: "payment-success", fromBeginning: true })

        console.log("Kafka Consumer: Listening for 'payment-success' events...");

        await kafkaConsumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) return;

                const { userId, ticketId, sectorId, row, seatNumId } = JSON.parse(message.value.toString());

                console.log(`[Kafka Consumer] Processing payment for Seat: R${row}-S${seatNumId} (Ticket: ${ticketId})`);


                const client = await pool.connect();

                try {
                    await client.query('BEGIN');

                    // 1. Обновляем статус в базе данных на 'sold'
                    const dbUpdate = await client.query(`
                    UPDATE ticket_seats 
                    SET status = 'sold', user_id = $1, locked_at = NULL, hold_expires_at = NULL
                    WHERE id = $2 AND (
                        (status = 'selected' AND user_id = $1)
                        OR (status = 'sold' AND user_id = $1)
                    )
                `, [userId, seatNumId]);

                    if (dbUpdate.rowCount === 0) {
                        throw new Error(`SEAT_HOLD_LOST: ${seatNumId}`);
                    }
                    // 2. Создаем запись о покупке билета в purchases
                    await client.query(`
                    INSERT INTO purchases (user_id, ticket_seat_id, purchase_date) 
                    SELECT $1, $2, NOW()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM purchases WHERE user_id = $1 AND ticket_seat_id = $2
                    )
                `, [userId, seatNumId]);

                    const existingQR = await client.query(`
                        SELECT qr_token_hash, qr_code
                        FROM ticket_seats
                        WHERE id = $1
                    `, [seatNumId]);

                    let qrCode = existingQR.rows[0].qr_code;

                    if (!qrCode) {
                        // Создаём токен
                        const qr = await this.generateQrCode();
                        qrCode = qr.qrCode;

                        
                        await client.query(`
                            UPDATE ticket_seats
                            SET qr_token_hash = $1,
                            qr_code = $2
                            WHERE id = $3
                    `, [qr.tokenHash, qrCode, seatNumId]);

                        console.log("[QR] New QR code generated!");
                    } else {
                        console.log("[QR] QR code already exists!");
                    }

                    await client.query('COMMIT');
                    console.log(`[DB Success] Seat ID ${seatNumId} is officially SOLD to user ${userId}`);

                } catch (err: any) {
                    await client.query('ROLLBACK');
                    console.error(`[DB Error] Transaction rolled back for seat R${row}-S${seatNumId}:`, err.message);
                    // Если база упала, мы НЕ перехватываем ошибку дальше, чтобы Kafka поняла, 
                    // что сообщение не обработано, и попробовала прочитать его снова (Retry).
                    throw err;
                } finally {
                    client.release();
                }
                try {
                    await redisClient.del(`user:${Number(userId)}:ticket`);
                } catch (cacheError) {
                    console.error("[Booking] Ticket was purchased, but cache invalidation failed:", cacheError);
                }
                await this.invalidateEventListCache();

            }
        })
    }

    private static async generateQrCode() {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const qrCode = await QRCode.toDataURL(`${frontendUrl}/verify/${token}`);
        return { tokenHash, qrCode };
    }

    private static async invalidateEventListCache() {
        try {
            await redisClient.incr(eventListCacheVersionKey);
        } catch (error) {
            console.error("[Booking] Event list cache could not be invalidated:", error);
        }
    }
}