import pg from "pg"
import dotenv from "dotenv"


dotenv.config()


const { Pool } = pg;


const pool = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.HOST,
    port: Number(process.env.PORT_DB) || 5432, 
    database: process.env.POSTGRES_DB,
})

pool.query("SELECT NOW()", (err, res) => {
    if(err){
        console.error('Connection error to db postgreSQL: ', err.message)
    }else{
        console.log("Success connection to db!")
    }
})

export default pool
