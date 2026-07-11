import { Express } from "express";
import pool from "./config/db";
import redisClient from "./config/redis";
import { SeatDto } from "./dto/ticketId.dto";
import { TicketSeatEntity } from "./entities/ticket.seat.entity";



export class BookingService {
    static async CheckSeat(dto: SeatDto) {

        const cacheKey = `ticketSeat:${dto.ticketId}:${dto.sectorId}:${dto.row}:${dto.seat}`

        const redisCheckSeat = await redisClient.get(cacheKey)

        if (redisCheckSeat) {
            throw new Error("SEAT_CURRENTLY_LOCKED_BY_ANOTHER_USER");
        }

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
                locked_at = NOW() 
            WHERE 
                ticket_id = $3   
                AND sector_id = $4 
                AND row_number = $5 
                AND seat_number = $6 
                AND (
                    status = 'available' 
                    OR 
                    (status = 'selected' AND locked_at < NOW() - INTERVAL '15 minutes')) RETURNING *`, ['selected', dto.userId, dto.ticketId, dto.sectorId, dto.row, dto.seat])

        if (bookSeat.rowCount === 0) {
            throw new Error("SEAT_ACQUISITION_FAILED_ALREADY_TAKEN");
        }

        const updatedSeatData = bookSeat.rows[0];

        await redisClient.setEx(cacheKey, 900, JSON.stringify({
            userId: dto.userId,
            status: 'selected',
            expiresAt: Date.now() + 900 * 1000
        }));

        return { data: updatedSeatData }

    }

    static async GetSeatsBySector(ticketId: number, sectorId: string) {

    const result = await pool.query(`
        SELECT 
            id,
            row_number as "row",
            seat_number as "number",
            status
        FROM ticket_seats
        WHERE ticket_id = $1 AND sector_id = $2
        ORDER BY row_number ASC, seat_number ASC
    `, [ticketId, sectorId]);

        
   
    return result.rows
}




}