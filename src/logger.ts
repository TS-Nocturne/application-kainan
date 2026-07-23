function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`.trim();
  }
  return String(error);
}

export const logger = Object.freeze({
  info(message: string): void {
    console.info(`[INFO] ${message}`);
  },
  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  },
  error(message: string, error?: unknown): void {
    console.error(
      `[ERROR] ${message}${error === undefined ? '' : `\n${serializeError(error)}`}`,
    );
  },
});
