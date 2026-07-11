import { Request, Response } from "express";
import { BookingService } from "./booking.service";
import { SeatDto } from "./dto/ticketId.dto";



export class BookingController {
    static async CheckBookSeat(req: Request<{}, {}, SeatDto>, res: Response) {
        const { userId, ticketId, row, seat, sectorId } = req.body

        try {
            const result = await BookingService.CheckSeat(req.body)
            return res.status(200).json({
                success: true,
                message: "seat selected",
                ...result
            })
        } catch (err: any) {
            if (err.message == "SEAT_CURRENTLY_LOCKED_BY_ANOTHER_USER") {
                return res.status(409).json({ success: false, message: "This seat is already locked by another person!" })
            }

            if (err.message == "SEAT_ALREADY_PURCHASED") {
                return res.status(409).json({ success: false, message: "This seat is already purchased by another person!" })
            }

            if (err.message == "SEAT_ACQUISITION_FAILED_ALREADY_TAKEN") {
                return res.status(409).json({ success: false, message: "Someone took this seat first!" })
            }
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later."
        });

    }

    static async GetSectorSeats(req: Request<{ ticketId: string; sectorId: string }>, res: Response) {
      
        const { ticketId, sectorId } = req.params;

        try {
            // Передаем в сервис чистые типы. TicketId обязательно переводим в число.
            const result = await BookingService.GetSeatsBySector(Number(ticketId), sectorId);

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (err: any) {
            return res.status(500).json({
                success: false,
                message: "Error fetching seats from cluster"
            });
        }
    }
}