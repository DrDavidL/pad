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
  const [manualConversationId, setManualConversationId] = React.useState<string>('');
  const [recentConversations, setRecentConversations] = React.useState<any[]>([]);
  const [showConversationList, setShowConversationList] = React.useState(false);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [widgetError, setWidgetError] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{
    message: string;
    type: 'idle' | 'syncing' | 'success' | 'error';
  }>({ message: '', type: 'idle' });

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

  const fetchRecentConversations = React.useCallback(async () => {
    try {
      console.log('🔍 [FETCH] Getting recent conversations from ElevenLabs...');
      setSyncStatus({ message: 'Finding conversations...', type: 'syncing' });

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}`,
        {
          headers: {
            'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const data = await response.json();
      console.log('📝 [FETCH] Conversations data:', data);

      if (data.conversations && data.conversations.length > 0) {
        console.log(`✅ [FETCH] Found ${data.conversations.length} conversations`);

        // Return conversations with useful info for selection
        return data.conversations.map((conv: any) => ({
          id: conv.conversation_id,
          agent_id: conv.agent_id,
          status: conv.status,
          // Parse the date for display
          created: new Date(conv.start_time_unix_secs * 1000).toLocaleString(),
          timestamp: conv.start_time_unix_secs
        }));
      } else {
        throw new Error('No conversations found');
      }
    } catch (error) {
      console.error('❌ [FETCH ERROR]:', error);
      setSyncStatus({
        message: 'No conversations found. Please start a call first.',
        type: 'error'
      });
      setTimeout(() => setSyncStatus({ message: '', type: 'idle' }), 5000);
      return null;
    }
  }, [agentId]);

  const fetchAndSyncTranscript = React.useCallback(async (conversationId: string) => {
    try {
      console.log('🔄 [SYNC START] Fetching final transcript for:', conversationId);
      console.log('🔍 [SYNC] Research ID:', researchId);
      console.log('🔍 [SYNC] ElevenLabs API Key present:', !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);

      setSyncStatus({ message: 'Saving conversation to database...', type: 'syncing' });

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
          },
        }
      );

      console.log('📡 [SYNC] ElevenLabs API Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ [SYNC ERROR] Failed to fetch transcript from ElevenLabs:', response.status);
        setSyncStatus({
          message: 'Failed to fetch conversation from ElevenLabs',
          type: 'error'
        });
        setTimeout(() => setSyncStatus({ message: '', type: 'idle' }), 5000);
        return;
      }

      const data = await response.json();
      console.log('📝 [SYNC] Full transcript data received:', data);
      console.log('📊 [SYNC] Transcript array length:', data.transcript?.length || 0);

      if (data.transcript && Array.isArray(data.transcript)) {
        const totalMessages = data.transcript.length;
        console.log(`📊 [SYNC] Processing ${totalMessages} messages from conversation`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < data.transcript.length; i++) {
          const message = data.transcript[i];
          console.log(`💬 [SYNC] Message ${i + 1}/${totalMessages}:`, {
            role: message.role,
            content_preview: (message.message || message.text || '').substring(0, 50),
            message_id: message.id,
            timestamp: message.timestamp
          });

          try {
            await saveMessageToBackend({
              research_id: researchId,
              role: message.role === 'user' ? 'user' : 'assistant',
              content: message.message || message.text || '',
              timestamp: new Date(message.timestamp || Date.now()).toISOString(),
              provider: 'elevenlabs',
              elevenlabs_conversation_id: conversationId,
              elevenlabs_message_id: message.id,
            });
            successCount++;
            console.log(`✅ [SYNC] Message ${i + 1}/${totalMessages} saved successfully`);
          } catch (error) {
            errorCount++;
            console.error(`❌ [SYNC ERROR] Failed to save message ${i + 1}/${totalMessages}:`, error);
          }
        }

        console.log(`✅ [SYNC COMPLETE] Successfully synced ${successCount}/${totalMessages} messages to database`);
        if (errorCount > 0) {
          console.error(`⚠️ [SYNC WARNING] ${errorCount} messages failed to save`);
        }

        setSyncStatus({
          message: `Conversation saved! ${successCount} messages synced to database.`,
          type: 'success'
        });
        setTimeout(() => setSyncStatus({ message: '', type: 'idle' }), 5000);
      } else {
        console.warn('⚠️ [SYNC WARNING] No transcript array found in response');
        setSyncStatus({
          message: 'No messages found in conversation',
          type: 'error'
        });
        setTimeout(() => setSyncStatus({ message: '', type: 'idle' }), 5000);
      }
    } catch (error) {
      console.error('❌ [SYNC ERROR] Error fetching/syncing transcript:', error);
      setSyncStatus({
        message: 'Error saving conversation to database',
        type: 'error'
      });
      setTimeout(() => setSyncStatus({ message: '', type: 'idle' }), 5000);
    }
  }, [researchId, saveMessageToBackend]);

  const handleShowConversationPicker = React.useCallback(async () => {
    const conversations = await fetchRecentConversations();
    if (conversations && conversations.length > 0) {
      setRecentConversations(conversations);
      setShowConversationList(true);
      setSyncStatus({ message: '', type: 'idle' });
    }
  }, [fetchRecentConversations]);

  const handleSelectConversation = React.useCallback(async (conversationId: string) => {
    setShowConversationList(false);
    await fetchAndSyncTranscript(conversationId);
  }, [fetchAndSyncTranscript]);

  const handleSaveManualConversation = React.useCallback(async () => {
    if (!manualConversationId.trim()) {
      setSyncStatus({
        message: 'Please enter a conversation ID',
        type: 'error'
      });
      setTimeout(() => setSyncStatus({ message: '', type: 'idle' }), 3000);
      return;
    }
    await fetchAndSyncTranscript(manualConversationId.trim());
  }, [manualConversationId, fetchAndSyncTranscript]);

  useEffect(() => {
    // Widget is initialized via the agent-id attribute in JSX
    if (scriptLoaded && widgetRef.current) {
      console.log('✅ Widget element ready:', widgetRef.current);
      console.log('✅ Agent ID:', agentId);
    }
  }, [scriptLoaded, agentId]);


  useEffect(() => {
    // Listen for widget events to capture conversation data
    const handleConversationStart = (event: any) => {
      console.log('🎙️ [EVENT] elevenlabs-conversation-start fired');
      console.log('🔍 [EVENT] Event detail:', event.detail);
      console.log('🔍 [EVENT] Conversation ID:', event.detail?.conversationId);

      if (event.detail?.conversationId) {
        setLastConversationId(event.detail.conversationId);
        console.log('✅ [EVENT] Conversation ID saved to state:', event.detail.conversationId);
      } else {
        console.warn('⚠️ [EVENT WARNING] No conversationId in event.detail');
      }
    };

    const handleConversationEnd = async (event: any) => {
      console.log('🛑 [EVENT] elevenlabs-conversation-end fired');
      console.log('🔍 [EVENT] Event detail:', event.detail);
      console.log('🔍 [EVENT] Conversation ID:', event.detail?.conversationId);

      // Sync the full conversation when it ends
      if (event.detail?.conversationId) {
        console.log('💾 [EVENT] Starting conversation sync for:', event.detail.conversationId);
        try {
          await fetchAndSyncTranscript(event.detail.conversationId);
          console.log('✅ [EVENT] Conversation sync completed');
        } catch (error) {
          console.error('❌ [EVENT ERROR] Conversation sync failed:', error);
        }
      } else {
        console.warn('⚠️ [EVENT WARNING] No conversationId in event.detail - cannot sync');
      }
    };

    console.log('📡 [SETUP] Adding event listeners for ElevenLabs widget events');
    // Add event listeners
    window.addEventListener('elevenlabs-conversation-start', handleConversationStart);
    window.addEventListener('elevenlabs-conversation-end', handleConversationEnd);

    return () => {
      console.log('🧹 [CLEANUP] Removing event listeners for ElevenLabs widget events');
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

      {/* Save Conversation Section */}
      <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-700">
        <div className="text-center">
          {!showConversationList ? (
            <>
              <button
                onClick={handleShowConversationPicker}
                disabled={syncStatus.type === 'syncing'}
                className="w-full px-6 py-3 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-purple-700 font-bold rounded-lg text-lg shadow-lg transition-colors"
              >
                {syncStatus.type === 'syncing' ? 'Loading...' : '💾 Save Conversation to Database'}
              </button>
              <p className="text-xs text-white mt-2 opacity-90">
                Click after ending your call to choose and save the conversation
              </p>
            </>
          ) : (
            <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-purple-700 font-bold">Select Conversation to Save</h3>
                <button
                  onClick={() => setShowConversationList(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {recentConversations.map((conv, index) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                  >
                    <div className="font-semibold text-purple-900 text-sm">
                      {index === 0 ? '📞 Most Recent' : `Conversation ${index + 1}`}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {conv.created}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {conv.id.substring(0, 30)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
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
            The widget supports both voice and text input.
          </p>
        </div>
      </div>

      {/* Sync Status Notification */}
      {syncStatus.type !== 'idle' && (
        <div
          className={`p-3 text-center font-medium ${
            syncStatus.type === 'syncing'
              ? 'bg-yellow-50 text-yellow-900 border-b border-yellow-200'
              : syncStatus.type === 'success'
              ? 'bg-green-50 text-green-900 border-b border-green-200'
              : 'bg-red-50 text-red-900 border-b border-red-200'
          }`}
        >
          {syncStatus.type === 'syncing' && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span>{syncStatus.message}</span>
            </div>
          )}
          {syncStatus.type === 'success' && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">✅</span>
              <span>{syncStatus.message}</span>
            </div>
          )}
          {syncStatus.type === 'error' && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">❌</span>
              <span>{syncStatus.message}</span>
            </div>
          )}
        </div>
      )}

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
