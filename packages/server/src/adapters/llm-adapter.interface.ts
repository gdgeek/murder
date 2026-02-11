import type { LLMRequest, LLMResponse } from '@murder-mystery/shared';

export interface ILLMAdapter {
  send(request: LLMRequest): Promise<LLMResponse>;
  getProviderName(): string;
  getDefaultModel(): string;
}

export interface LLMRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_LLM_RETRY_CONFIG: LLMRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
};

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | undefined,
    public readonly retryAttempts: number,
    public readonly provider: string,
    public readonly isRetryable: boolean,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
