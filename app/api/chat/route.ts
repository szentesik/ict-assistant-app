//import { openai } from '@ai-sdk/openai';
import { openai } from '@/lib/ai/client';   // Using Helicone proxy
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';
import { nanoid } from 'nanoid';
import {systemPrompt} from '@/lib/ai/resources';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {  
  const body = await req.json();
  const { id: chatId, messages } = body ?? {};
  
  const currentSessionId = chatId || nanoid();
  console.log('currentSessionId', currentSessionId);

  // Helicone session tracking headers
  const heliconeHeaders = {
    'Helicone-Session-Id': currentSessionId,
    'Helicone-Session-Name': 'AI ICT Chat',
    'Helicone-Session-Path': '/chat/ict',
    'Helicone-User-Id': 'krisz@cstainside.com'
  };

  const result = streamText({
    model: openai('gpt-5'),
    //model: openai('gpt-4o-mini'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(12),
    headers: heliconeHeaders,
    system: systemPrompt,
    tools: {      
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,        
        inputSchema: z.object({
          question: z.string().describe('the users question'),
        }),
        execute: async ({ question }) => {
          console.log(`Tool call (getInformation): '${question}'`)         
          const relevantGuides = await findRelevantContent(question);
          if (typeof relevantGuides === 'string') {
            return relevantGuides;  // Something went wrong, return the reason
          }
          return relevantGuides.map(guide => guide.content).join('\n')    // Return all text from retrieval
        },
      }),
    },
    onError({ error }) {
        console.error(error); 
      },    
  });

  return result.toUIMessageStreamResponse();
}