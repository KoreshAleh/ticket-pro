import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthRequest } from "../authMiddleware";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
    maxAge: 5 * 60 * 1000
};

export class AuthController {
    static async register(req: Request<{}, {}, RegisterDto>, res: Response) {
        try {
            const { token, user } = await AuthService.register(req.body, req);
            res.cookie("token", token, cookieOptions);

            return res.status(201).json({
                success: true,
                user
            });
        } catch (err: any) {
            if (err.message === "ALREADY_EXISTS") {
                return res.status(409).json({ success: false, message: "User with this email already exists" });
            }
            console.error("[Auth] Registration failed:", err.message);
            return res.status(500).json({ success: false, message: "Server error during registration" });
        }
    }

    static async login(req: Request<{}, {}, LoginDto>, res: Response) {
        try {
            const { token, user } = await AuthService.login(req.body, req);
            res.cookie("token", token, cookieOptions);

            return res.status(200).json({
                success: true,
                user
            });
        } catch (err: any) {
            if (err.message === "INVALID_CREDENTIALS") {
                return res.status(401).json({ success: false, message: "Password or Email is invalid" });
            }
            console.error("[Auth] Login failed:", err.message);
            return res.status(500).json({ success: false, message: "Server error during login" });
        }
    }

    
    static async logout(req: Request, res: Response) {
        await AuthService.revokeSession(req.cookies?.token);
        res.clearCookie('token');
        return res.status(200).json({ success: true, message: "Logged out successfully" });
    }

    static async googleCallback(req: Request, res: Response) {
        const user = req.user as any;
        const token = await AuthService.createGoogleSession(user, req);
        
        // Для OAuth закидываем токен в куку и редиректим без токена в URL
        res.cookie("token", token, cookieOptions);

        res.redirect(`http://localhost:5173/mainpage`);
    }

  static async getMe(req: Request, res: Response) {
     res.set("Cache-Control", "no-store");
     try {
        const tokenUser = (req as any).user;

        if (!tokenUser || !tokenUser.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

      const user = await AuthService.me(tokenUser.id)

     return res.status(200).json({
            success: true,
            user
        });
    } catch (err: any) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.error("Error in getMe:", err);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
  }

  static async updateProfile(req: Request<{}, {}, { username: string }>, res: Response) {
      const user = (req as AuthRequest).user;
      if (!user?.id || typeof req.body?.username !== "string") {
          return res.status(400).json({ success: false, message: "A valid username is required." });
      }

      try {
          const updatedUser = await AuthService.updateProfile(user.id, req.body.username);
          return res.status(200).json({ success: true, user: updatedUser });
      } catch (err: any) {
          if (err.message === "INVALID_USERNAME") {
              return res.status(400).json({ success: false, message: "Username must contain 1 to 100 characters." });
          }
          console.error("[Auth] Profile update failed:", err.message);
          return res.status(500).json({ success: false, message: "Could not update profile." });
      }
  }

}
