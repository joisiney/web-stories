import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTextWithTimeout } from '../network.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('fetchTextWithTimeout retry behavior', () => {
  it('retenta falhas HTTP transitórias e retorna o corpo da primeira tentativa bem-sucedida', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('erro temporário', { status: 500 }))
      .mockResolvedValueOnce(new Response('<urlset />', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchTextWithTimeout('https://blog.example.com/post-sitemap.xml', 'application/xml', 1000))
      .resolves.toBe('<urlset />');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('não retenta erro HTTP definitivo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('não encontrado', { status: 404 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchTextWithTimeout('https://blog.example.com/ausente.xml', 'application/xml', 1000))
      .rejects.toThrow(/HTTP 404/i);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retenta timeouts e informa o total de tentativas no erro final', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(init.signal?.reason instanceof Error ? init.signal.reason : new Error('aborted'));
      }, { once: true });
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = expect(fetchTextWithTimeout('https://blog.example.com/lento.xml', 'application/xml', 1))
      .rejects.toThrow(/after 3 attempts.*timed out after 1ms/i);

    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(1);
    await result;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
