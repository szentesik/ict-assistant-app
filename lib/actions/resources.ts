'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
  embeddings,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbedding } from '@/lib/ai/embedding';

export const createResource = async (input: NewResourceParams, filename: string, page: number) => {
 
  const { content } = insertResourceSchema.parse(input);

  const [resource] = await db
    .insert(resources)
    .values({ content })
    .returning();

  const embeddingData = await generateEmbedding(content);

  await db.insert(embeddings).values(
    {
      resourceId: resource.id,
      filename,
      page,
      content,
      embedding: embeddingData,
    },
  );

  return 'Resource successfully created.';  
};