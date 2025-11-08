'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { PhoneIcon, PhoneOffIcon, SendIcon } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId?: string;
  messageId?: string;
}

interface ElevenLabsChatInterfaceProps {
  researchId: string;
  token: string;
  onLogout?: () => void;
}

export default function ElevenLabsChatInterface({
  researchId,
  token,
  onLogout,
}: ElevenLabsChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [conversationState, setConversationState] = useState<
    'disconnected' | 'connecting' | 'connected' | 'disconnecting' | null
  >('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elevenLabsConversationId, setElevenLabsConversationId] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isTextOnlyModeRef = useRef<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingMessageRef = useRef<string | null>(null);

  // Get ElevenLabs API key from environment
  const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

  const conversation = useConversation({
    apiKey: elevenLabsApiKey,
    onConnect: () => {
      console.log('ElevenLabs connected');
      setErrorMessage(null);

      // Send pending message if there is one
      if (pendingMessageRef.current) {
        console.log('Sending pending message:', pendingMessageRef.current);
        conversation.sendUserMessage(pendingMessageRef.current);
        pendingMessageRef.current = null;
      }
    },
    onDisconnect: async () => {
      console.log('ElevenLabs disconnected');

      // If we had a conversation ID and were in voice mode, fetch the transcript
      if (elevenLabsConversationId && !isTextOnlyModeRef.current) {
        console.log('Fetching conversation transcript for:', elevenLabsConversationId);
        try {
          // Fetch conversation history from ElevenLabs API
          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${elevenLabsConversationId}`,
            {
              headers: {
                'xi-api-key': elevenLabsApiKey || '',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Conversation transcript:', data);

            // Extract messages from the transcript
            if (data.transcript && Array.isArray(data.transcript)) {
              const transcriptMessages: ChatMessage[] = data.transcript.map((item: any) => ({
                role: item.role === 'user' ? 'user' : 'assistant',
                content: item.message || item.text || '',
                timestamp: new Date(item.timestamp || Date.now()),
                conversationId: elevenLabsConversationId,
              })).filter((msg: ChatMessage) => msg.content);

              if (transcriptMessages.length > 0) {
                console.log('Adding transcript messages:', transcriptMessages.length);
                setMessages(transcriptMessages);

                // Sync all messages to backend
                transcriptMessages.forEach(msg => syncMessageToBackend(msg));
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch conversation transcript:', error);
        }
      }

      setElevenLabsConversationId(null);
    },
    onMessage: (message) => {
      console.log('ElevenLabs message received:', {
        source: message.source,
        message: message.message,
        type: (message as any).type,
        fullMessage: message,
      });

      // Track conversation ID from ElevenLabs (if available in metadata)
      const conversationId = (message as any).conversationId || elevenLabsConversationId;
      if ((message as any).conversationId) {
        setElevenLabsConversationId((message as any).conversationId);
      }

      if (message.message) {
        console.log('Adding message to chat:', message.message);
        const newMessage: ChatMessage = {
          role: message.source === 'user' ? 'user' : 'assistant',
          content: message.message,
          timestamp: new Date(),
          conversationId: conversationId || undefined,
          messageId: (message as any).id || undefined,
        };
        setMessages((prev) => {
          console.log('Previous messages:', prev.length);
          return [...prev, newMessage];
        });

        // Sync to backend API
        syncMessageToBackend(newMessage);
      } else {
        console.log('Message has no content, skipping');
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
      setConversationState('disconnected');
      setErrorMessage(`Connection error: ${typeof error === 'string' ? error : (error as any).message || 'Please try again'}`);
    },
    onDebug: (debug) => {
      console.log('ElevenLabs debug:', debug);

      // Capture conversation ID from debug events
      if (debug && typeof debug === 'object') {
        const debugObj = debug as any;
        if (debugObj.conversationId) {
          console.log('Captured conversation ID from debug:', debugObj.conversationId);
          setElevenLabsConversationId(debugObj.conversationId);
        }
        if (debugObj.message && debugObj.message.conversation_id) {
          console.log('Captured conversation ID from message:', debugObj.message.conversation_id);
          setElevenLabsConversationId(debugObj.message.conversation_id);
        }
      }
    },
    onModeChange: (mode: any) => {
      console.log('ElevenLabs mode changed:', mode);
    },
    onStatusChange: (status: any) => {
      console.log('ElevenLabs status changed:', status);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync messages to backend for data collection
  const syncMessageToBackend = useCallback(
    async (message: ChatMessage) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

        console.log('Syncing message to backend:', {
          research_id: researchId,
          role: message.role,
          content: message.content.substring(0, 50) + '...',
        });

        // Save to conversation history
        const response = await fetch(`${apiUrl}/chat/save-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            research_id: researchId,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp.toISOString(),
            provider: 'elevenlabs',
            elevenlabs_conversation_id: message.conversationId,
            elevenlabs_message_id: message.messageId,
          }),
        });

        if (!response.ok) {
          console.error('Backend sync failed:', response.status, response.statusText);
        } else {
          console.log('Message synced successfully');
        }
      } catch (error) {
        console.error('Failed to sync message to backend:', error);
      }
    },
    [researchId, token]
  );

  const getMicStream = useCallback(async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setErrorMessage(null);
      return stream;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage('Please enable microphone permissions in your browser.');
      }
      throw error;
    }
  }, []);

  const startConversation = useCallback(
    async (textOnly: boolean = true) => {
      try {
        console.log('Starting ElevenLabs conversation, textOnly:', textOnly);
        isTextOnlyModeRef.current = textOnly;

        if (!textOnly) {
          console.log('Requesting microphone access...');
          await getMicStream();
        }

        const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
        console.log('Agent ID configured:', agentId ? 'Yes' : 'No');
        console.log('API Key configured:', elevenLabsApiKey ? 'Yes' : 'No');

        if (!agentId) {
          const error = 'ElevenLabs Agent ID not configured. Check .env.local file.';
          console.error(error);
          setErrorMessage(error);
          setConversationState('disconnected');
          return;
        }

        if (!elevenLabsApiKey) {
          const error = 'ElevenLabs API Key not configured. Set NEXT_PUBLIC_ELEVENLABS_API_KEY environment variable.';
          console.error(error);
          setErrorMessage(error);
          setConversationState('disconnected');
          return;
        }

        console.log('Starting session with config:', {
          agentId: agentId.substring(0, 5) + '...',
          connectionType: textOnly ? 'websocket' : 'webrtc',
          textOnly,
        });

        await conversation.startSession({
          agentId: agentId,
          connectionType: textOnly ? 'websocket' : 'webrtc',
          overrides: {
            conversation: {
              textOnly: textOnly,
            },
            agent: {
              firstMessage: textOnly ? '' : undefined,
            },
          },
          onStatusChange: (status) => {
            console.log('Status changed to:', status.status);
            setConversationState(status.status);
          },
        });

        console.log('Session started successfully');
      } catch (error: any) {
        console.error('Failed to start conversation:', error);
        setConversationState('disconnected');
        setErrorMessage(`Failed to start: ${error.message || 'Unknown error'}`);
      }
    },
    [conversation, getMicStream]
  );

  const handleVoiceCall = useCallback(async () => {
    if (conversationState === 'disconnected' || conversationState === null) {
      setConversationState('connecting');
      try {
        await startConversation(false); // Voice mode
      } catch {
        setConversationState('disconnected');
      }
    } else if (conversationState === 'connected') {
      conversation.endSession();
      setConversationState('disconnected');

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [conversationState, conversation, startConversation]);

  const handleSendText = useCallback(async () => {
    if (!textInput.trim()) return;

    const messageToSend = textInput;

    if (conversationState === 'disconnected' || conversationState === null) {
      const userMessage: ChatMessage = {
        role: 'user',
        content: messageToSend,
        timestamp: new Date(),
      };
      setTextInput('');
      setConversationState('connecting');

      try {
        // Add user message to display immediately
        setMessages([userMessage]);
        syncMessageToBackend(userMessage);

        // Store message to send when connected
        pendingMessageRef.current = messageToSend;

        // Start text-only conversation
        await startConversation(true); // Text mode (will send message in onConnect)
      } catch (error) {
        console.error('Failed to start conversation:', error);
        setConversationState('disconnected');
        pendingMessageRef.current = null;
      }
    } else if (conversationState === 'connected') {
      const newMessage: ChatMessage = {
        role: 'user',
        content: messageToSend,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      syncMessageToBackend(newMessage);
      setTextInput('');
      conversation.sendUserMessage(messageToSend);
    }
  }, [textInput, conversationState, conversation, startConversation, syncMessageToBackend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (conversationState === 'connected') {
        conversation.endSession();
      }
    };
  }, []);

  const isCallActive = conversationState === 'connected' && !isTextOnlyModeRef.current;

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Header - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-purple-50 border-b border-purple-200 px-4 py-3 safe-area-top">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            V
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">VERA</h2>
            <p className="text-xs text-gray-500">
              {errorMessage ? (
                <span className="text-red-600">{errorMessage}</span>
              ) : conversationState === 'disconnected' || conversationState === null ? (
                'Ready to chat'
              ) : conversationState === 'connected' ? (
                isCallActive ? '🎤 Voice call active' : 'Connected'
              ) : conversationState === 'connecting' ? (
                'Connecting...'
              ) : (
                'Disconnecting...'
              )}
            </p>
          </div>
          {/* Logout button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              title="Logout"
            >
              Logout
            </button>
          )}
          {/* Voice call button */}
          <button
            onClick={handleVoiceCall}
            className={`p-3 rounded-full transition-all ${
              isCallActive
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title={isCallActive ? 'End voice call' : 'Start voice call'}
            disabled={conversationState === 'connecting' || conversationState === 'disconnecting'}
          >
            {isCallActive ? (
              <PhoneOffIcon className="w-5 h-5" />
            ) : (
              <PhoneIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Messages area - Scrollable content with padding for fixed header/footer */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 messages-scroll mt-[72px] mb-[88px]">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">Ask VERA about Peripheral Artery Disease (PAD)</p>
            <p className="text-xs mt-2">
              {isCallActive
                ? '🎤 Listening... speak your question'
                : 'Type a message or tap the phone icon for voice chat'}
            </p>
            <p className="text-xs mt-2 text-purple-600">Powered by ElevenLabs AI</p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-purple-50 border-t border-purple-200 px-4 py-3 safe-area-bottom">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendText();
          }}
          className="flex items-end space-x-2"
        >
          <div className="flex-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isCallActive ? 'Speak or type a message' : 'Message'}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              disabled={conversationState === 'connecting' || conversationState === 'disconnecting'}
            />
          </div>
          <button
            type="submit"
            disabled={
              !textInput.trim() ||
              conversationState === 'connecting' ||
              conversationState === 'disconnecting'
            }
            className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>

        {isCallActive && (
          <p className="text-xs text-center text-purple-700 mt-2">
            🎤 Voice call active - Speak now or type your message
          </p>
        )}
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex message-bubble ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-purple-500 text-white rounded-br-md'
            : 'bg-gray-200 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-purple-100' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
