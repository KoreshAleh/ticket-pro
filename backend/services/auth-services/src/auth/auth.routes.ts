import { Router } from "express";
import passport from "passport";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../authMiddleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Google OAuth
router.get("/google", passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get("/google/callback", passport.authenticate('google', { failureRedirect: '/login', session: false }), AuthController.googleCallback);

router.post("/logout", AuthController.logout);
router.get("/me", authMiddleware, AuthController.getMe);
router.put("/profile", authMiddleware, AuthController.updateProfile);
router.post("/session/activity", authMiddleware, (_req, res) => {
    return res.status(200).json({ success: true });
});
export default router;