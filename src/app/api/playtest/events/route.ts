import { playtestEventBatchSchema, deletePlaytestEventsSchema } from "@/analytics/playtest-contract";
import { prisma } from "@/lib/db";
import { json, routeError } from "@/server/http";
import { deleteBrowserPlaytestEvents, recordPlaytestEvents } from "@/server/playtest-service";
import { AppError } from "@/server/errors";

const MAX_EVENT_BODY_BYTES = 32 * 1_024;

function requestHost(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwardedHost || request.headers.get("host") || new URL(request.url).host;
}

async function readSafeEventBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_EVENT_BODY_BYTES) {
    throw new AppError("Event batch is too large.", 413, "EVENT_BATCH_TOO_LARGE");
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AppError("Cross-origin event writes are not accepted.", 403, "EVENT_ORIGIN_REJECTED");
  }
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError("Cross-origin event writes are not accepted.", 403, "EVENT_ORIGIN_REJECTED");
    }
    if (originHost !== requestHost(request)) {
      throw new AppError("Cross-origin event writes are not accepted.", 403, "EVENT_ORIGIN_REJECTED");
    }
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_EVENT_BODY_BYTES) {
    throw new AppError("Event batch is too large.", 413, "EVENT_BATCH_TOO_LARGE");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("The request contains invalid data.", 400, "INVALID_REQUEST");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = playtestEventBatchSchema.parse(await readSafeEventBody(request));
    return json(await recordPlaytestEvents(prisma, input), { status: 202 });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const input = deletePlaytestEventsSchema.parse(await readSafeEventBody(request));
    return json({ deleted: await deleteBrowserPlaytestEvents(prisma, input.browserId) });
  } catch (error) {
    return routeError(error);
  }
}
