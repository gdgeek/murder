import type { LLMRequest, LLMResponse } from '@murder-mystery/shared';
import {
  type ILLMAdapter,
  type LLMRetryConfig,
  DEFAULT_LLM_RETRY_CONFIG,
  LLMError,
} from './llm-adapter.interface.js';

export interface LLMAdapterOptions {
  apiKey: string;
  endpoint: string;
  model: string;
  provider: string;
  retryConfig?: LLMRetryConfig;
  /** Injected fetch for testing; defaults to global fetch */
  fetchFn?: typeof fetch;
  /** Injected delay for testing; defaults to setTimeout-based promise */
  delayFn?: (ms: number) => Promise<void>;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOptionsFromEnv(): LLMAdapterOptions {
  const apiKey = process.env['LLM_API_KEY'] ?? '';
  const endpoint =
    process.env['LLM_ENDPOINT'] ?? 'https://api.openai.com/v1/chat/completions';
  const model = process.env['LLM_MODEL'] ?? 'gpt-4';
  const provider = process.env['LLM_PROVIDER'] ?? 'openai';
  const maxRetries = parseInt(process.env['LLM_MAX_RETRIES'] ?? '3', 10);

  return {
    apiKey,
    endpoint,
    model,
    provider,
    retryConfig: {
      ...DEFAULT_LLM_RETRY_CONFIG,
      maxRetries: Number.isNaN(maxRetries) ? 3 : maxRetries,
    },
  };
}

export class LLMAdapter implements ILLMAdapter {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly provider: string;
  private readonly retryConfig: LLMRetryConfig;
  private readonly fetchFn: typeof fetch;
  private readonly delayFn: (ms: number) => Promise<void>;

  constructor(options?: LLMAdapterOptions) {
    const opts = options ?? buildOptionsFromEnv();
    this.apiKey = opts.apiKey;
    this.endpoint = opts.endpoint;
    this.model = opts.model;
    this.provider = opts.provider;
    this.retryConfig = opts.retryConfig ?? DEFAULT_LLM_RETRY_CONFIG;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.delayFn = opts.delayFn ?? defaultDelay;
  }

  getProviderName(): string {
    return this.provider;
  }

  getDefaultModel(): string {
    return this.model;
  }

  async send(request: LLMRequest): Promise<LLMResponse> {
    const { maxRetries, baseDelayMs, backoffMultiplier } = this.retryConfig;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        await this.delayFn(delay);
      }

      const startTime = Date.now();

      try {
        const response = await this.callApi(request);
        const elapsed = Date.now() - startTime;
        return this.parseResponse(response, elapsed);
      } catch (err) {
        lastError = err;

        // Don't retry on non-retryable errors (4xx except 429)
        if (err instanceof LLMError && !err.isRetryable) {
          throw err;
        }

        // If this was the last attempt, break to throw
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    // All retries exhausted
    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    const statusCode =
      lastError instanceof LLMError ? lastError.statusCode : undefined;

    throw new LLMError(
      `LLM request failed after ${maxRetries + 1} attempts: ${message}`,
      statusCode,
      maxRetries + 1,
      this.provider,
      false,
    );
  }

  private async callApi(request: LLMRequest): Promise<Response> {
    const messages: { role: string; content: string }[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
    };

    if (request.maxTokens !== undefined) {
      body['max_tokens'] = request.maxTokens;
    }
    if (request.temperature !== undefined) {
      body['temperature'] = request.temperature;
    }

    const response = await this.fetchFn(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const statusCode = response.status;
      const isRetryable = statusCode === 429 || statusCode >= 500;
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // ignore read errors
      }
      throw new LLMError(
        `API returned ${statusCode}: ${errorBody}`,
        statusCode,
        0,
        this.provider,
        isRetryable,
      );
    }

    return response;
  }

  private async parseResponse(
    response: Response,
    responseTimeMs: number,
  ): Promise<LLMResponse> {
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    const totalTokens = data.usage?.total_tokens ?? 0;

    return {
      content,
      tokenUsage: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
      },
      responseTimeMs,
    };
  }
}
