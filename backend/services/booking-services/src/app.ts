import express from "express";
import dotenv from "dotenv"
import  BookingRouter from '../src/booking/booking.routes'
import { BookingService } from "./booking/booking.service";



dotenv.config()

const app = express()
const PORT = process.env.PORT || 3003

app.use(express.json())

app.use("/", BookingRouter)

const startKafkaConsumer = async () => {
    while (true) {
        try {
            await BookingService.SuccessConsumer();
            return;
        } catch (err) {
            console.error("Failed to start Kafka Consumer. Retrying in 5 seconds:", err);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};


const start = async () => {
    await BookingService.initialize();
    app.listen(PORT, () => {
        console.log(`booking service is working correctly on port ${PORT}!`);
        void startKafkaConsumer();
    });
};

void start().catch(error => {
    console.error("Failed to initialize booking service:", error);
    process.exitCode = 1;
});