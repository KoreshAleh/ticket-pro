import express from "express";
import TicketRoutes from "./ticket/ticket.routes"
import dotenv from "dotenv"



dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())

app.use("/", TicketRoutes)

app.listen(PORT, () => {
    console.log(`Auth service is working correctly on port ${PORT}!`);
});