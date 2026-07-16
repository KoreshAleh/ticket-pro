import { StripePaymentDto } from "../dto/payment.dto";
import pool from "./config/db";
import { stripe } from "./config/stripe";



export class PaymentService {
    static async test() {
        const req = await pool.query("SELECT NOW()")

        const data = req.rows

        if (data) {
            throw new Error("DB_PIZDA");

        }
        return data
    }

    static async createSession(dto: StripePaymentDto) {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                customer_email: dto.userEmail,

                metadata: {
                    userId: String(dto.userId),
                    ticketId: String(dto.ticketId)
                },


                line_items: [
                    {
                        price_data: {
                            currency: dto.currency,
                            product_data: {
                                name: `Order №${dto.ticketId}`, // Пользователь увидит номер заказа на экране
                            },
                            unit_amount: dto.amount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: 'http://localhost:5173/cancel',
            })

            if (!session.url) {
                throw new Error("URL_NOT_FOUND");
            }

            return session.url;
        } catch (err: any) {
            console.error("Error in Stripe PaymentService:", err.message);
            throw new Error("ERORR_SPTRIPE_SERVICES");
        }


    }
}