import { prisma } from "@/lib/db";
import { completeGameSchema } from "@/lib/validation";
import { completeGame } from "@/server/game-service";
import { json, routeError } from "@/server/http";

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const input = completeGameSchema.parse(await request.json());
    const { gameId } = await context.params;
    const game = await completeGame(prisma, { ...input, gameId });
    return json({ game });
  } catch (error) {
    return routeError(error);
  }
}
