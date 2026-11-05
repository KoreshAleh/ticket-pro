import React, { useEffect, useState, useCallback } from 'react';
import { AuthContext } from './auth-context';
import type { User } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const checkAuth = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await res.json();

            if (res.ok && data.success && data.user) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('isAuthenticated');
        }
    }, []);

    useEffect(() => {
        void checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!user) return;

        const idleTimeout = 5 * 60 * 1000;
        const heartbeatInterval = 60 * 1000;
        let lastActivity = Date.now();
        let lastHeartbeat = Date.now();
        let loggingOut = false;

        const recordActivity = () => {
            lastActivity = Date.now();
        };

        const heartbeat = async () => {
            const now = Date.now();
            if (now - lastActivity >= idleTimeout) {
                if (!loggingOut) {
                    loggingOut = true;
                    await logout();
                }
                return;
            }

            if (now - lastHeartbeat < heartbeatInterval) return;
            lastHeartbeat = now;
            try {
                const response = await fetch('/api/auth/session/activity', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (!response.ok && !loggingOut) {
                    loggingOut = true;
                    setUser(null);
                }
            } catch (err) {
                console.error('Session activity check failed:', err);
            }
        };

        const activityEvents: Array<keyof WindowEventMap> = [
            'pointerdown',
            'mousemove',
            'keydown',
            'touchstart',
            'scroll'
        ];
        activityEvents.forEach(event => window.addEventListener(event, recordActivity, { passive: true }));
        const interval = window.setInterval(() => void heartbeat(), 10 * 1000);

        return () => {
            activityEvents.forEach(event => window.removeEventListener(event, recordActivity));
            window.clearInterval(interval);
        };
    }, [user, logout]);

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser: checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};