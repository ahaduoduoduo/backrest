const transientBrowserMessages = [
  "load failed",
  "failed to fetch",
  "networkerror",
  "network request failed",
];

export function isTransientBrowserRequestError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return transientBrowserMessages.some((candidate) => message.includes(candidate));
}

export async function retryTransientBrowserAction<T>(
  action: () => Promise<T>,
  delayMs = 250,
): Promise<T> {
  try {
    return await action();
  } catch (error: unknown) {
    if (!isTransientBrowserRequestError(error)) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    return action();
  }
}
