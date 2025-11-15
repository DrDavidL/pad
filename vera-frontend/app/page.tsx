'use client';

import { useState, useEffect } from 'react';
import IPhoneFrame from '@/components/IPhoneFrame';
import ResearchIDScreen from '@/components/ResearchIDScreen';
import DisclaimerScreen from '@/components/DisclaimerScreen';
import ElevenLabsWidget from '@/components/ElevenLabsWidget';
import { VeraAPI } from '@/lib/api';
import { AppScreen } from '@/types';

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('research-id');
  const [researchId, setResearchId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

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

  const handleLogout = () => {
    // Clear state
    setToken(null);
    setResearchId(null);
    setScreen('research-id');

    // Clear localStorage
    localStorage.removeItem('vera_token');
    localStorage.removeItem('vera_research_id');
    localStorage.removeItem('vera_token_expiry');
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
        <ElevenLabsWidget researchId={researchId} token={token} onLogout={handleLogout} />
      )}
    </IPhoneFrame>
  );
}
