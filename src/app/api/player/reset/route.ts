import { prisma } from "@/lib/db";
import { resetPlayerSchema } from "@/lib/validation";
import { json, routeError } from "@/server/http";
import { resetPlayer } from "@/server/player-service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = resetPlayerSchema.parse(await request.json());
    return json(await resetPlayer(prisma, input.playerId, input.analyticsBrowserId));
  } catch (error) {
    return routeError(error);
  }
}
