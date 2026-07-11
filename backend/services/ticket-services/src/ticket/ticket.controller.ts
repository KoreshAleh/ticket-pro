import { Request, Response } from "express";
import { TicketService } from "./ticket.service";

export class TicketController{
        static async GetTickets(req: Request, res: Response){
            try{
                const result = await TicketService.Tickets()

                return res.status(200).json({
                    success: true,
                    fromCache: result.fromCache,
                    data: result.data
                })
            }catch(err){
                console.error("Error in getAllTickets:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
            }
        }

        static async GetCategory(req: Request, res: Response){
            try{
                const result = await TicketService.Category()
                return res.status(200).json({
                success: true,
                fromCache: result.fromCache,
                data: result.data
            });
            }catch(err){
                console.error("Error in getCategories:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
            }
        }

        static async GetMyTickets(req: Request, res: Response) {
        try {
            
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1]; // Отрезаем 'Bearer'

            if (!token) {
                return res.status(401).json({ success: false, message: "Token not provided" });
            }

            
            const result = await TicketService.MyTickets(token);

            return res.status(200).json({
                success: true,
                fromCache: result.fromCache,
                data: result.data
            });
        } catch (err: any) {
            console.error("Error in getMyTickets:", err);

            // Если сервис выкинул UNAUTHORIZED, возвращаем 401 статус
            if (err.message === "UNAUTHORIZED") {
                return res.status(401).json({ success: false, message: "Invalid or expired token" });
            }

            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    static async getCities(req: Request, res: Response){
        try{
             const result = await  TicketService.getCity()
                return res.status(200).json({
                success: true,
                fromCache: result.fromCache,
                data: result.data
            });
            }catch(err){
                console.error("Error in getCities:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
            }
        
       


        
    }
}