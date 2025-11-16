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
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [widgetError, setWidgetError] = React.useState(false);

  // Define functions before useEffects
  const saveMessageToBackend = React.useCallback(async (data: {
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
      console.log('🌐 API URL:', `${apiUrl}/chat/save-message`);
      console.log('🔑 Token present:', !!token);

      const response = await fetch(`${apiUrl}/chat/save-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save message:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      } else {
        const result = await response.json();
        console.log('✅ Message saved successfully:', result);
        return result;
      }
    } catch (error) {
      console.error('❌ Error saving message:', error);
      throw error;
    }
  }, [token]);

  const fetchAndSyncTranscript = React.useCallback(async (conversationId: string) => {
    try {
      console.log('🔄 Fetching final transcript for:', conversationId);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        console.error('❌ Failed to fetch transcript:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📝 Full transcript data:', data);

      if (data.transcript && Array.isArray(data.transcript)) {
        const totalMessages = data.transcript.length;
        console.log(`📊 Syncing all ${totalMessages} messages from conversation`);

        for (const message of data.transcript) {
          await saveMessageToBackend({
            research_id: researchId,
            role: message.role === 'user' ? 'user' : 'assistant',
            content: message.message || message.text || '',
            timestamp: new Date(message.timestamp || Date.now()).toISOString(),
            provider: 'elevenlabs',
            elevenlabs_conversation_id: conversationId,
            elevenlabs_message_id: message.id,
          });
        }

        console.log(`✅ Successfully synced ${totalMessages} messages to database`);
      }
    } catch (error) {
      console.error('❌ Error fetching/syncing transcript:', error);
    }
  }, [researchId, saveMessageToBackend]);

  useEffect(() => {
    // Ensure widget is properly initialized after script loads
    if (scriptLoaded && widgetRef.current) {
      console.log('Widget element initialized:', widgetRef.current);
      console.log('Agent ID being set:', agentId);

      // Force widget to reinitialize by toggling the agent-id
      const initWidget = () => {
        if (widgetRef.current) {
          // First remove the attribute to force re-initialization
          widgetRef.current.removeAttribute('agent-id');

          // Then set it again with a slight delay
          setTimeout(() => {
            if (widgetRef.current) {
              widgetRef.current.setAttribute('agent-id', agentId);
              console.log('✅ Widget initialized with agent ID:', agentId);
            }
          }, 50);
        }
      };

      // Wait longer for custom element to be fully registered
      setTimeout(initWidget, 1000);
    }
  }, [scriptLoaded, agentId]);


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

      // Sync the full conversation when it ends
      if (event.detail?.conversationId) {
        console.log('💾 Syncing conversation to database...');
        await fetchAndSyncTranscript(event.detail.conversationId);
      }
    };

    // Add event listeners
    window.addEventListener('elevenlabs-conversation-start', handleConversationStart);
    window.addEventListener('elevenlabs-conversation-end', handleConversationEnd);

    return () => {
      window.removeEventListener('elevenlabs-conversation-start', handleConversationStart);
      window.removeEventListener('elevenlabs-conversation-end', handleConversationEnd);
    };
  }, [fetchAndSyncTranscript]);

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
            <strong>Click "Call VERA" below to start</strong>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            The widget supports both voice and text input. All conversations are saved when you hang up.
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
        {scriptLoaded && (
          <elevenlabs-convai
            ref={widgetRef}
            agent-id={agentId}
          ></elevenlabs-convai>
        )}

        {scriptLoaded && !widgetError && (
          <div className="text-center text-gray-600 max-w-md">
            <p className="text-lg mb-4">Ready to chat with VERA!</p>
            <div className="text-sm space-y-2 bg-white/50 rounded-lg p-4">
              <p>• Click the "Call VERA" button in the bottom right</p>
              <p>• Use voice or type your messages</p>
              <p>• End anytime by closing the chat window</p>
            </div>
          </div>
        )}

        {widgetError && (
          <div className="text-center text-red-600 max-w-md">
            <p className="text-lg font-semibold mb-4">Widget Loading Issue</p>
            <div className="text-sm space-y-2 bg-red-50 rounded-lg p-4 text-left">
              <p className="font-medium">If you're using Chrome, please try:</p>
              <p>• Enabling hardware acceleration in Chrome settings</p>
              <p>• Using Safari or another browser</p>
              <p>• Checking that WebGL is enabled (visit chrome://gpu)</p>
              <p className="mt-3 text-gray-700">The widget requires WebGL support to function properly.</p>
            </div>
          </div>
        )}
      </div>

      {/* Load ElevenLabs widget script */}
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('✅ ElevenLabs widget script loaded');
          // Add delay to ensure custom element is registered
          setTimeout(() => {
            setScriptLoaded(true);
          }, 500);
        }}
        onError={(e) => {
          console.error('❌ Failed to load ElevenLabs widget:', e);
          setWidgetError(true);
        }}
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
