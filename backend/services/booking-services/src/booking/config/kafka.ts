import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "booking-service",
    brokers: [process.env.KAFKA_BROKER || 'kafka:29092'],
})

export const kafkaConsumer = kafka.consumer({ groupId: 'booking-service-group' })
// razdelenije jeslii jest kopiii s talim ze group 
// jesli pojawitsia nowyj service 
// zapominajet gde ostanowilsia 