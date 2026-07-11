import { Router } from "express";
import { TicketController } from "./ticket.controller";


const router = Router()


router.get('/', TicketController.GetTickets)
router.get('/category', TicketController.GetCategory)
router.get('/my', TicketController.GetMyTickets)
router.get('/city', TicketController.getCities)


export default router