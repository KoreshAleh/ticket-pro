import pool from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserEntity } from "./auth.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

const JWT_SECRET = process.env.JWT_SECRET as string;

export class AuthService {
    static async register(dto: RegisterDto) {
        // Проверка существования
        const userExists = await pool.query<UserEntity>("SELECT * from users WHERE email = $1", [dto.email]);
        if (userExists.rows.length > 0) {
            throw new Error("ALREADY_EXISTS");
        }

        const hashPass = await bcrypt.hash(dto.password, 10);
        const userRole = 'user';

        const newUser = await pool.query<UserEntity>(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [dto.username, dto.email, hashPass, userRole]
        );

        const userData = newUser.rows[0];

        if(!userData){
            throw new Error("USER_CREATION_FAILED")
        }
        const token = this.generateToken(userData);

        return { token, user: userData };
    }

    static async login(dto: LoginDto) {
        const checkUser = await pool.query<UserEntity>("SELECT * from users WHERE email = $1", [dto.email]);
        if (checkUser.rows.length === 0) {
            throw new Error("INVALID_CREDENTIALS");
        }

        const userData = checkUser.rows[0];
        
        if(!userData){
            throw new Error("USER_CREATION_FAILED")
        }

        if (!userData.password_hash) {
            throw new Error("INVALID_CREDENTIALS");
        }

        const isMatch = await bcrypt.compare(dto.password, userData.password_hash);
        if (!isMatch) {
            throw new Error("INVALID_CREDENTIALS");
        }

        const token = this.generateToken(userData);
        return { token, user: { id: userData.id, username: userData.username, email: userData.email, role: userData.role } };
    }

    static generateToken(user: Partial<UserEntity> & { avatar?: string }) {
        return jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
    }
}