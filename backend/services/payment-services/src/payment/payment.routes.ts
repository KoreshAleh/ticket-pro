import { Router } from "express";
import { PaymentController } from "./payment.controller";
import  express  from "express";
import { authMiddleware } from "../authMiddleware";
const router = Router();


router.get('/test', PaymentController.GetTest)
router.post('/checkout', authMiddleware, express.json(), PaymentController.createStripeSession)
router.post('/checkout-balance', authMiddleware, express.json(), PaymentController.createTopUpSession)
router.get('/verify/:sessionId', authMiddleware, PaymentController.VerifyCheckoutSession)
router.post(
    "/webhook", 
    express.raw({ type: 'application/json' }), 
    PaymentController.WebHook
);


export default router;