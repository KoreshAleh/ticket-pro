export interface StripePaymentDto{
    amount: number;
    currency: string;
    userId: number;
    ticketId: number;
    userEmail: string;
    sectorId: string;
    row: number;
    seatNumId: number;
}