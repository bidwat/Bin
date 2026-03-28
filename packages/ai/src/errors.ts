export class AiError extends Error {
  code: 'CONFIG' | 'OPENAI' | 'VALIDATION' | 'RATE_LIMIT';
  cause?: unknown;
  retriable: boolean;

  constructor(
    message: string,
    options: {
      code: AiError['code'];
      cause?: unknown;
      retriable?: boolean;
    },
  ) {
    super(message);
    this.name = 'AiError';
    this.code = options.code;
    this.cause = options.cause;
    this.retriable = options.retriable ?? false;
  }
}
