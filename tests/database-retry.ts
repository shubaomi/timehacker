const TRANSIENT_CONNECTION_MESSAGES = [
  "server has closed the connection",
  "connection terminated",
  "connection reset",
  "connection refused",
  "can't reach database server",
];

export async function retryTransientDatabaseOperation<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const transient = TRANSIENT_CONNECTION_MESSAGES.some((fragment) => message.includes(fragment));
      if (!transient || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}
