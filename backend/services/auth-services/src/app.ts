import express, { Request, Response } from "express"
import pool from "./db"
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import '../src/config/passport'
import passport from "passport"



dotenv.config()


const app = express()
app.use(passport.initialize())

app.use(express.json())

const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET as string 

interface SignUp {
    username: string,
    email: string,
    password: string
}

interface SignIn {
    email: string,
    password: string
}

// app.get('/helth', (req, res) => {
//     console.log('cheers!')
// })

app.post('/register', async (req: Request<{}, {}, SignUp>, res: Response) => {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields must be full" })
    }

    try {
        const userExists = await pool.query("SELECT * from users WHERE email = $1", [email])

        if (userExists.rows.length > 0) {
            return res.status(409).json({ success: false, message: "user with this email already exist" })
        }

        const hashPass = await bcrypt.hash(password, 10); // salt

        const userRole = 'user'

        const newUser = await pool.query('INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role', [username, email, hashPass, userRole]);

        const userData = newUser.rows[0]; 

        const token = jwt.sign(
            {
                id: userData.id,
                email: userData.email,
                role: userData.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        )
        return res.status(201).json({
            success: true,
            message: "user successfuly created!",
            token: token, 
            user: userData
        })
    } catch (err) {
        console.error("Error during registration", err)
        return res.status(500).json({ success: false, message: "Server error during registration" })
    }
})


app.post('/login', async (req: Request<{}, {}, SignIn>, res: Response) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "All fields must be full" })
    }

    try {
        const checkUser = await pool.query("SELECT *  from users WHERE email = $1", [email])


        if (checkUser.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Password or Email is invalid" });
        }

        const userData = checkUser.rows[0]
        const NewHashPass = await bcrypt.compare(password, userData.password_hash)

        if (!NewHashPass) {
            return res.status(401).json({ success: false, message: "Wrong password" })
        }



        const token = jwt.sign(
            {
                id: userData.id,
                email: userData.email,
                role: userData.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }

        )

        return res.status(200).json({
            success: true,
            message: `Welcome ${userData.username}`,
            token: token,
            user: {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role

            }
        })

    } catch (err) {
        console.error("Error login:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
})

app.get('/google', passport.authenticate('google', {scope: ['profile', 'email'], session: false} ))


app.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false}), (req: Request, res: Response) => {
    const user = req.user as any

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username
        }, 
        JWT_SECRET,
        {expiresIn: '24h'}
    )

    res.redirect(`http://localhost:5173/login?token=${token}&role=${user.role}`)
})






app.listen(PORT, () => {
    console.log("services auth is working correct!", PORT)
})