import { LLMOrchestratorRequest, LLMProvider, LLMProviderCapabilities, LLMProviderCost, LLMResponse } from "../types.js";
export declare class AnthropicProvider implements LLMProvider {
    private readonly apiKey;
    readonly name: "anthropic";
    readonly model = "claude-3-5-sonnet-20241022";
    readonly cost: LLMProviderCost;
    readonly capabilities: LLMProviderCapabilities;
    private client;
    constructor(apiKey?: string | undefined);
    isAvailable(): boolean;
    private getClient;
    generate(request: LLMOrchestratorRequest): Promise<LLMResponse>;
    private estimateCost;
}
//# sourceMappingURL=anthropic.d.ts.map