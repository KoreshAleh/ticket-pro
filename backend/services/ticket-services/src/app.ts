import express, { Request, Response } from "express";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import pool from "./db";
import redisClient from "./redis";
import { decode } from "node:punycode";

dotenv.config()




const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET as string

interface JwtPayload {
    id: number;
    role: string;
    username: string;
    email: string;
}

app.get('/', async (req: Request, res: Response) => {

    try {
        const cacheKey = 'ticket:all'

        const redisGetTicket = await redisClient.get(cacheKey)


        if (redisGetTicket) {
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

    } catch (err) {
        console.log("tickets-services error: ", err);
        return res.json({ success: false, message: 'Internal Server Error' })
    }



})

app.get('/my', async (req: Request, res: Response) => {
    try {
    

        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1] // get token without Bearer



        if (!token) {
            return res.status(401).json({ error: 'Not found token' })
        }

        let userId: number;

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
            userId = decoded.id
        } catch (jwtErr) {
            return res.status(401).json({ error: 'Wrong or expired token' });
        }

        const userCacheKey = `user:${userId}:ticket`

        const getUserCacheKey = await redisClient.get(userCacheKey)

        if(getUserCacheKey){
            console.log(`User ${userId} tickets loaded from Redis!`)
            return res.json({
                success: true,
                fromCache: true,
                data: JSON.parse(getUserCacheKey)
            })
        }


        console.log(`User ${userId} tickets loaded from PostgreSQL DB!`);


        const myTickets = await pool.query(`SELECT 
        purchases.id AS id, 
        tickets.title, 
        tickets.event_date, 
        tickets.price, 
        tickets.description,
        purchases.purchase_date, 
        purchases.seat_number 
     FROM purchases 
     JOIN tickets ON purchases.ticket_id = tickets.id 
     WHERE purchases.user_id = $1`, [userId])




        const data = myTickets.rows

        await redisClient.setEx(userCacheKey, 300, JSON.stringify(data))

            return res.json({
            success: true,
            fromCache: false,
            data: data
        });

        
    } catch (err) {
        res.status(500).json({ error: "Server error during gets data" });
    }


})



// app.get('/helth', (req: Request, res: Response) => {
//     console.log("Ess ser!")
// })

app.listen(PORT, () => {
    console.log("ticket services is working!")
})