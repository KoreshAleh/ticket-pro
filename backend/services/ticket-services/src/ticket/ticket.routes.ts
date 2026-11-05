import { Router } from "express";
import { TicketController } from "./ticket.controller";
import { authMiddleware, requireAdmin } from "../authMiddleware";


const router = Router()


router.get('/', TicketController.GetTickets)
router.get('/category', TicketController.GetCategory)
router.get('/my', authMiddleware,  TicketController.GetMyTickets)
router.get('/city', TicketController.getCities)
router.get('/verify/:token', TicketController.VerifyTicket)
router.post('/admin/events', authMiddleware, requireAdmin, TicketController.CreateEvent)
router.put('/admin/events/:id', authMiddleware, requireAdmin, TicketController.UpdateEvent)
router.delete('/admin/events/:id', authMiddleware, requireAdmin, TicketController.DeleteEvent)


export default router