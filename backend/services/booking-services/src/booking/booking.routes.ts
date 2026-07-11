import { Router } from "express";
import { BookingController } from "./booking.controller";

const router = Router();


router.post('/checkSelected', BookingController.CheckBookSeat);
router.get('/seats/:ticketId/:sectorId', BookingController.GetSectorSeats);


export default router;