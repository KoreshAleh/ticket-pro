import { Router } from "express";
import { PaymentController } from "./payment.controller";

const router = Router();


router.get('/test', PaymentController.GetTest)
router.post('/checkout', PaymentController.createStripeSession)


export default router;