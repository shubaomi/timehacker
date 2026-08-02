import { prisma } from "@/lib/db";
import { startGameSchema } from "@/lib/validation";
import { startGame } from "@/server/game-service";
import { json, routeError } from "@/server/http";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = startGameSchema.parse(await request.json());
    const game = await startGame(prisma, input);
    return json({ game }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
