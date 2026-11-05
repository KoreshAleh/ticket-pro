
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "./config/db";

const JWT_SECRET = process.env.JWT_SECRET as string;


export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
        role: string;
    };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    let decoded: jwt.JwtPayload;
    try {
        decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch (err) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }

    if (!Number.isInteger(decoded.sid) || !Number.isInteger(decoded.id)) {
        return res.status(401).json({ success: false, message: "Unauthorized: Session expired" });
    }

    try {
        const session = await pool.query(
            `UPDATE user_sessions
             SET expires_at = NOW() + INTERVAL '5 minutes'
             WHERE id = $1 AND user_id = $2 AND expires_at > NOW()
             RETURNING id`,
            [decoded.sid, decoded.id]
        );
        if (!session.rowCount) {
            return res.status(401).json({ success: false, message: "Unauthorized: Session expired" });
        }

        req.user = decoded as AuthRequest["user"];
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 5 * 60 * 1000
        });
        return next();
    } catch (err) {
        console.error("[Auth] Failed to validate persistent session:", err);
        return res.status(503).json({ success: false, message: "Authentication service unavailable" });
    }
};