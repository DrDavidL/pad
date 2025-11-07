'use client';

import { useState, useEffect } from 'react';
import IPhoneFrame from '@/components/IPhoneFrame';
import ResearchIDScreen from '@/components/ResearchIDScreen';
import DisclaimerScreen from '@/components/DisclaimerScreen';
import ChatInterface from '@/components/ChatInterface';
import ElevenLabsChatInterface from '@/components/ElevenLabsChatInterface';
import { VeraAPI } from '@/lib/api';
import { AppScreen } from '@/types';

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('research-id');
  const [researchId, setResearchId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [useElevenLabs, setUseElevenLabs] = useState<boolean>(true); // Default to ElevenLabs

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('vera_token');
    const savedResearchId = localStorage.getItem('vera_research_id');
    const savedExpiry = localStorage.getItem('vera_token_expiry');

    if (savedToken && savedResearchId && savedExpiry) {
      const expiryDate = new Date(savedExpiry);
      if (expiryDate > new Date()) {
        setToken(savedToken);
        setResearchId(savedResearchId);
        setScreen('chat');
      } else {
        // Token expired, clear storage
        localStorage.removeItem('vera_token');
        localStorage.removeItem('vera_research_id');
        localStorage.removeItem('vera_token_expiry');
      }
    }
  }, []);

  const handleResearchIDValidated = (validatedId: string) => {
    setResearchId(validatedId);
    setScreen('disclaimer');
  };

  const handleDisclaimerAcknowledged = async () => {
    if (!researchId) return;

    try {
      // Login to get token
      const loginResponse = await VeraAPI.login({ research_id: researchId });

      // Save to state and localStorage
      setToken(loginResponse.access_token);
      localStorage.setItem('vera_token', loginResponse.access_token);
      localStorage.setItem('vera_research_id', researchId);
      localStorage.setItem('vera_token_expiry', loginResponse.expires_at);

      // Navigate to chat
      setScreen('chat');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Failed to log in. Please try again.');
    }
  };

  return (
    <IPhoneFrame>
      {screen === 'research-id' && (
        <ResearchIDScreen onValidated={handleResearchIDValidated} />
      )}

      {screen === 'disclaimer' && researchId && (
        <DisclaimerScreen
          researchId={researchId}
          onAcknowledged={handleDisclaimerAcknowledged}
        />
      )}

      {screen === 'chat' && researchId && token && (
        <div className="relative h-full">
          {/* Mode toggle button - positioned below header to avoid overlap */}
          <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 z-20">
            <button
              onClick={() => setUseElevenLabs(!useElevenLabs)}
              className="px-4 py-1.5 bg-white border-2 border-purple-300 rounded-full text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors shadow-lg"
            >
              {useElevenLabs ? '⚡ ElevenLabs' : '🤖 OpenAI'}
            </button>
          </div>

          {/* Render selected chat interface */}
          {useElevenLabs ? (
            <ElevenLabsChatInterface researchId={researchId} token={token} />
          ) : (
            <ChatInterface researchId={researchId} token={token} />
          )}
        </div>
      )}
    </IPhoneFrame>
  );
}
