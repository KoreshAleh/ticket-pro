import dotenv from "dotenv"
import {createClient }from "redis"


dotenv.config()


const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT  || 6379} ` 
})

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Successfully connected to Redis!'));

(async () => {
    await redisClient.connect()
})()

export default redisClient;