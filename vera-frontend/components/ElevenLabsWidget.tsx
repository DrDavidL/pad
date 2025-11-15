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
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'agent-id': string;
      }, HTMLElement>;
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
  const [isSyncing, setIsSyncing] = React.useState(false);

  useEffect(() => {
    // Listen for widget events to capture conversation data
    const handleConversationStart = (event: any) => {
      console.log('🎙️ Conversation started:', event.detail);
      if (event.detail?.conversationId) {
        setLastConversationId(event.detail.conversationId);
      }
    };

    const handleConversationEnd = async (event: any) => {
      console.log('🛑 Conversation ended:', event.detail);

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
            }
          }
        } catch (error) {
          console.error('❌ Failed to fetch conversation transcript:', error);
        }
      }
    };

    const handleMessage = (event: any) => {
      console.log('💬 Message:', event.detail);
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
  }, [researchId, token]);

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

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">VERA</h1>
            <p className="text-xs opacity-90">ElevenLabs Voice Mode</p>
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
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-900">
              <strong>🎙️ Click the microphone button below to start talking with VERA</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Your conversations are automatically saved for research purposes.
            </p>
          </div>
          {lastConversationId && (
            <button
              onClick={syncConversationFromElevenLabs}
              disabled={isSyncing}
              className="ml-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
            </button>
          )}
        </div>
      </div>

      {/* Widget Container */}
      <div className="flex-1 flex items-center justify-center p-8">
        <elevenlabs-convai ref={widgetRef as any} agent-id={agentId}></elevenlabs-convai>
      </div>

      {/* Load ElevenLabs widget script */}
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        onLoad={() => console.log('✅ ElevenLabs widget loaded')}
        onError={(e) => console.error('❌ Failed to load ElevenLabs widget:', e)}
      />

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-600">
          Research ID: {researchId}
        </p>
      </div>
    </div>
  );
}
