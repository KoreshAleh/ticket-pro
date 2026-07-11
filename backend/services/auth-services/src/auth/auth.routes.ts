import { Router } from "express";
import passport from "passport";
import { AuthController } from "./auth.controller";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Google OAuth
router.get("/google", passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get("/google/callback", passport.authenticate('google', { failureRedirect: '/login', session: false }), AuthController.googleCallback);

export default router;