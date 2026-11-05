import pool from "../config/db";
import redisClient from "../config/redis";
import { TicketEntity } from "./entities/ticket.entity";
import { CategoryEntity } from "./entities/category.entity";
import { PurchasesEntity } from "./entities/purchase.entity";
import { CityIntity } from "./entities/city.entity";
import crypto from "crypto";

interface EventInput {
    title?: string;
    description?: string;
    eventDate?: string;
    price?: number;
    categoryId?: number;
    cityId?: number;
}

const seatSectors = ["vip-1", "sec-a", "sec-b", "sec-c", "sec-d"];
const eventListCacheKey = "ticket:all:v5";
const eventListCacheVersionKey = "ticket:all:version:v1";
const eventListCacheTtlSeconds = 300;

export class TicketService {
    private static eventListLoads = new Map<string, Promise<TicketEntity[]>>();
    private static eventChangeListener: import("pg").PoolClient | null = null;
    private static eventChangeListenerRetry: NodeJS.Timeout | null = null;

    static async initialize() {
        await pool.query(`
            CREATE OR REPLACE FUNCTION ticketpro_notify_event_data_change()
            RETURNS trigger AS $$
            BEGIN
                PERFORM pg_notify('ticketpro_event_data_changed', TG_TABLE_NAME);
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql
        `);
        await pool.query(`
            DROP TRIGGER IF EXISTS ticketpro_events_changed ON tickets;
            CREATE TRIGGER ticketpro_events_changed
            AFTER INSERT OR UPDATE OR DELETE ON tickets
            FOR EACH STATEMENT EXECUTE FUNCTION ticketpro_notify_event_data_change()
        `);
        await pool.query(`
            DROP TRIGGER IF EXISTS ticketpro_seats_changed ON ticket_seats;
            CREATE TRIGGER ticketpro_seats_changed
            AFTER INSERT OR UPDATE OR DELETE ON ticket_seats
            FOR EACH STATEMENT EXECUTE FUNCTION ticketpro_notify_event_data_change()
        `);

        try {
            await this.connectEventChangeListener();
        } catch (error) {
            console.error("[Ticket] Could not start the database change listener; retrying:", error);
            this.scheduleEventChangeListenerRetry();
        }
    }

    private static async connectEventChangeListener() {
        if (this.eventChangeListener) return;

        const client = await pool.connect();
        try {
            await client.query("LISTEN ticketpro_event_data_changed");
        } catch (error) {
            client.release(true);
            throw error;
        }

        this.eventChangeListener = client;
        client.on("notification", message => {
            if (message.channel === "ticketpro_event_data_changed") {
                void this.invalidateEventListCache();
            }
        });
        client.on("error", error => {
            console.error("[Ticket] Database change listener connection failed:", error);
            this.reconnectEventChangeListener(client);
        });
        client.on("end", () => this.reconnectEventChangeListener(client));
    }

    private static reconnectEventChangeListener(client: import("pg").PoolClient) {
        if (this.eventChangeListener !== client) return;
        this.eventChangeListener = null;
        try {
            client.release(true);
        } catch (error) {
            console.error("[Ticket] Could not release the failed database listener:", error);
        }
        this.scheduleEventChangeListenerRetry();
    }

    private static scheduleEventChangeListenerRetry() {
        if (this.eventChangeListenerRetry) return;
        this.eventChangeListenerRetry = setTimeout(() => {
            this.eventChangeListenerRetry = null;
            void this.connectEventChangeListener().catch(error => {
                console.error("[Ticket] Could not reconnect the database change listener:", error);
                this.scheduleEventChangeListenerRetry();
            });
        }, 5000);
    }

    static async Tickets() {
        let cacheVersion: string | null = null;
        try {
            cacheVersion = (await redisClient.get(eventListCacheVersionKey)) || "0";
            const cachedEvents = await redisClient.get(`${eventListCacheKey}:${cacheVersion}`);
            if (cachedEvents) {
                const events: unknown = JSON.parse(cachedEvents);
                if (Array.isArray(events)) return events as TicketEntity[];
                console.error("[Ticket] Event cache contained an invalid payload; reloading from database.");
                await redisClient.del(`${eventListCacheKey}:${cacheVersion}`);
            }
        } catch (error) {
            cacheVersion = null;
            console.error("[Ticket] Could not read the event cache; loading from database:", error);
        }

        const loadKey = cacheVersion ?? "redis-unavailable";
        let eventListLoad = this.eventListLoads.get(loadKey);
        if (!eventListLoad) {
            eventListLoad = this.loadEventsFromDatabase(cacheVersion);
            this.eventListLoads.set(loadKey, eventListLoad);
        }
        try {
            return await eventListLoad;
        } finally {
            if (this.eventListLoads.get(loadKey) === eventListLoad) this.eventListLoads.delete(loadKey);
        }
    }

    private static async loadEventsFromDatabase(cacheVersion: string | null): Promise<TicketEntity[]> {
        const getTickets = await pool.query<TicketEntity>(`
            SELECT tickets.id,
            title, description,
            CASE WHEN seat_counts.total_seats > 0 THEN seat_counts.total_seats ELSE tickets.total_seats END AS total_seats,
            COALESCE(seat_counts.available_seats, tickets.available_seats) AS available_seats,
            COALESCE(seat_counts.sold_seats, 0) AS sold_seats,
            event_date, 
            price,
            tickets.category_id,
            tickets.city_id,
            categories.name AS cat_name, 
            city.name AS city_name,
            created_at
            FROM tickets 
            JOIN city ON tickets.city_id = city.id
            JOIN categories ON tickets.category_id = categories.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS total_seats,
                       COUNT(*) FILTER (WHERE status = 'available')::int AS available_seats,
                       COUNT(*) FILTER (WHERE status = 'sold')::int AS sold_seats
                FROM ticket_seats
                WHERE ticket_id = tickets.id
            ) seat_counts ON TRUE
            `)

        const allTickets = getTickets.rows;
        if (cacheVersion !== null) {
            try {
                const currentCacheVersion = (await redisClient.get(eventListCacheVersionKey)) || "0";
                if (currentCacheVersion === cacheVersion) {
                    await redisClient.setEx(`${eventListCacheKey}:${cacheVersion}`, eventListCacheTtlSeconds, JSON.stringify(allTickets));
                }
            } catch (error) {
                console.error("[Ticket] Could not populate the event cache:", error);
            }
        }

        return allTickets;
    }

    static async Category() {

        const cacheCategory = 'all:category'

        const getCacheCat = await redisClient.get(cacheCategory)

        if (getCacheCat) {
            return { fromChahe: true, data: JSON.parse(getCacheCat) }
        }


        const getCategory = await pool.query<CategoryEntity>('SELECT id, name FROM categories ORDER BY name ASC')


        const data = getCategory.rows


        await redisClient.setEx(cacheCategory, 300, JSON.stringify(data))

        return { fromCache: false, data: data }

    }


    static async MyTickets(userId: number) {
        try {
            const myTickets = await pool.query<PurchasesEntity>(`
                        SELECT 
                    p.id AS id, 
                    p.purchase_date,
                    t.title, 
                    t.event_date,
                    ts.qr_code,
                    ts.price, 
                    t.description,
                    ts.sector_id,
                    ts.row_number,
                    ts.seat_number
                FROM purchases p
                JOIN ticket_seats ts ON p.ticket_seat_id = ts.id
                JOIN tickets t ON ts.ticket_id = t.id
                WHERE p.user_id = $1
                ORDER BY p.purchase_date DESC
        `, [userId]);

        const data = myTickets.rows;
        return { fromCache: false, data: data };

        } catch (dbOrRedisErr: any) {
            // Логируем НАСТОЯЩУЮ ошибку базы или Редиса!
            console.error("Error in DB/Redis inside MyTickets:", dbOrRedisErr);
            throw new Error("DATABASE_ERROR");
        }
    }

    static async getCity() {
        const cacheCity = "city:all"

        const getCacheCity = await redisClient.get(cacheCity)

        if (getCacheCity) {
            return { fromCache: true, data: JSON.parse(getCacheCity) }
        }

        const city = await pool.query<CityIntity>('SELECT id, name FROM city')

        const data = city.rows

        await redisClient.setEx(cacheCity, 300, JSON.stringify(data))

        return { fromCache: false, data: data }
    }

    static async verifyQrToken(token: string) {
        if (!/^[a-f0-9]{64}$/i.test(token)) return null;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const result = await pool.query(
            `SELECT t.title, t.event_date, ts.sector_id, ts.row_number, ts.seat_number
             FROM ticket_seats ts
             JOIN purchases p ON p.ticket_seat_id = ts.id AND p.user_id = ts.user_id
             JOIN tickets t ON t.id = ts.ticket_id
             WHERE ts.qr_token_hash = $1 AND ts.status = 'sold'
             LIMIT 1`,
            [tokenHash]
        );
        return result.rows[0] || null;
    }

    static async createEvent(input: EventInput) {
        const event = this.validateEventInput(input);
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await this.assertEventReferences(client, event.categoryId, event.cityId);
            const inserted = await client.query<{ id: number }>(
                `INSERT INTO tickets (title, description, total_seats, available_seats, event_date, price, category_id, city_id)
                 VALUES ($1, $2, $3, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [event.title, event.description || null, seatSectors.length * 10 * 16, event.eventDate, event.price, event.categoryId, event.cityId]
            );
            const ticketId = inserted.rows[0]?.id;
            if (!ticketId) throw new Error("EVENT_CREATE_FAILED");

            const seatValues: Array<number | string> = [];
            const placeholders: string[] = [];
            seatSectors.forEach(sector => {
                for (let row = 1; row <= 10; row++) {
                    for (let seat = 1; seat <= 16; seat++) {
                        const base = seatValues.length;
                        seatValues.push(ticketId, sector, row, seat, event.price);
                        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
                    }
                }
            });
            await client.query(
                `INSERT INTO ticket_seats (ticket_id, sector_id, row_number, seat_number, price)
                 VALUES ${placeholders.join(", ")}`,
                seatValues
            );
            await client.query("COMMIT");
            await this.invalidateEventListCache();
            return { id: ticketId, total_seats: seatValues.length / 5 };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async updateEvent(ticketId: number, input: EventInput) {
        const event = this.validateEventInput(input);
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await this.assertEventReferences(client, event.categoryId, event.cityId);
            const updated = await client.query(
                `UPDATE tickets
                 SET title = $1, description = $2, event_date = $3, price = $4, category_id = $5, city_id = $6
                 WHERE id = $7 RETURNING id`,
                [event.title, event.description || null, event.eventDate, event.price, event.categoryId, event.cityId, ticketId]
            );
            if (!updated.rowCount) throw new Error("EVENT_NOT_FOUND");
            await client.query(
                `UPDATE ticket_seats SET price = $1 WHERE ticket_id = $2 AND status = 'available'`,
                [event.price, ticketId]
            );
            await client.query("COMMIT");
            await this.invalidateEventListCache();
            return { id: ticketId };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async deleteEvent(ticketId: number) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const event = await client.query(`SELECT id FROM tickets WHERE id = $1 FOR UPDATE`, [ticketId]);
            if (!event.rowCount) throw new Error("EVENT_NOT_FOUND");
            const purchases = await client.query(
                `SELECT 1 FROM purchases p
                 JOIN ticket_seats ts ON ts.id = p.ticket_seat_id
                 WHERE ts.ticket_id = $1 LIMIT 1`,
                [ticketId]
            );
            if (purchases.rowCount) throw new Error("EVENT_HAS_PURCHASES");
            const holds = await client.query(
                `SELECT 1 FROM ticket_seats WHERE ticket_id = $1 AND status = 'selected' LIMIT 1`,
                [ticketId]
            );
            if (holds.rowCount) throw new Error("EVENT_HAS_ACTIVE_HOLDS");
            await client.query("DELETE FROM ticket_seats WHERE ticket_id = $1", [ticketId]);
            await client.query("DELETE FROM tickets WHERE id = $1", [ticketId]);
            await client.query("COMMIT");
            await this.invalidateEventListCache();
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    private static validateEventInput(input: EventInput) {
        const title = typeof input?.title === "string" ? input.title.trim() : "";
        const description = typeof input?.description === "string" ? input.description.trim() : "";
        const price = Number(input?.price);
        const categoryId = Number(input?.categoryId);
        const cityId = Number(input?.cityId);
        const eventDateValue = input?.eventDate;
        const eventDate = new Date(eventDateValue || "");
        if (!title || title.length > 255 || description.length > 10000 ||
            !Number.isFinite(price) || price < 0 || price > 999999.99 ||
            !Number.isInteger(categoryId) || categoryId <= 0 ||
            !Number.isInteger(cityId) || cityId <= 0 ||
            !eventDateValue || Number.isNaN(eventDate.getTime()) || eventDate <= new Date()) {
            throw new Error("INVALID_EVENT_INPUT");
        }
        return { title, description, price, categoryId, cityId, eventDate };
    }

    private static async assertEventReferences(client: import("pg").PoolClient, categoryId: number, cityId: number) {
        const [category, city] = await Promise.all([
            client.query(`SELECT 1 FROM categories WHERE id = $1`, [categoryId]),
            client.query(`SELECT 1 FROM city WHERE id = $1`, [cityId])
        ]);
        if (!category.rowCount || !city.rowCount) throw new Error("INVALID_EVENT_INPUT");
    }

    private static async invalidateEventListCache() {
        try {
            await redisClient.incr(eventListCacheVersionKey);
        } catch (error) {
            console.error("[Ticket] Event data changed, but its cache could not be invalidated:", error);
        }
    }

}
