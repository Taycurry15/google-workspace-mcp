import { LLMOrchestratorRequest, LLMProvider, LLMProviderCapabilities, LLMProviderCost, LLMResponse } from "../types.js";
export declare class GeminiProvider implements LLMProvider {
    private readonly apiKey;
    readonly name: "gemini";
    readonly model: string;
    readonly cost: LLMProviderCost;
    readonly capabilities: LLMProviderCapabilities;
    private client;
    private modelInstance;
    constructor(apiKey?: string | undefined);
    isAvailable(): boolean;
    private getModel;
    generate(request: LLMOrchestratorRequest): Promise<LLMResponse>;
    private estimateCost;
}
//# sourceMappingURL=google.d.ts.map