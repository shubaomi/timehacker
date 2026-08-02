import { prisma } from "@/lib/db";
import { playerIdSchema } from "@/lib/validation";
import { json, routeError } from "@/server/http";
import { getDashboard } from "@/server/player-service";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const playerId = playerIdSchema.parse(url.searchParams.get("playerId"));
    const parsedDifficulty = Number(url.searchParams.get("difficulty") ?? "1");
    const difficulty = Number.isInteger(parsedDifficulty) ? parsedDifficulty : 1;
    return json(await getDashboard(prisma, playerId, difficulty));
  } catch (error) {
    return routeError(error);
  }
}
