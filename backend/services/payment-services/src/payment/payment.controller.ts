import { StripePaymentDto } from "../dto/payment.dto";
import { PaymentService } from "./payment.service";
import { Request, Response } from "express";



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
            const result = await PaymentService.createSession(req.body)

            res.status(200).json({ url: result });
        }catch(err: any) {
            res.status(500).json({ error: err.message });
        }
    }
}

