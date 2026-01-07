import { LLMOrchestratorRequest, LLMProvider, LLMProviderCapabilities, LLMProviderCost, LLMResponse } from "../types.js";
export declare class OpenAIProvider implements LLMProvider {
    private readonly apiKey;
    readonly name: "openai";
    readonly model: string;
    readonly cost: LLMProviderCost;
    readonly capabilities: LLMProviderCapabilities;
    private client;
    constructor(apiKey?: string | undefined);
    isAvailable(): boolean;
    private getClient;
    generate(request: LLMOrchestratorRequest): Promise<LLMResponse>;
    private estimateCost;
}
//# sourceMappingURL=openai.d.ts.map