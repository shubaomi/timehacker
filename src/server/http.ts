import { ZodError } from "zod";
import { AppError } from "./errors";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...init?.headers,
    },
  });
}

export function routeError(error: unknown): Response {
  if (error instanceof ZodError) {
    return json(
      {
        error: "The request contains invalid data.",
        code: "INVALID_REQUEST",
        fields: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  if (error instanceof AppError) {
    return json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("Unhandled route error", error instanceof Error ? error.message : "Unknown error");
  return json(
    { error: "The time lab could not complete that request.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
