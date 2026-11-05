import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "payment-services",
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
})

export const kafkaProducer = kafka.producer()