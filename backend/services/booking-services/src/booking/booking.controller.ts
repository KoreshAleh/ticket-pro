import { Request, Response } from "express";
import { BookingService } from "./booking.service";
import { SeatDto } from "./dto/ticketId.dto";
import { AuthenticatedRequest } from "../authMiddleware";



export class BookingController {
    static async CheckBookSeat(req: Request<{}, {}, SeatDto>, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
            const result = await BookingService.CheckSeat({ ...req.body, userId: user.id })
          
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
            if (err.message === "EVENT_NOT_AVAILABLE") {
                return res.status(409).json({ success: false, message: "This event has already started or is unavailable." });
            }
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later."
        });

    }

    static async GetSectorSeats(req: Request<{ ticketId: string; sectorId: string }>, res: Response) {
        const user = (req as AuthenticatedRequest).user;
        if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
        const { ticketId, sectorId } = req.params;

        try {
            const result = await BookingService.GetSeatsBySector(Number(ticketId), sectorId, user.id);

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (err: any) {
            console.error("======== DB ERROR LOG START ========");
            console.error("Message:", err.message);
            console.error("Stack:", err.stack);
            console.error("======== DB ERROR LOG END ========");
            return res.status(500).json({
                success: false,
                message: "Error fetching seats from cluster"
            });
        }
    }


    static async CancelBookSeat(req: Request<{}, {}, SeatDto>, res: Response){
        try{
            const user = (req as AuthenticatedRequest).user;
            if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
            await BookingService.cancelBookSeat({ ...req.body, userId: user.id })
            return res.status(200).json({ success: true, message: "Hold released successfully" });
        }catch(err){
            return res.status(500).json({ success: false, message: "Error releasing hold" });
        }
    }

    static async BuyWithBalance(req: Request<{}, {}, SeatDto>, res: Response) {
        const user = (req as AuthenticatedRequest).user;
        if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
        try {
            const result = await BookingService.buyWithBalance({ ...req.body, userId: user.id });
            return res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            if (error.message === "INSUFFICIENT_BALANCE") {
                return res.status(409).json({ success: false, message: "Insufficient balance." });
            }
            if (error.message === "SEAT_NOT_HELD_BY_USER") {
                return res.status(409).json({ success: false, message: "The seat hold expired. Select the seat again." });
            }
            console.error("[Booking] Balance purchase failed:", error);
            return res.status(500).json({ success: false, message: "Could not complete the purchase." });
        }
    }

    static async ClaimFreeSeat(req: Request<{}, {}, SeatDto>, res: Response) {
        const user = (req as AuthenticatedRequest).user;
        if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
        try {
            const result = await BookingService.claimFreeSeat({ ...req.body, userId: user.id });
            return res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            if (error.message === "SEAT_NOT_HELD_BY_USER") {
                return res.status(409).json({ success: false, message: "The seat hold expired. Select the seat again." });
            }
            if (error.message === "SEAT_NOT_FREE") {
                return res.status(400).json({ success: false, message: "This endpoint is only for free tickets." });
            }
            console.error("[Booking] Free ticket claim failed:", error);
            return res.status(500).json({ success: false, message: "Could not claim the free ticket." });
        }
    }
}