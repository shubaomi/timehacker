import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedCheatCatalog } from "../src/server/seed-service";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const database = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

try {
  const count = await seedCheatCatalog(database);
  console.log(`Seeded ${count} canonical Time Hacker cheats.`);
} finally {
  await database.$disconnect();
}
