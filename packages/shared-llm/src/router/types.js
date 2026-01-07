/**
 * LLM Router Types
 *
 * Type definitions for multi-provider LLM routing system
 */
/**
 * LLM Error
 */
export class LLMError extends Error {
    provider;
    model;
    code;
    statusCode;
    retryable;
    constructor(message, provider, model, code, statusCode, retryable = false) {
        super(message);
        this.provider = provider;
        this.model = model;
        this.code = code;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.name = "LLMError";
    }
}
//# sourceMappingURL=types.js.map