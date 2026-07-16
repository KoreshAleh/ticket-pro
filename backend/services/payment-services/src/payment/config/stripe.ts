import  Stripe  from "stripe"


const SECRET_KEY = process.env.STRIPE_SECRET_KEY as string

export const stripe: Stripe = new Stripe(SECRET_KEY, {
    apiVersion: '2026-06-24.dahlia',
})