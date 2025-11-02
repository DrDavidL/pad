'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, WebSocketMessage } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { VeraAPI, generateConversationId } from '@/lib/api';

interface ChatInterfaceProps {
  researchId: string;
  token: string;
}

export default function ChatInterface({ researchId, token }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversationId] = useState(() => generateConversationId(researchId));

  // Phone call state
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Audio enabled state (for browser autoplay policy)
  const [audioEnabled, setAudioEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInCallRef = useRef(false); // Track call state for speech recognition

  // Enable audio on first user interaction (required by browser autoplay policy)
  const enableAudio = useCallback(() => {
    if (!audioEnabled && audioRef.current) {
      // Try to play a silent audio to unlock audio playback
      audioRef.current.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD/////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audioRef.current.play().then(() => {
        console.log('Audio enabled successfully');
        setAudioEnabled(true);
      }).catch(() => {
        console.log('Audio enable failed, will try again on next interaction');
      });
    }
  }, [audioEnabled]);

  // Audio playback function - must be defined before handleWebSocketMessage
  const playAudio = useCallback((base64Audio: string) => {
    if (audioRef.current) {
      audioRef.current.src = `data:audio/mp3;base64,${base64Audio}`;
      audioRef.current.play().catch((error) => {
        console.error('Audio playback failed:', error);
        console.log('Audio data length:', base64Audio?.length);
        console.log('This may be due to browser autoplay policy. Try sending a message first.');
      });
    } else {
      console.error('Audio ref is null');
    }
  }, []);

  // Stabilize WebSocket message handler with useCallback to prevent reconnection loop
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case 'user_message_saved':
        break;

      case 'chunk':
        if (data.content) {
          setCurrentResponse((prev) => prev + data.content);
        }
        break;

      case 'complete':
        if (data.full_response) {
          const assistantMessage: Message = {
            conversation_id: conversationId,
            role: 'assistant',
            content: data.full_response,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentResponse('');
          setIsTyping(false);
        }
        break;

      case 'audio':
        console.log('Received audio message:', data.audio_base64 ? 'Audio data present' : 'No audio data');
        if (data.audio_base64) {
          playAudio(data.audio_base64);
        } else {
          console.error('No audio_base64 in audio message');
        }
        break;

      case 'error':
        setIsTyping(false);
        break;
    }
  }, [conversationId, playAudio]);

  // WebSocket connection - initialize with stable message handler
  const { isConnected, connect, disconnect, send } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/chat/ws/chat',
    onMessage: handleWebSocketMessage,
    onOpen: () => console.log('WebSocket connected successfully'),
    onError: (error) => console.error('WebSocket error:', error),
    onClose: () => console.log('WebSocket closed'),
  });

  // Initialize WebSocket
  useEffect(() => {
    connect();

    // Cleanup on unmount - important for React StrictMode in dev
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Load conversation history
  useEffect(() => {
    loadHistory();
  }, []);

  // Call timer management
  useEffect(() => {
    if (isInCall) {
      // Start call timer (updates every second)
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Set 4-minute warning (240 seconds)
      warningTimerRef.current = setTimeout(() => {
        setShowTimeWarning(true);
      }, 240000);

      // Auto-end call after 5 minutes (300 seconds)
      setTimeout(() => {
        endCall();
      }, 300000);
    } else {
      // Clear timers when call ends
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      setCallDuration(0);
      setShowTimeWarning(false);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [isInCall]);

  async function loadHistory() {
    try {
      const history = await VeraAPI.getConversationHistory(
        {
          research_id: researchId,
          conversation_id: conversationId,
          limit: 50,
        },
        token
      );
      setMessages(history.messages);
    } catch (error) {
      // History load error - not critical
    }
  }

  function handleSendMessage(text: string) {
    if (!text.trim()) return;

    // Enable audio on first user interaction (for browser autoplay policy)
    enableAudio();

    console.log('Attempting to send message. isConnected:', isConnected);

    const userMessage: Message = {
      conversation_id: conversationId,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setCurrentResponse('');

    const sent = send({
      token,
      research_id: researchId,
      conversation_id: conversationId,
      message: text.trim(),
      model: 'gpt-4o',
    });

    if (!sent) {
      console.error('Failed to send message - WebSocket not connected');
      setIsTyping(false);
    } else {
      console.log('Message sent successfully');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSendMessage(inputText);
  }

  // Initialize speech recognition
  function initializeSpeechRecognition() {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      // Automatically send the transcribed message
      handleSendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Only end call on fatal errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Don't end call for these errors, just log them
        console.log('Transient speech recognition error, continuing...');
      } else {
        endCall();
      }
    };

    recognition.onend = () => {
      // If call is still active, restart listening after a brief delay
      if (isInCallRef.current) {
        setTimeout(() => {
          if (isInCallRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e: any) {
              // If restart fails, log and try ending the call gracefully
              console.error('Failed to restart speech recognition:', e);
              if (e.message !== 'recognition is already started') {
                endCall();
              }
            }
          }
        }, 500); // Increased delay for more reliable restart
      }
    };

    return recognition;
  }

  function startCall() {
    // Enable audio on user interaction (for browser autoplay policy)
    enableAudio();

    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }

    if (!recognitionRef.current) return;

    setIsInCall(true);
    isInCallRef.current = true; // Update ref for speech recognition
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started
    }
  }

  function endCall() {
    setIsInCall(false);
    isInCallRef.current = false; // Update ref to stop restarts
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
  }

  function toggleCall() {
    if (isInCall) {
      endCall();
    } else {
      startCall();
    }
  }

  function formatCallDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Header - Messages style */}
      <div className="flex-shrink-0 bg-purple-50 border-b border-purple-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            V
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">VERA</h2>
            <p className="text-xs text-gray-500">
              {isInCall ? `In call - ${formatCallDuration(callDuration)}` : isConnected ? 'Active' : 'Connecting...'}
            </p>
          </div>
          {/* Phone call button */}
          <button
            onClick={toggleCall}
            className={`p-3 rounded-full transition-all ${
              isInCall
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title={isInCall ? 'End call' : 'Start call'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isInCall ? (
                // Hang up icon
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
                  transform="rotate(135 10 10)" />
              ) : (
                // Phone icon
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              )}
            </svg>
          </button>
        </div>

        {/* Time warning banner */}
        {showTimeWarning && isInCall && (
          <div className="mt-2 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg text-xs text-yellow-800 text-center animate-pulse">
            ⚠️ One minute remaining in call
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 messages-scroll">
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
            <p className="text-sm">Ask VERA about Peripheral Artery Disease</p>
            <p className="text-xs mt-2">
              {isInCall ? '🎤 Listening... speak your question' : 'Click the phone icon to start a voice call'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {isTyping && (
          <div className="flex items-start space-x-2">
            {currentResponse ? (
              <MessageBubble
                message={{
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: currentResponse,
                }}
              />
            ) : (
              <div className="bg-gray-200 rounded-2xl px-4 py-3 max-w-[75%]">
                <div className="typing-indicator flex space-x-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-purple-50 border-t border-purple-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isInCall ? 'Speak or type a message' : 'Message'}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              disabled={isTyping}
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>

        {isInCall && (
          <p className="text-xs text-center text-purple-700 mt-2">
            🎤 Call active - Speak now or type your message
          </p>
        )}
      </div>

      {/* Hidden audio player for TTS */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: Message }) {
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        {message.timestamp && (
          <p className={`text-xs mt-1 ${isUser ? 'text-purple-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
