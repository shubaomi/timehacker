import { prisma } from "@/lib/db";
import { createPlayerSchema, updateNicknameSchema } from "@/lib/validation";
import { createOrResumePlayer, updateNickname } from "@/server/player-service";
import { json, routeError } from "@/server/http";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = createPlayerSchema.parse(await request.json());
    return json({ player: await createOrResumePlayer(prisma, input.playerId) });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const input = updateNicknameSchema.parse(await request.json());
    return json({ player: await updateNickname(prisma, input.playerId, input.nickname) });
  } catch (error) {
    return routeError(error);
  }
}
