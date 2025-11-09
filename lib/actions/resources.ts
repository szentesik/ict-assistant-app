'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
  embeddings,
  feedback,
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

export const submitFeedback = async (
  sessionId: string,
  question: string,
  answer: string,
  isPositive: boolean
) => {
  try {
    await db.insert(feedback).values({
      sessionId,
      question,
      answer,
      isPositive: isPositive ? 1 : 0,
    });

    return { success: true, message: 'Feedback submitted successfully' };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return { success: false, message: 'Failed to submit feedback' };
  }
};