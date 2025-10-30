import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { embeddings } from '@/lib/db/schema/resources';
import { retryWithBackoff } from '@/lib/utils/retry';
import { rerank } from './rerank/rerank';

const embeddingModel = openai.embedding('text-embedding-3-small');

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter(i => i !== '');
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await retryWithBackoff(
    () => embedMany({
      model: embeddingModel,
      values: chunks,
    }),
    { maxRetries: 3, initialDelayMs: 2000 }
  );
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await retryWithBackoff(
    () => embed({
      model: embeddingModel,
      value: input,
    }),
    { maxRetries: 3, initialDelayMs: 2000 }
  );
  return embedding;
};

export type RelevantContent = {
  id: string;
  content: string;
  filename: string | null;
  page: number | null;
  similarity: number;
  originalRank?: number;
  rerank?: number;
};

export const findRelevantContent = async (userQuery: string): Promise<RelevantContent[] | string> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded,
  )})`;
  try {
    const similarGuides = await db
    .select({ 
      id: embeddings.id,
      content: embeddings.content, 
      filename: embeddings.filename, 
      page: embeddings.page, 
      similarity 
    })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(10);
  
    if (similarGuides.length === 0) {
      console.warn('findRelevantContent: empty result')
      return "No relevant information found in the knowledge base.";
    }

    console.log(`findRelevantContent: ${similarGuides.length} guides found`)
    if(similarGuides.length <= 4) {
      return similarGuides;
    }

    // rerank
    const rerankedGuides = await rerank(similarGuides, userQuery)
    return rerankedGuides.slice(0, 4);  // Return the best 4 results
  } catch (error) {
    console.error('findRelevantContent: Exception while accessing the database.', error)
    return "Knowledge base is temporarily not available.";
  }  
};