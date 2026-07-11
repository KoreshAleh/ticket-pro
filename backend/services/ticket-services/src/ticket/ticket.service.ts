import pool from "../config/db";
import jwt from "jsonwebtoken"
import redisClient from "../config/redis";
import { TicketEntity } from "./entities/ticket.entity";
import { CategoryEntity } from "./entities/category.entity";
import { PurchasesEntity } from "./entities/purchase.entity";
import { JwtPayload } from "jsonwebtoken";
import { CityIntity } from "./entities/city.entity";

const JWT_SECRET = process.env.JWT_SECRET as string;

export class TicketService {
    static async Tickets() {
        const cacheKey = 'ticket:all'

        const redisGetTicket = await redisClient.get(cacheKey)

        if (redisGetTicket) {
            return { fromCache: true, data: JSON.parse(redisGetTicket) };
        }


        const getTickets = await pool.query<TicketEntity>(`
            SELECT tickets.id,
            title, description,
            price, total_seats,
            available_seats,
            event_date, 
            categories.name AS cat_name, 
            city.name AS city_name,
            created_at
            FROM tickets 
            JOIN city ON tickets.city_id = city.id
            JOIN categories ON tickets.category_id = categories.id 
            `)


        const allTickets = getTickets.rows


        await redisClient.setEx(cacheKey, 300, JSON.stringify(allTickets))

        return { fromCache: false, data: allTickets }




    }

    static async Category() {

        const cacheCategory = 'all:category'

        const getCacheCat = await redisClient.get(cacheCategory)

        if (getCacheCat) {
            return { fromChahe: true, data: JSON.parse(getCacheCat) }
        }


        const getCategory = await pool.query<CategoryEntity>('SELECT id, name FROM categories ORDER BY name ASC')


        const data = getCategory.rows


        await redisClient.setEx(cacheCategory, 300, JSON.stringify(data))

        return { fromCache: false, data: data }

    }


    static async MyTickets(token: string) {

        let userId: number;


        try {

            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
            userId = decoded.id;
        } catch (err) {
            throw new Error("UNAUTHORIZED");
        }


        const userCacheKey = `user:${userId}:ticket`

        const getUserCacheKey = await redisClient.get(userCacheKey)

        if (getUserCacheKey) {
            return { fromCache: true, data: JSON.parse(getUserCacheKey) }
        }

        const myTickets = await pool.query<PurchasesEntity>(`SELECT 
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

        return {fromCache: false, data: data}
    }

    static async getCity(){
        const cacheCity = "city:all"

        const getCacheCity = await redisClient.get(cacheCity)

        if(getCacheCity){
            return {fromCache: true, data: JSON.parse(getCacheCity)}
        }

        const city = await pool.query<CityIntity>('SELECT id, name FROM city')

        const data = city.rows

         await redisClient.setEx(cacheCity, 300, JSON.stringify(data))

         return {fromCache: false, data: data}
    }

}

