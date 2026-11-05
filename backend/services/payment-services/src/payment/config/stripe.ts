import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();

export const stripe: Stripe | undefined = SECRET_KEY
    ? new Stripe(SECRET_KEY, {
        apiVersion: '2026-06-24.dahlia',
    })
    : undefined;

export const isStripeConfigured = Boolean(stripe);