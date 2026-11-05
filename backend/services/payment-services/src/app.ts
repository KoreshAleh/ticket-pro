import express from "express";
import dotenv from "dotenv"
import RouterPay from '../src/payment/payment.routes'
import { PaymentService } from "./payment/payment.service";



dotenv.config()

const app = express()
const PORT = process.env.PORT || 3004


app.use("/", RouterPay)




const start = async () => {
    await PaymentService.ensureBalanceTransactionSchema();
    app.listen(PORT, () => {
        console.log(`payment service is working correctly on port ${PORT}!`);
    });
};

void start().catch(error => {
    console.error("Failed to initialize payment service:", error);
    process.exitCode = 1;
});