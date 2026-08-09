import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedCheatCatalog } from "../src/server/seed-service";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const database = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  }),
});

try {
  const count = await seedCheatCatalog(database);
  console.log(`Synchronized ${count} canonical Time Hacker levels.`);
} finally {
  await database.$disconnect();
}
