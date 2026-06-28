import { createClient } from "redis";


const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.log("Redis error:", err));
redisClient.on("connect", () => console.log("Redis connected"));

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
module.exports = { redisClient, connectRedis };