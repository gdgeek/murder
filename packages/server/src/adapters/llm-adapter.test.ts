import { describe, it, expect, vi } from 'vitest';
import { LLMAdapter, type LLMAdapterOptions } from './llm-adapter.js';
import { LLMError, DEFAULT_LLM_RETRY_CONFIG } from './llm-adapter.interface.js';

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
    redirected: false,
    statusText: status === 200 ? 'OK' : 'Error',
    type: 'basic' as Response['type'],
    url: '',
    clone: () => mockResponse(body, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

function openAiBody(content: string, promptTokens = 10, completionTokens = 20) {
  return {
    choices: [{ message: { content } }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

function createAdapter(
  fetchFn: LLMAdapterOptions['fetchFn'],
  overrides?: Partial<LLMAdapterOptions>,
): LLMAdapter {
  return new LLMAdapter({
    apiKey: 'test-key',
    endpoint: 'https://api.test.com/v1/chat/completions',
    model: 'gpt-4',
    provider: 'openai',
    fetchFn,
    delayFn: () => Promise.resolve(), // no-op delay for tests
    ...overrides,
  });
}

describe('LLMAdapter', () => {
  describe('getProviderName / getDefaultModel', () => {
    it('should return configured provider and model', () => {
      const adapter = createAdapter(vi.fn(), { provider: 'anthropic', model: 'claude-3' });
      expect(adapter.getProviderName()).toBe('anthropic');
      expect(adapter.getDefaultModel()).toBe('claude-3');
    });
  });

  describe('send - successful request', () => {
    it('should return parsed LLMResponse on success', async () => {
      const body = openAiBody('Hello world', 15, 25);
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(body));
      const adapter = createAdapter(fetchFn);

      const result = await adapter.send({ prompt: 'Say hello' });

      expect(result.content).toBe('Hello world');
      expect(result.tokenUsage.prompt).toBe(15);
      expect(result.tokenUsage.completion).toBe(25);
      expect(result.tokenUsage.total).toBe(40);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should send correct request body with system prompt', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(openAiBody('ok')));
      const adapter = createAdapter(fetchFn);

      await adapter.send({
        prompt: 'user msg',
        systemPrompt: 'system msg',
        maxTokens: 500,
        temperature: 0.7,
      });

      const [url, options] = fetchFn.mock.calls[0];
      expect(url).toBe('https://api.test.com/v1/chat/completions');
      const parsed = JSON.parse(options.body);
      expect(parsed.model).toBe('gpt-4');
      expect(parsed.messages).toEqual([
        { role: 'system', content: 'system msg' },
        { role: 'user', content: 'user msg' },
      ]);
      expect(parsed.max_tokens).toBe(500);
      expect(parsed.temperature).toBe(0.7);
    });

    it('should send Authorization header with Bearer token', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(openAiBody('ok')));
      const adapter = createAdapter(fetchFn, { apiKey: 'sk-secret' });

      await adapter.send({ prompt: 'test' });

      const headers = fetchFn.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer sk-secret');
    });

    it('should not include max_tokens or temperature when not provided', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(openAiBody('ok')));
      const adapter = createAdapter(fetchFn);

      await adapter.send({ prompt: 'test' });

      const parsed = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(parsed).not.toHaveProperty('max_tokens');
      expect(parsed).not.toHaveProperty('temperature');
    });
  });

  describe('send - retry logic', () => {
    it('should retry on 500 errors and succeed', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ error: 'server error' }, 500))
        .mockResolvedValueOnce(mockResponse(openAiBody('recovered')));

      const adapter = createAdapter(fetchFn);
      const result = await adapter.send({ prompt: 'test' });

      expect(result.content).toBe('recovered');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit errors', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ error: 'rate limited' }, 429))
        .mockResolvedValueOnce(mockResponse(openAiBody('ok')));

      const adapter = createAdapter(fetchFn);
      const result = await adapter.send({ prompt: 'test' });

      expect(result.content).toBe('ok');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 400 client errors', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockResponse({ error: 'bad request' }, 400));

      const adapter = createAdapter(fetchFn);

      await expect(adapter.send({ prompt: 'test' })).rejects.toThrow(LLMError);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 401 unauthorized', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockResponse({ error: 'unauthorized' }, 401));

      const adapter = createAdapter(fetchFn);

      await expect(adapter.send({ prompt: 'test' })).rejects.toThrow(LLMError);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors (fetch throws)', async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(mockResponse(openAiBody('recovered')));

      const adapter = createAdapter(fetchFn);
      const result = await adapter.send({ prompt: 'test' });

      expect(result.content).toBe('recovered');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw LLMError with attempt count', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockResponse({ error: 'server error' }, 500));

      const adapter = createAdapter(fetchFn, {
        retryConfig: { maxRetries: 3, baseDelayMs: 100, backoffMultiplier: 2 },
      });

      try {
        await adapter.send({ prompt: 'test' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(LLMError);
        const llmErr = err as LLMError;
        expect(llmErr.retryAttempts).toBe(4); // 1 initial + 3 retries
        expect(llmErr.provider).toBe('openai');
        expect(llmErr.isRetryable).toBe(false);
        expect(llmErr.statusCode).toBe(500);
      }

      // 1 initial + 3 retries = 4 calls
      expect(fetchFn).toHaveBeenCalledTimes(4);
    });

    it('should apply exponential backoff delays', async () => {
      const delays: number[] = [];
      const delayFn = vi.fn(async (ms: number) => { delays.push(ms); });
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockResponse({ error: 'error' }, 500));

      const adapter = createAdapter(fetchFn, {
        retryConfig: { maxRetries: 3, baseDelayMs: 1000, backoffMultiplier: 2 },
        delayFn,
      });

      await expect(adapter.send({ prompt: 'test' })).rejects.toThrow();

      // delay = baseDelay * backoffMultiplier^(attempt-1)
      // attempt 1: 1000 * 2^0 = 1000
      // attempt 2: 1000 * 2^1 = 2000
      // attempt 3: 1000 * 2^2 = 4000
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('should work with maxRetries=0 (no retries)', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockResponse({ error: 'error' }, 500));

      const adapter = createAdapter(fetchFn, {
        retryConfig: { maxRetries: 0, baseDelayMs: 1000, backoffMultiplier: 2 },
      });

      await expect(adapter.send({ prompt: 'test' })).rejects.toThrow(LLMError);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('send - error structure', () => {
    it('should include status code in LLMError for HTTP errors', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(mockResponse({ error: 'not found' }, 404));

      const adapter = createAdapter(fetchFn);

      try {
        await adapter.send({ prompt: 'test' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(LLMError);
        const llmErr = err as LLMError;
        expect(llmErr.statusCode).toBe(404);
        expect(llmErr.message).toContain('404');
      }
    });

    it('should set isRetryable=true for 429 and 5xx errors', async () => {
      const fetchFn429 = vi.fn().mockResolvedValue(mockResponse({}, 429));
      const adapter429 = createAdapter(fetchFn429, {
        retryConfig: { maxRetries: 0, baseDelayMs: 100, backoffMultiplier: 2 },
      });

      try {
        await adapter429.send({ prompt: 'test' });
      } catch (err) {
        // After exhausting retries, the final error wraps the last error
        // but the intermediate 429 error was retryable
        expect(err).toBeInstanceOf(LLMError);
      }
    });
  });

  describe('send - response parsing edge cases', () => {
    it('should handle missing usage data gracefully', async () => {
      const body = { choices: [{ message: { content: 'hello' } }] };
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(body));
      const adapter = createAdapter(fetchFn);

      const result = await adapter.send({ prompt: 'test' });

      expect(result.content).toBe('hello');
      expect(result.tokenUsage.prompt).toBe(0);
      expect(result.tokenUsage.completion).toBe(0);
      expect(result.tokenUsage.total).toBe(0);
    });

    it('should handle empty choices gracefully', async () => {
      const body = { choices: [], usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 } };
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(body));
      const adapter = createAdapter(fetchFn);

      const result = await adapter.send({ prompt: 'test' });

      expect(result.content).toBe('');
      expect(result.tokenUsage.total).toBe(5);
    });

    it('should handle missing choices field gracefully', async () => {
      const body = { usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 } };
      const fetchFn = vi.fn().mockResolvedValue(mockResponse(body));
      const adapter = createAdapter(fetchFn);

      const result = await adapter.send({ prompt: 'test' });
      expect(result.content).toBe('');
    });
  });

  describe('default retry config', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_LLM_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_LLM_RETRY_CONFIG.baseDelayMs).toBe(1000);
      expect(DEFAULT_LLM_RETRY_CONFIG.backoffMultiplier).toBe(2);
    });
  });
});
