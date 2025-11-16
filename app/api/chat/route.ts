//import { openai } from '@ai-sdk/openai';
import { openai } from '@/lib/ai/client';   // Using Helicone proxy
import {
  convertToModelMessages,
  generateText,
  streamText,
  tool,  
  stepCountIs,  
} from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {systemPrompt} from '@/lib/ai/resources';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) { 
  const body = await req.json();
  //console.log('body:', body)
  const { messages, id: chatId } = body ?? {};

  const accept = req.headers.get('accept') ?? '';
  const wantsJson = accept.includes('application/json') &&
    !accept.includes('text/event-stream') &&
    !accept.includes('application/x-ndjson');

  // Use provided chat id/body or header for Helicone tracking, fallback to generating one
  const currentSessionId = chatId || nanoid();
  console.log('currentSessionId', currentSessionId);

  // Helicone session tracking headers
  const heliconeHeaders = {
    'Helicone-Session-Id': currentSessionId,
    'Helicone-Session-Name': 'AI ICT Chat',
    'Helicone-Session-Path': '/chat/ict',
    'Helicone-User-Id': 'krisz@cstainside.com'
  };

  const common = {
    model: openai('gpt-5'),
    //model: openai('gpt-4o-mini'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(16),
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
    }    
  } as const;

  if (wantsJson) {
    try {
      const { text } = await generateText(common);
      return NextResponse.json(
        { answer: text },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      console.error('Exception in generateText:', error)
      return NextResponse.json(
        { error: 'AI call failed' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }    
  }

  const result = streamText(common); 
  return result.toUIMessageStreamResponse();
}