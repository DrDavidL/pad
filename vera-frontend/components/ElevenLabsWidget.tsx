'use client';

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

interface ElevenLabsWidgetProps {
  researchId: string;
  token: string;
  onLogout?: () => void;
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
  const [scriptLoaded, setScriptLoaded] = React.useState(false);

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


  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">VERA</h1>
            <p className="text-xs opacity-90">Voice & Text AI Assistant</p>
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

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="text-center">
          <p className="text-sm text-blue-900">
            <strong>{isConversationActive ? 'Conversation in progress...' : 'Click "Call VERA" below to start'}</strong>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            The widget supports both voice and text input. All conversations are saved automatically.
          </p>
        </div>
      </div>

      {/* Widget Container - Full Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!scriptLoaded && (
          <div className="text-center text-gray-500">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading VERA...</p>
            <p className="text-sm mt-2">Initializing voice and text interface</p>
          </div>
        )}

        {/* ElevenLabs Widget - This will appear in bottom right */}
        <elevenlabs-convai
          ref={widgetRef}
          agent-id={agentId}
        ></elevenlabs-convai>

        {isConversationActive && (
          <div className="text-center mt-8">
            <div className="flex items-center justify-center gap-3 text-green-600 mb-2">
              <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold">Active Conversation</span>
            </div>
            <p className="text-sm text-gray-600">Your messages are being saved in real-time</p>
          </div>
        )}

        {scriptLoaded && !isConversationActive && (
          <div className="text-center text-gray-600 max-w-md">
            <p className="text-lg mb-4">Ready to chat with VERA!</p>
            <div className="text-sm space-y-2 bg-white/50 rounded-lg p-4">
              <p>• Click the "Call VERA" button in the bottom right</p>
              <p>• Use voice or type your messages</p>
              <p>• End anytime by closing the chat window</p>
            </div>
          </div>
        )}
      </div>

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
