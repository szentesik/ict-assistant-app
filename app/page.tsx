'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useMemo } from 'react';
import { nanoid } from 'nanoid';

export default function Chat() {
  const [input, setInput] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

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

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map(m => {
          const textParts = m.parts.filter(p => p.type === 'text');
          const toolParts = m.parts.filter(p => p.type.startsWith('tool-'));
          
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
