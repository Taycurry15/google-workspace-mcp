import { LLMOrchestratorRequest, LLMProvider, LLMResponse } from "../types.js";
export declare class LLMOrchestrator {
    private providers;
    constructor(providers?: LLMProvider[]);
    generate(request: LLMOrchestratorRequest): Promise<LLMResponse>;
    private rankProviders;
    private taskHeuristic;
    private estimateTokens;
}
//# sourceMappingURL=orchestrator.d.ts.map