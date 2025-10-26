import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5'),
    //model: openai('gpt-4o-mini'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(12),
    system: `You are an expert assistant specializing in developing communication applications. 
    Your goal is to provide clear, accurate, and practical answers to any technical questions. 
    Speak in polite and friendly tone.
    Only respond to questions using information from tool calls. The knowledge base content is in english. 
    If the user asks on different language, translate the question to english before 
    checking the knowledge base, but use the original language for answering.
    If no relevant information is found in the tool calls, respond, "Sorry, I don't know."
    But follow the conversation, so use information from both the tool calls and the conversation.`,
    tools: {      
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,        
        inputSchema: z.object({
          question: z.string().describe('the users question'),
        }),
        execute: async ({ question }) => {
          console.log(`Tool call (getInformation): '${question}'`)
          return findRelevantContent(question)},
      }),
    },
    onError({ error }) {
        console.error(error); 
      },    
  });

  return result.toUIMessageStreamResponse();
}