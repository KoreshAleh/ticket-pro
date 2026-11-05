import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';


import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import pool from './db';



const googleClientId = process.env.CLIENT_ID;
const googleClientSecret = process.env.CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
passport.use(new GoogleStrategy({
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: "http://localhost/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const userEmail = profile.emails?.[0]?.value;
            const userName = profile.displayName;
            const userAvatar = profile.photos?.[0]?.value || '';

            if (!userEmail) {
                return done(new Error("Email not found in Google profile"), undefined);
            }

            const existUser = await pool.query("SELECT * from users WHERE email = $1", [userEmail]);
            const userDataExist = existUser.rows[0];
            let user;

            if (existUser.rows.length === 0) {
                const roleUser = "user";
                const createUser = await pool.query(
                    'INSERT INTO users (username, email, role) VALUES ($1, $2, $3) RETURNING id, username, email, role',
                    [userName, userEmail, roleUser]
                );

                const userData = createUser.rows[0];
                user = { id: userData.id, email: userData.email, username: userData.username, role: userData.role, avatar: userAvatar };
            } else {
                user = { id: userDataExist.id, email: userDataExist.email, username: userDataExist.username, role: userDataExist.role, avatar: userAvatar };
            }

            return done(null, user);
        } catch (err) {
            return done(err, undefined);
        }
    }
));
} else {
console.warn('[Google OAuth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured; Google login is disabled.');
}