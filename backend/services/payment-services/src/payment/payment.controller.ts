import { StripePaymentDto } from "./dto/payment.dto";
import { PaymentService } from "./payment.service";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../authMiddleware";



export class PaymentController {
    static async GetTest(req: Request, res: Response) {
        try {
            const result = await PaymentService.test()
            res.status(200).json({ success: true, result: result })
        } catch (err: any) {
            if (err.message == "DB_PIZDA") {
                res.status(500).json({ success: false, message: "no connection" })
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error. Please try again later.",
                err: err
            });
        }


    }

    static async createStripeSession(req: Request<{}, {}, StripePaymentDto>, res: Response) {
        
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
            const result = await PaymentService.createSession({ ...req.body, userId: user.id, userEmail: user.email })

            return res.status(200).json(result);
        }catch(err: any) {
            console.error("DETAILED PAYMENT ERROR:", err);
            if (err.message === "SEAT_NOT_HELD_BY_USER") {
                return res.status(409).json({ success: false, message: "The seat hold expired. Select the seat again." });
            }
            return res.status(500).json({ error: err.message });
        }
    }

    static async createTopUpSession(req: Request, res: Response){
        try{
            const user = (req as AuthenticatedRequest).user;
            if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
            const result = await PaymentService.TopUpBalance({ ...req.body, userId: user.id, userEmail: user.email })
            return res.status(200).json({ url: result })
        }catch(err: any){
            console.error("DETAILED TOP UP ERROR:", err)
            if (typeof err.message === "string" && err.message.startsWith("INVALID_AMOUNT_VALUE")) {
                return res.status(400).json({
                    success: false,
                    message: "Top-up amount must be between $0.50 and $10,000 per transaction."
                });
            }
            return res.status(500).json({ error: err.message })
        }
    }

    static async VerifyCheckoutSession(req: Request<{ sessionId: string }>, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
            const result = await PaymentService.VerifyCheckoutSession(req.params.sessionId, user.id);
            return res.status(200).json({ success: true, ...result });
        } catch (err: any) {
            if (err.message === "CHECKOUT_OWNER_MISMATCH") {
                return res.status(403).json({ success: false, message: "This checkout belongs to another account." });
            }
            if (err.message === "NOT_A_TICKET_CHECKOUT") {
                return res.status(400).json({ success: false, message: "This checkout is not for a ticket." });
            }
            if (err.message === "KAFKA_PUBLISH_FAILED") {
                return res.status(500).json({ success: false, message: "Payment was received but ticket processing failed." });
            }
            console.error("[Payment] Checkout verification failed:", err.message);
            return res.status(500).json({ success: false, message: "Could not verify ticket payment." });
        }
    }


    static async WebHook(req: Request, res: Response){
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            return res.status(400).send("Missing stripe-signature header");
        }

         try{
            const result = await PaymentService.WebHook(req.body, sig)
            return res.status(200).json(result);
        }catch(err: any){
            if (err.message.startsWith("VERIFICATION_FAILED")) {
                return res.status(400).send(err.message);
            }

            if (err.message === "KAFKA_PUBLISH_FAILED") {
                return res.status(500).send("Internal Broker Error");
            }

            return res.status(500).send("Internal Server Error");
        }
    }
}
