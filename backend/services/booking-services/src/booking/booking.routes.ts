import { Router } from "express";
import { BookingController } from "./booking.controller";
import { authMiddleware } from "../authMiddleware";

const router = Router();


router.post('/checkSelected', authMiddleware, BookingController.CheckBookSeat);
router.get('/seats/:ticketId/:sectorId', authMiddleware, BookingController.GetSectorSeats);
router.post('/cancelSelected', authMiddleware, BookingController.CancelBookSeat)
router.post('/buy-with-balance', authMiddleware, BookingController.BuyWithBalance)
router.post('/claim-free', authMiddleware, BookingController.ClaimFreeSeat)


export default router;