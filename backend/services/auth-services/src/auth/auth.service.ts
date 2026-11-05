import pool from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request } from "express";
import { UserEntity } from "./auth.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

const JWT_SECRET = process.env.JWT_SECRET as string;

export class AuthService {
    static async register(dto: RegisterDto, req: Request) {
        
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
        const token = await this.createSession(userData, req);
        return { token, user: userData };
    }

    static async login(dto: LoginDto, req: Request) {
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

        const token = await this.createSession(userData, req);
        return { token, user: { id: userData.id, username: userData.username, email: userData.email, role: userData.role } };
    }

    static async  me(tokenUser: number){
         const result = await pool.query(
            "SELECT id, username, email, balance, role FROM users WHERE id = $1",
            [tokenUser]
        );

        if (result.rows.length === 0) {
           throw new Error("USER_NOT_FOUND");
        }

        return result.rows[0]
    }

    static async updateProfile(userId: number, username: string) {
        const normalizedUsername = username.trim();
        if (!normalizedUsername || normalizedUsername.length > 100) {
            throw new Error("INVALID_USERNAME");
        }

        const result = await pool.query(
            `UPDATE users SET username = $1
             WHERE id = $2
             RETURNING id, username, email, balance, role`,
            [normalizedUsername, userId]
        );
        if (!result.rowCount) throw new Error("USER_NOT_FOUND");
        return result.rows[0];
    }

    static async revokeSession(token: string | undefined) {
        if (!token) return;
        let sessionId: number;
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
            if (!Number.isInteger(decoded.sid)) return;
            sessionId = decoded.sid;
        } catch {
            return;
        }
        await pool.query("DELETE FROM user_sessions WHERE id = $1", [sessionId]);
    }

    static generateToken(user: Partial<UserEntity> & { avatar?: string }, sessionId: number) {
        return jwt.sign(
            { id: user.id, username: user.username, email: user.email, balance: user.balance, role: user.role, avatar: user.avatar, sid: sessionId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    static createGoogleSession(user: Partial<UserEntity> & { avatar?: string }, req: Request) {
        return this.createSession(user, req);
    }

    private static async createSession(user: Partial<UserEntity> & { avatar?: string }, req: Request) {
        await pool.query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
        const refreshToken = crypto.randomBytes(32).toString("hex");
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const result = await pool.query<{ id: number }>(
            `INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, expires_at)
             VALUES ($1, $2, $3, $4, NOW() + INTERVAL '5 minutes')
             RETURNING id`,
            [
                user.id,
                refreshTokenHash,
                req.get("user-agent")?.slice(0, 255) || null,
                req.ip || null
            ]
        );
        const sessionId = result.rows[0]?.id;
        if (!sessionId) throw new Error("SESSION_CREATION_FAILED");
        return this.generateToken(user, sessionId);
    }
}