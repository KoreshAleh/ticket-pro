import express from "express";
import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import authRoutes from "./auth/auth.routes";
import './config/passport'; 
import cookieParser from 'cookie-parser';



const app = express();
const PORT = process.env.PORT || 3001;

app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());

// Подключаем наш модуль авторизации
app.use("/", authRoutes); 

app.listen(PORT, () => {
    console.log(`Auth service is working correctly on port ${PORT}!`);
});