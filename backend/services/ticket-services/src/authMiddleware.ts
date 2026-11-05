import { NextFunction, Request, Response } from "express";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
        role: string;
    };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const cookie = req.headers.cookie;
    const authorization = req.headers.authorization;
    if (!cookie && !authorization) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    try {
        const headers = new Headers();
        if (cookie) headers.set("cookie", cookie);
        if (authorization) headers.set("authorization", authorization);
        const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL || "http://auth-service:3001"}/me`, { headers });

        if (authResponse.status === 401) {
            return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
        }
        if (!authResponse.ok) {
            console.error(`[Ticket Auth] Auth service returned ${authResponse.status}.`);
            return res.status(503).json({ success: false, message: "Authentication service unavailable." });
        }

        const result = await authResponse.json() as { success: boolean; user?: AuthenticatedRequest["user"] };
        if (!result.success || !result.user) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const refreshedCookie = authResponse.headers.get("set-cookie");
        if (refreshedCookie) res.setHeader("Set-Cookie", refreshedCookie);
        (req as AuthenticatedRequest).user = result.user;
        return next();
    } catch (error) {
        console.error("[Ticket Auth] Failed to validate session:", error);
        return res.status(503).json({ success: false, message: "Authentication service unavailable." });
    }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if ((req as AuthenticatedRequest).user?.role !== "admin") {
        return res.status(403).json({ success: false, message: "Administrator access required." });
    }
    return next();
};
