import { NextResponse } from 'next/server';
import { submitFeedback } from '@/lib/actions/resources';
import { z } from 'zod';

const feedbackSchema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  isPositive: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, question, answer, isPositive } = feedbackSchema.parse(body);

    await submitFeedback(
      sessionId,
      question,
      answer,
      isPositive
    )

    return NextResponse.json(
      { success: true, message: 'Feedback submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

