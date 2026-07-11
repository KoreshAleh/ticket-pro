import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import pool from './db';

dotenv.config()


passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID as string,
        clientSecret: process.env.CLIENT_SECRET as string,
        callbackURL: "http://localhost/api/auth/google/callback"
    }, 
    async (accessToken, refreshToken, profile, done) => {
        try{
           const userEmail =  profile.emails?.[0]?.value
            const userName = profile.displayName
            const userAvatar = profile.photos?.[0]?.value;

            if(!userEmail){
                return done(new Error("Email not found in Google profile"), undefined);
            }

            const existUSer = await pool.query("SELECT *  from users WHERE email = $1" , [userEmail])
            const userDataExist = existUSer.rows[0]
            let  user;
            if(existUSer.rows.length == 0){
                const roleUser = "user"
                const createUSer = await pool.query('INSERT INTO users (username, email, role) VALUES ($1, $2, $3) RETURNING id, username, email, role', [userName, userEmail, roleUser])

                const userData = createUSer.rows[0]

                user = { id: userData.id, email: userData.email, username: userData.username, role: userData.role, avatar: userAvatar }
            }else{
                user = { id: userDataExist.id,  email: userDataExist.email, username: userDataExist.username, role: userDataExist.role,  avatar: userAvatar}
            }

            
            return done(null, user)
        }catch(err){
            return done(err, undefined)
        }
}))