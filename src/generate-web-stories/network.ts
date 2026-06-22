export const DEFAULT_NETWORK_TIMEOUT_MS = 30_000;
const RETRY_DELAYS_MS = [500, 1500] as const;

export async function fetchTextWithTimeout(url: string, accept: string, timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS): Promise<string> {
  return fetchWithTimeout(url, accept, timeoutMs, (response) => response.text());
}

export async function fetchJsonWithTimeout(url: string, accept: string, timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS): Promise<unknown> {
  return fetchWithTimeout(url, accept, timeoutMs, (response) => response.json());
}

export async function fetchBinaryWithTimeout(url: string, accept: string, timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS): Promise<Buffer> {
  return fetchWithTimeout(url, accept, timeoutMs, async (response) => Buffer.from(await response.arrayBuffer()));
}

async function fetchWithTimeout<T>(
  url: string,
  accept: string,
  timeoutMs: number,
  read: (response: Response) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt += 1) {
    try {
      return await fetchOnce(url, accept, timeoutMs, read);
    } catch (error) {
      lastError = error;
      if (attempt > RETRY_DELAYS_MS.length || !isRetryable(error)) {
        throw attempt > 1 ? retryError(url, attempt, error) : error;
      }
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 0);
    }
  }

  throw retryError(url, RETRY_DELAYS_MS.length + 1, lastError);
}

async function fetchOnce<T>(
  url: string,
  accept: string,
  timeoutMs: number,
  read: (response: Response) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`GET ${url} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetch(url, { headers: { accept }, signal: controller.signal });
    if (!response.ok) {
      throw new HttpStatusError(`GET ${url} failed with HTTP ${response.status}`, response.status);
    }
    return await read(response);
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      throw reason instanceof Error ? reason : new Error(`GET ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

class HttpStatusError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpStatusError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return error instanceof Error;
}

function retryError(url: string, attempts: number, error: unknown): Error {
  const reason = error instanceof Error ? error.message : String(error);
  return new Error(`GET ${url} failed after ${attempts} attempts: ${reason}`);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
