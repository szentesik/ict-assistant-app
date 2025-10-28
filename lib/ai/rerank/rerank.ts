import { LLMReranker } from "rerank";
import { ProviderHelicone } from "./helicone"

export const rerank = async (searchResults: {content: string}[], userQuery: string) => {
    //const provider = new ProviderOpenAI('gpt-4-turbo', process.env.OPENAI_API_KEY ?? 'api-key-not-found');
    const provider = new ProviderHelicone('gpt-4.1-nano', process.env.HELICONE_API_KEY ?? 'api-key-not-found');    //Use Helicone proxy
    const reranker = new LLMReranker(provider);
    return await reranker.rerank(searchResults, "content", "content", userQuery);
} 