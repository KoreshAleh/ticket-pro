import { Request, Response } from "express";
import { AuthenticatedRequest } from "../authMiddleware";
import { TicketService } from "./ticket.service";

export class TicketController {
    static async GetTickets(_req: Request, res: Response) {
        res.set("Cache-Control", "no-store");
        try {
            const result = await TicketService.Tickets();
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("[Ticket] Failed to load events:", error);
            return res.status(500).json({ success: false, message: "Internal server error." });
        }
    }

    static async GetCategory(_req: Request, res: Response) {
        try {
            const result = await TicketService.Category();
            return res.status(200).json({ success: true, fromCache: result.fromCache, data: result.data });
        } catch (error) {
            console.error("[Ticket] Failed to load categories:", error);
            return res.status(500).json({ success: false, message: "Internal server error." });
        }
    }

    static async GetMyTickets(req: Request, res: Response) {
        res.set("Cache-Control", "no-store");
        const user = (req as AuthenticatedRequest).user;
        if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
        try {
            const result = await TicketService.MyTickets(user.id);
            return res.status(200).json({ success: true, fromCache: result.fromCache, data: result.data });
        } catch (error) {
            console.error("[Ticket] Failed to load user's tickets:", error);
            return res.status(500).json({ success: false, message: "Internal server error." });
        }
    }

    static async getCities(_req: Request, res: Response) {
        try {
            const result = await TicketService.getCity();
            return res.status(200).json({ success: true, fromCache: result.fromCache, data: result.data });
        } catch (error) {
            console.error("[Ticket] Failed to load cities:", error);
            return res.status(500).json({ success: false, message: "Internal server error." });
        }
    }

    static async VerifyTicket(req: Request<{ token: string }>, res: Response) {
        try {
            const ticket = await TicketService.verifyQrToken(req.params.token);
            if (!ticket) return res.status(404).json({ success: false, valid: false });
            return res.status(200).json({ success: true, valid: true, data: ticket });
        } catch (error) {
            console.error("[Ticket] Ticket verification failed:", error);
            return res.status(500).json({ success: false, message: "Could not verify ticket." });
        }
    }

    static async CreateEvent(req: Request, res: Response) {
        try {
            const event = await TicketService.createEvent(req.body);
            return res.status(201).json({ success: true, data: event });
        } catch (error: any) {
            if (error.message === "INVALID_EVENT_INPUT") {
                return res.status(400).json({ success: false, message: "Check event title, date, price, category, and city." });
            }
            console.error("[Ticket Admin] Event creation failed:", error);
            return res.status(500).json({ success: false, message: "Could not create event." });
        }
    }

    static async UpdateEvent(req: Request<{ id: string }>, res: Response) {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid event id." });
        }
        try {
            const event = await TicketService.updateEvent(id, req.body);
            return res.status(200).json({ success: true, data: event });
        } catch (error: any) {
            if (error.message === "INVALID_EVENT_INPUT") {
                return res.status(400).json({ success: false, message: "Check event title, date, price, category, and city." });
            }
            if (error.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({ success: false, message: "Event not found." });
            }
            console.error("[Ticket Admin] Event update failed:", error);
            return res.status(500).json({ success: false, message: "Could not update event." });
        }
    }

    static async DeleteEvent(req: Request<{ id: string }>, res: Response) {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid event id." });
        }
        try {
            await TicketService.deleteEvent(id);
            return res.status(200).json({ success: true });
        } catch (error: any) {
            if (error.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({ success: false, message: "Event not found." });
            }
            if (error.message === "EVENT_HAS_PURCHASES" || error.message === "EVENT_HAS_ACTIVE_HOLDS") {
                return res.status(409).json({ success: false, message: "An event with purchased tickets or active seat holds cannot be deleted." });
            }
            console.error("[Ticket Admin] Event deletion failed:", error);
            return res.status(500).json({ success: false, message: "Could not delete event." });
        }
    }
}
