export interface TicketSeatEntity {
    id?: number ;
    ticket_id: number;
    sector_id: number;
    row_number: number;
    seat_number: number;
    status: string;
    user_id: number;
    locked_at: Date
}