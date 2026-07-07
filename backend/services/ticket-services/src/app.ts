import express, { Request, Response } from "express";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import pool from "./db";
import redisClient from "./redis";

dotenv.config()




const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET



app.get('/', async(req: Request, res: Response) => {

    try{
        const cacheKey = 'ticket:all'

        const redisGetTicket = await redisClient.get(cacheKey)


        if(redisGetTicket){
            console.log("Cached from redis!")
            return res.json({
                success: true,
                fromCache: true,
                data: JSON.parse(redisGetTicket)
            })
        }


        console.log("Cached from DB postgres!")

        const getTickets = await pool.query('SELECT * FROM tickets')

        const allTickets = getTickets.rows

        await redisClient.setEx(cacheKey, 60, JSON.stringify(allTickets))

        return res.json({
            success: true,
            fromCache: false,
            data: allTickets
        })
    
    }catch(err){
        console.log("tickets-services error: ", err);
        return res.json({ success: false, message: 'Internal Server Error'})
    }
    

    
})




// app.get('/helth', (req: Request, res: Response) => {
//     console.log("Ess ser!")
// })

app.listen(PORT, () => {
    console.log("ticket services is working!")
})