export const DEFAULT_NETWORK_TIMEOUT_MS = 30_000;

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
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`GET ${url} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetch(url, { headers: { accept }, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`GET ${url} failed with HTTP ${response.status}`);
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
