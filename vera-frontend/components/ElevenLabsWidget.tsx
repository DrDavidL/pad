'use client';

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

interface ElevenLabsWidgetProps {
  researchId: string;
  token: string;
  onLogout?: () => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': any;
    }
  }
}

export default function ElevenLabsWidget({
  researchId,
  token,
  onLogout,
}: ElevenLabsWidgetProps) {
  const widgetRef = useRef<HTMLElement>(null);
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'YnxvbM6HYMhMeZam0Cxw';
  const [lastConversationId, setLastConversationId] = React.useState<string | null>(null);
  const [isConversationActive, setIsConversationActive] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [showTextInput, setShowTextInput] = React.useState(false);
  const [textMessage, setTextMessage] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const textConversationIdRef = React.useRef<string>(`conv_${Date.now()}_${researchId}`);

  useEffect(() => {
    // Listen for widget events to capture conversation data
    const handleConversationStart = (event: any) => {
      console.log('🎙️ Conversation started:', event.detail);
      if (event.detail?.conversationId) {
        setLastConversationId(event.detail.conversationId);
        setIsConversationActive(true);
      }
    };

    const handleConversationEnd = async (event: any) => {
      console.log('🛑 Conversation ended:', event.detail);
      setIsConversationActive(false);

      // Fetch conversation transcript from ElevenLabs API
      if (event.detail?.conversationId) {
        try {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${event.detail.conversationId}`,
            {
              headers: {
                'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('📝 Conversation transcript:', data);

            // Save transcript to backend
            if (data.transcript && Array.isArray(data.transcript)) {
              for (const message of data.transcript) {
                await saveMessageToBackend({
                  research_id: researchId,
                  role: message.role === 'user' ? 'user' : 'assistant',
                  content: message.message || message.text || '',
                  timestamp: new Date(message.timestamp || Date.now()).toISOString(),
                  provider: 'elevenlabs',
                  elevenlabs_conversation_id: event.detail.conversationId,
                  elevenlabs_message_id: message.id,
                });
              }
              console.log(`✅ Synced ${data.transcript.length} messages to database`);
            }
          }
        } catch (error) {
          console.error('❌ Failed to fetch conversation transcript:', error);
        }
      }
    };

    const handleMessage = async (event: any) => {
      console.log('💬 Message received:', event.detail);

      // Real-time message syncing - save immediately as messages come in
      const messageDetail = event.detail;
      if (messageDetail && lastConversationId) {
        try {
          await saveMessageToBackend({
            research_id: researchId,
            role: messageDetail.source === 'user' ? 'user' : 'assistant',
            content: messageDetail.message || messageDetail.text || '',
            timestamp: new Date().toISOString(),
            provider: 'elevenlabs',
            elevenlabs_conversation_id: lastConversationId,
            elevenlabs_message_id: messageDetail.id,
          });
          console.log('✅ Real-time message saved');
        } catch (error) {
          console.error('❌ Failed to save real-time message:', error);
        }
      }
    };

    // Add event listeners
    window.addEventListener('elevenlabs-conversation-start', handleConversationStart);
    window.addEventListener('elevenlabs-conversation-end', handleConversationEnd);
    window.addEventListener('elevenlabs-message', handleMessage);

    return () => {
      window.removeEventListener('elevenlabs-conversation-start', handleConversationStart);
      window.removeEventListener('elevenlabs-conversation-end', handleConversationEnd);
      window.removeEventListener('elevenlabs-message', handleMessage);
    };
  }, [researchId, token, lastConversationId]);

  const saveMessageToBackend = async (data: {
    research_id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    provider: string;
    elevenlabs_conversation_id?: string;
    elevenlabs_message_id?: string;
  }) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      console.log('💾 Saving message to backend:', data);

      const response = await fetch(`${apiUrl}/chat/save-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save message:', response.status, errorText);
      } else {
        console.log('✅ Message saved successfully');
      }
    } catch (error) {
      console.error('❌ Error saving message:', error);
    }
  };

  const syncConversationFromElevenLabs = async () => {
    if (!lastConversationId) {
      alert('No conversation to sync. Start a conversation first.');
      return;
    }

    setIsSyncing(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      console.log('🔄 Syncing conversation:', lastConversationId);

      const response = await fetch(`${apiUrl}/chat/sync-elevenlabs-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          research_id: researchId,
          elevenlabs_conversation_id: lastConversationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to sync conversation:', response.status, errorText);
        alert(`Failed to sync conversation: ${errorText}`);
      } else {
        const result = await response.json();
        console.log('✅ Conversation synced:', result);
        alert(`Successfully synced ${result.messages_synced} messages!`);
      }
    } catch (error) {
      console.error('❌ Error syncing conversation:', error);
      alert('Error syncing conversation. Check console for details.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textMessage.trim() || isLoading) return;

    const userMessage = textMessage.trim();
    setTextMessage('');
    setIsLoading(true);

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

      // Send to chat endpoint (which handles both saving user message and getting response)
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          research_id: researchId,
          conversation_id: textConversationIdRef.current,
          content: userMessage,
          model: 'gpt-4o',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.content || 'Sorry, I could not process that.';

      // Add assistant message to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

      console.log('✅ Text message sent and response received');
    } catch (error) {
      console.error('❌ Error sending text message:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceCall = () => {
    // Trigger the widget to start
    if (widgetRef.current) {
      // The widget should handle the click automatically
      const event = new CustomEvent('elevenlabs-start', { bubbles: true });
      widgetRef.current.dispatchEvent(event);
    }
  };

  const endConversation = () => {
    // End the current conversation by dispatching an end event to the widget
    if (widgetRef.current && isConversationActive) {
      const event = new CustomEvent('elevenlabs-end', { bubbles: true });
      widgetRef.current.dispatchEvent(event);
      setIsConversationActive(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">VERA</h1>
            <p className="text-xs opacity-90">{showTextInput ? 'Text Chat Mode' : 'Voice Mode'}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="p-3 bg-white border-b border-gray-200">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setShowTextInput(false)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showTextInput
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎙️ Voice
          </button>
          <button
            onClick={() => setShowTextInput(true)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showTextInput
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 Text
          </button>
        </div>
      </div>

      {/* Voice Mode */}
      {!showTextInput && (
        <>
          {/* Instructions */}
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-900">
                  <strong>{isConversationActive ? 'Conversation in progress...' : 'Click the microphone icon below to start'}</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  All conversations are automatically saved to the database in real-time.
                </p>
              </div>
              <div className="flex gap-2">
                {isConversationActive && (
                  <button
                    onClick={endConversation}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    End Call
                  </button>
                )}
                {lastConversationId && !isConversationActive && (
                  <button
                    onClick={syncConversationFromElevenLabs}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Widget Container */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            {!scriptLoaded && (
              <div className="text-center text-gray-500">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm">Loading voice widget...</p>
              </div>
            )}

            {/* @ts-ignore - ElevenLabs widget custom element */}
            <elevenlabs-convai
              ref={widgetRef}
              agent-id={agentId}
              style={{ display: scriptLoaded ? 'block' : 'none' }}
            ></elevenlabs-convai>

            {isConversationActive && (
              <div className="text-center">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording...</span>
                </div>
                <p className="text-xs text-gray-600">Messages are being saved in real-time</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Text Mode */}
      {showTextInput && (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg mb-2">💬 Text Chat Mode</p>
                <p className="text-sm">Type your message below to start chatting with VERA</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2">
                  <p className="text-sm">Typing...</p>
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={!textMessage.trim() || isLoading}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}

      {/* Load ElevenLabs widget script */}
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ ElevenLabs widget script loaded');
          setScriptLoaded(true);
        }}
        onError={(e) => console.error('❌ Failed to load ElevenLabs widget:', e)}
      />

      {/* Footer */}
      <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-600">
          Research ID: {researchId}
        </p>
      </div>
    </div>
  );
}
