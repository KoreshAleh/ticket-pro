import express from "express";
import dotenv from "dotenv"
import  BookingRouter from '../src/booking/booking.routes'



dotenv.config()

const app = express()
const PORT = process.env.PORT || 3003

app.use(express.json())

app.use("/", BookingRouter)




app.listen(PORT, () => {
    console.log(`booking service is working correctly on port ${PORT}!`);
});