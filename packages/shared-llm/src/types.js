export class MissingProviderKeyError extends Error {
    constructor(provider) {
        super(`Missing API key for ${provider}. Please add it to your environment before using this provider.`);
    }
}
//# sourceMappingURL=types.js.map