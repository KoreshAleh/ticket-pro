import express from "express";
import dotenv from "dotenv"
import RouterPay from '../src/payment/payment.routes'



dotenv.config()

const app = express()
const PORT = process.env.PORT || 3003

app.use(express.json())

app.use("/", RouterPay)




app.listen(PORT, () => {
    console.log(`booking service is working correctly on port ${PORT}!`);
});