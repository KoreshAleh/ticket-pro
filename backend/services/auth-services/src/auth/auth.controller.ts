import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

export class AuthController {
    static async register(req: Request<{}, {}, RegisterDto>, res: Response) {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields must be full" });
        }

        try {
            const result = await AuthService.register(req.body);
            return res.status(201).json({ success: true, message: "user successfuly created!", ...result });
        } catch (err: any) {
            if (err.message === "ALREADY_EXISTS") {
                return res.status(409).json({ success: false, message: "user with this email already exist" });
            }
            return res.status(500).json({ success: false, message: "Server error during registration" });
        }
    }

    static async login(req: Request<{}, {}, LoginDto>, res: Response) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields must be full" });
        }

        try {
            const result = await AuthService.login(req.body);
            return res.status(200).json({ success: true, message: `Welcome ${result.user.username}`, ...result });
        } catch (err: any) {
            if (err.message === "INVALID_CREDENTIALS") {
                return res.status(401).json({ success: false, message: "Password or Email is invalid" });
            }
            return res.status(500).json({ success: false, message: "Server error" });
        }
    }

    static async googleCallback(req: Request, res: Response) {
        const user = req.user as any;
        const token = AuthService.generateToken(user);
        res.redirect(`http://localhost:5173/mainpage?token=${token}&role=${user.role}`);
    }
}