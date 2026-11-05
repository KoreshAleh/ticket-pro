import { StripePaymentDto } from "./dto/payment.dto";
import Stripe from "stripe";
import pool from "./config/db";
import { stripe, isStripeConfigured } from "./config/stripe";
import { kafkaProducer } from "./config/kafka";
import { TopUpBalance } from "./dto/topUpBalance";

const MAX_TOP_UP_CENTS = 1_000_000;

// 4242 4242 4242 4242

export class PaymentService {
    private static readonly publishedTicketSessions = new Map<string, number>();

    static async ensureBalanceTransactionSchema() {
        await pool.query(`ALTER TABLE ticket_seats ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ`);
        await pool.query(`
            UPDATE ticket_seats
            SET hold_expires_at = COALESCE(locked_at + INTERVAL '15 minutes', NOW())
            WHERE status = 'selected' AND hold_expires_at IS NULL
        `);
        await pool.query(`
            ALTER TABLE balance_transactions
            ADD COLUMN IF NOT EXISTS stripe_session_id TEXT
        `);
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS balance_transactions_stripe_session_id_uq
            ON balance_transactions (stripe_session_id)
            WHERE stripe_session_id IS NOT NULL
        `);
    }

    static async test() {
        const req = await pool.query("SELECT NOW()")

        const data = req.rows

        if (data) {
            throw new Error("DB_PIZDA");

        }
        return data
    }

    static async createSession(dto: StripePaymentDto) {

        if (!dto.userId || !dto.ticketId || !dto.sectorId || !dto.seatNumId) {
            throw new Error("MISSING_REQUIRED_PAYMENT_FIELDS");
        }

        if (!isStripeConfigured || !stripe) {
            throw new Error("STRIPE_SECRET_KEY is not configured. Set it before creating a checkout session.");
        }

        try {
            const seat = await pool.query<{
                title: string;
                price: string | number;
                row_number: number;
                seat_number: number;
                hold_expires_at: Date;
            }>(
                `SELECT t.title, ts.price, ts.row_number, ts.seat_number, ts.hold_expires_at
                 FROM ticket_seats ts
                 JOIN tickets t ON t.id = ts.ticket_id
                 WHERE ts.id = $1 AND ts.ticket_id = $2 AND ts.sector_id = $3
                   AND ts.status = 'selected' AND ts.user_id = $4
                   AND ts.hold_expires_at > NOW()
                   AND t.event_date > NOW()`,
                [dto.seatNumId, dto.ticketId, dto.sectorId, dto.userId]
            );
            const seatDetails = seat.rows[0];
            if (!seatDetails) throw new Error("SEAT_NOT_HELD_BY_USER");
            const cleanAmount = Math.round(Number(seatDetails.price) * 100);
            if (!Number.isSafeInteger(cleanAmount) || cleanAmount <= 0 || cleanAmount > 99999999) {
                throw new Error("INVALID_SEAT_PRICE");
            }

            const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;
            const extendedHold = await pool.query(
                `UPDATE ticket_seats
                 SET hold_expires_at = TO_TIMESTAMP($1)
                 WHERE id = $2 AND status = 'selected' AND user_id = $3
                   AND hold_expires_at > NOW()
                   AND EXISTS (SELECT 1 FROM tickets WHERE id = ticket_seats.ticket_id AND event_date > NOW())
                 RETURNING id`,
                [expiresAt, dto.seatNumId, dto.userId]
            );
            if (!extendedHold.rowCount) throw new Error("SEAT_NOT_HELD_BY_USER");

            const restoreHold = async () => pool.query(
                `UPDATE ticket_seats SET hold_expires_at = $1
                 WHERE id = $2 AND status = 'selected' AND user_id = $3
                   AND hold_expires_at = TO_TIMESTAMP($4)`,
                [seatDetails.hold_expires_at, dto.seatNumId, dto.userId, expiresAt]
            );

            let session: Stripe.Checkout.Session;
            try {
                session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    customer_email: dto.userEmail,
                    expires_at: expiresAt,
                    metadata: {
                        userId: String(dto.userId),
                        ticketId: String(dto.ticketId),
                        sectorId: String(dto.sectorId),
                        row: String(seatDetails.row_number),
                        seatNumId: String(dto.seatNumId)
                    },
                    line_items: [
                        {
                            price_data: {
                                currency: dto.currency,
                                product_data: {
                                    name: seatDetails.title,
                                },
                                unit_amount: cleanAmount,
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/userpage`,
                });
            } catch (error) {
                try {
                    await restoreHold();
                } catch (restoreError) {
                    console.error("[Payment] Failed to restore the previous seat hold expiry:", restoreError);
                }
                throw error;
            }

            if (!session.url) {
                try {
                    await restoreHold();
                } catch (restoreError) {
                    console.error("[Payment] Failed to restore the previous seat hold expiry:", restoreError);
                }
                throw new Error("URL_NOT_FOUND");
            }

            return { url: session.url, expiresAt: session.expires_at };
        } catch (err: any) {
            console.error("Error in Stripe PaymentService:", err.message);
            throw err;
        }
    }

    static async TopUpBalance(dto: TopUpBalance) {
        if (!dto.userId || !dto.userEmail || !dto.amount) {
            throw new Error("MISSING_REQUIRED_PAYMENT_FIELDS");
        }

        const cleanAmount = Math.round(Number(dto.amount));

        if (!Number.isSafeInteger(cleanAmount) || cleanAmount < 50 || cleanAmount > MAX_TOP_UP_CENTS) {
            throw new Error(`INVALID_AMOUNT_VALUE: Received '${dto.amount}'`);
        }

        if (!isStripeConfigured || !stripe) {
            throw new Error("STRIPE_SECRET_KEY is not configured. Set it before creating a top-up checkout session.");
        }

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                customer_email: dto.userEmail,
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Account Balance Top Up',
                            },
                            unit_amount: cleanAmount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/success-top-up?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/userpage`,
                metadata: {
                    type: 'BALANCE_TOPUP',
                    userId: dto.userId.toString(),
                    amountInCents: cleanAmount.toString()
                }
            });

            return session.url
        } catch (err: any) {
            console.error(`Error in Stripe Service(TopUpBalance): ${err.message}`)
            throw err;
        }
    }

    static async WebHook(body: any, sig: any) {
        if (!isStripeConfigured || !stripe) {
            throw new Error("STRIPE_SECRET_KEY is not configured. Webhook cannot be verified without Stripe credentials.");
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                body,
                sig,
                process.env.STRIPE_WEBHOOK as string
            )
        } catch (err: any) {
            console.error("Webhook signature verification failed:", err.message);
            throw new Error(`VERIFICATION_FAILED: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
            const session = event.data.object as any;
            if (session.payment_status !== "paid") return { received: true };
            const metadata = session.metadata || {};

            if (metadata.type === 'BALANCE_TOPUP') {
                const { userId, amountInCents } = metadata;
                await this.applyBalanceTopUp(session, userId, amountInCents);
                return { received: true };
            }

            await this.publishTicketPurchase(session);
        }

        return { received: true };
    }

    static async VerifyCheckoutSession(sessionId: string, authenticatedUserId: number) {
        if (!isStripeConfigured || !stripe) {
            throw new Error("STRIPE_SECRET_KEY is not configured.");
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const metadata = session.metadata || {};
        if (Number(metadata.userId) !== authenticatedUserId) throw new Error("CHECKOUT_OWNER_MISMATCH");
        if (session.payment_status !== "paid") {
            return { paid: false, completed: false };
        }

        if (metadata.type === "BALANCE_TOPUP") {
            await this.applyBalanceTopUp(session, metadata.userId, metadata.amountInCents);
            return { paid: true, completed: true, type: "BALANCE_TOPUP" };
        }

        const userId = Number(metadata.userId);
        const ticketId = Number(metadata.ticketId);
        const seatNumId = Number(metadata.seatNumId);
        const row = Number(metadata.row);
        const sectorId = metadata.sectorId;

        if (
            !Number.isInteger(userId) || userId <= 0 ||
            !Number.isInteger(ticketId) || ticketId <= 0 ||
            !Number.isInteger(seatNumId) || seatNumId <= 0 ||
            !Number.isInteger(row) || row <= 0 ||
            !sectorId
        ) {
            throw new Error("INVALID_TICKET_CHECKOUT_METADATA");
        }
        if (userId !== authenticatedUserId) throw new Error("CHECKOUT_OWNER_MISMATCH");

        const purchase = await pool.query(
            `SELECT 1
             FROM purchases p
             JOIN ticket_seats ts ON ts.id = p.ticket_seat_id
             WHERE p.user_id = $1 AND ts.id = $2 AND ts.status = 'sold'
             LIMIT 1`,
            [userId, seatNumId]
        );

        if (purchase.rowCount) {
            this.publishedTicketSessions.delete(session.id);
            return { paid: true, completed: true, ticketId, seatId: seatNumId };
        }

        await this.publishTicketPurchase(session);
        return { paid: true, completed: false, ticketId, seatId: seatNumId };
    }

    private static async applyBalanceTopUp(
        session: Stripe.Checkout.Session,
        userIdValue: string | undefined,
        amountInCentsValue: string | undefined
    ) {
        const userId = Number(userIdValue);
        const amountInCents = Number(amountInCentsValue);
        if (!Number.isInteger(userId) || userId <= 0 || !Number.isSafeInteger(amountInCents) ||
            amountInCents < 50 || amountInCents > MAX_TOP_UP_CENTS) {
            throw new Error("INVALID_TOPUP_METADATA");
        }

        await this.ensureBalanceTransactionSchema();
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const ledger = await client.query(
                `INSERT INTO balance_transactions (user_id, amount, transaction_type, stripe_session_id)
                 VALUES ($1, $2, 'deposit', $3)
                 ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING
                 RETURNING id`,
                [userId, amountInCents / 100, session.id]
            );
            if (ledger.rowCount) {
                const updatedUser = await client.query(
                    `UPDATE users SET balance = COALESCE(balance, 0) + $1
                     WHERE id = $2 RETURNING id`,
                    [amountInCents / 100, userId]
                );
                if (!updatedUser.rowCount) throw new Error("TOPUP_USER_NOT_FOUND");
            }
            await client.query("COMMIT");
            console.log(`[Balance TopUp] Processed session ${session.id} for user ${userId}.`);
        } catch (error) {
            await client.query("ROLLBACK");
            console.error(`[Balance TopUp Error] Failed to process session ${session.id}:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    private static async publishTicketPurchase(session: Stripe.Checkout.Session) {
        const lastPublishedAt = this.publishedTicketSessions.get(session.id);
        if (lastPublishedAt && Date.now() - lastPublishedAt < 5000) {
            return;
        }

        const metadata = session.metadata || {};
        const { userId, ticketId, sectorId, row, seatNumId } = metadata;
        if (!userId || !ticketId || !sectorId || !row || !seatNumId) {
            throw new Error("INVALID_TICKET_CHECKOUT_METADATA");
        }

        console.log(`[Payment Service] Publishing paid checkout ${session.id} to Kafka...`);
        await kafkaProducer.connect();

        try {
            await kafkaProducer.send({
                topic: "payment-success",
                messages: [{
                    key: `${ticketId}:${sectorId}:${row}:${seatNumId}`,
                    value: JSON.stringify({
                        userId: Number(userId),
                        ticketId: Number(ticketId),
                        seatNumId: Number(seatNumId),
                        sectorId,
                        row: Number(row),
                        amount: (session.amount_total || 0) / 100,
                        stripeSessionId: session.id
                    })
                }]
            });
            this.publishedTicketSessions.set(session.id, Date.now());
            console.log(`[Kafka] Message successfully sent to 'payment-success'`);
        } catch (kafkaErr: any) {
            console.error("[Kafka] Failed to publish payment-success event:", kafkaErr.message);
            throw new Error("KAFKA_PUBLISH_FAILED");
        }
    }
}