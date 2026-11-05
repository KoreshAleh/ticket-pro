import express from "express";
import TicketRoutes from "./ticket/ticket.routes"
import dotenv from "dotenv"
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { TicketService } from "./ticket/ticket.service";






dotenv.config()

const app = express()
app.use(cookieParser());

app.use(cors({
    origin: 'http://localhost:5173', // 
    credentials: true 
}));
const PORT = process.env.PORT || 3002

app.use(express.json())

app.use("/", TicketRoutes)

async function start() {
    await TicketService.initialize();
    app.listen(PORT, () => {
        console.log(`Ticket service is working correctly on port ${PORT}!`);
    });
}

void start().catch(error => {
    console.error("[Ticket] Service startup failed:", error);
    process.exitCode = 1;
});