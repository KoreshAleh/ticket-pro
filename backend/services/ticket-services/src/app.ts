import express, { Request, Response } from "express";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()


const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET


app.get('/helth', (req: Request, res: Response) => {
    console.log("Ess ser!")
})

app.listen(PORT, () => {
    console.log("ticket services is working!")
})