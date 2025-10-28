import { LLMReranker } from "rerank";
import { ProviderHelicone } from "./helicone"

export type RerankInput = {id: string, content: string, filename: string | null, page: number | null, similarity: number};
export type RerankOutput = RerankInput & { rerank: number; originalRank: number };

export const rerank = async (searchResults: RerankInput[], userQuery: string): Promise<RerankOutput[]> => {
    //const provider = new ProviderOpenAI('gpt-4-turbo', process.env.OPENAI_API_KEY ?? 'api-key-not-found');
    const provider = new ProviderHelicone('gpt-4.1-nano', process.env.HELICONE_API_KEY ?? 'api-key-not-found');    // Use Helicone proxy
    const reranker = new LLMReranker(provider);
	const { result: orderedIds } = await reranker.rerank(searchResults, "id", "content", userQuery);

	const idToItem = new Map(searchResults.map(item => [item.id, item] as const));
	const idToOriginalRank = new Map(searchResults.map((item, index) => [item.id, index + 1] as const));
	const reordered: RerankOutput[] = [];
	
	for (const id of orderedIds) {
		const original = idToItem.get(id);
		const originalRank = idToOriginalRank.get(id);
		if (original && originalRank !== undefined) {
			reordered.push({ ...original, originalRank, rerank: reordered.length + 1 });
		}
	}

	return reordered;
} 