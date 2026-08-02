import { prisma } from "@/lib/db";
import { json, routeError } from "@/server/http";
import { getRankings } from "@/server/ranking-service";

export async function GET(): Promise<Response> {
  try {
    return json(await getRankings(prisma));
  } catch (error) {
    return routeError(error);
  }
}
