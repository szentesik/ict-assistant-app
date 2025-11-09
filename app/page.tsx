'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useMemo } from 'react';
import { nanoid } from 'nanoid';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function Chat() {
  const [input, setInput] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, boolean>>({});
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<Record<string, boolean>>({});

  // Generate a session ID that persists for the entire chat session
  const sessionId = useMemo(() => nanoid(), []);

  const { messages, sendMessage, status } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { id: sessionId, messages },
      }),
    }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const toggleToolDetails = (messageId: string, partIndex: number) => {
    const key = `${messageId}-${partIndex}`;
    setExpandedTools(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getQuestionForAnswer = (answerMessageId: string): string | null => {
    const answerIndex = messages.findIndex(m => m.id === answerMessageId);
    if (answerIndex === -1 || answerIndex === 0) return null;
    
    // Find the most recent user message before this assistant message
    for (let i = answerIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const textParts = messages[i].parts.filter(p => p.type === 'text');
        return textParts.map(p => p.text).join(' ') || null;
      }
    }
    return null;
  };

  const getAnswerText = (message: typeof messages[0]): string => {
    const textParts = message.parts.filter(p => p.type === 'text');
    return textParts.map(p => p.text).join(' ') || '';
  };

  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    const question = getQuestionForAnswer(messageId);
    const answer = getAnswerText(message);

    if (!question || !answer) {
      console.error('Could not find question or answer for feedback');
      return;
    }

    // Prevent duplicate submissions
    if (submittedFeedback[messageId]) {
      return;
    }

    setIsSubmittingFeedback(prev => ({ ...prev, [messageId]: true }));

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          question,
          answer,
          isPositive,
        }),
      });

      if (response.ok) {
        setSubmittedFeedback(prev => ({ ...prev, [messageId]: true }));
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmittingFeedback(prev => ({ ...prev, [messageId]: false }));
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map(m => {
          const textParts = m.parts.filter(p => p.type === 'text');
          const toolParts = m.parts.filter(p => p.type.startsWith('tool-'));
          const hasFeedback = submittedFeedback[m.id];
          const isSubmitting = isSubmittingFeedback[m.id];
          
          return (
            <div key={m.id} className="whitespace-pre-wrap">
              <div>
                <div className="font-bold mb-2">{m.role}</div>
                
                {/* Show text content naturally */}
                {textParts.map((part, index) => (
                  <p key={index} className="mb-2">{part.text}</p>
                ))}
                
                {/* Show collapsible tool details */}
                {toolParts.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      ? Show how I found this ({toolParts.length} tool call{toolParts.length !== 1 ? 's' : ''})
                    </summary>
                    <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-2">
                      {toolParts.map((part, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">
                            {part.state === 'output-available' ? 'Called' : 'Calling'}{' '}
                            {part.type.replace('tool-', '')}
                          </p>
                          <pre className="my-1 bg-zinc-100 p-2 rounded-sm text-xs overflow-x-auto">
                            Input: {JSON.stringify(part.input, null, 2)}
                          </pre>
                          {part.state === 'output-available' && part.output ? (
                            <pre className="my-1 bg-green-100 p-2 rounded-sm text-xs overflow-x-auto">
                              Output: {typeof part.output === 'string' ? part.output : JSON.stringify(part.output, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Feedback buttons for assistant messages */}
                {m.role === 'assistant' && textParts.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback(m.id, true)}
                      disabled={hasFeedback || isSubmitting}
                      className={`p-1.5 rounded-md transition-colors ${
                        hasFeedback
                          ? 'bg-green-100 text-green-600 cursor-not-allowed'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-green-600'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Thumbs up"
                    >
                      <ThumbsUp size={18} />
                    </button>
                    <button
                      onClick={() => handleFeedback(m.id, false)}
                      disabled={hasFeedback || isSubmitting}
                      className={`p-1.5 rounded-md transition-colors ${
                        hasFeedback
                          ? 'bg-red-100 text-red-600 cursor-not-allowed'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-red-600'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Thumbs down"
                    >
                      <ThumbsDown size={18} />
                    </button>
                    {hasFeedback && (
                      <span className="text-xs text-gray-500 ml-1">Feedback submitted</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 animate-pulse">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Ask something..."
          onChange={e => setInput(e.currentTarget.value)}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
