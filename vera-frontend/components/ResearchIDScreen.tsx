'use client';

import React, { useState } from 'react';
import { VeraAPI } from '@/lib/api';

interface ResearchIDScreenProps {
  onValidated: (researchId: string) => void;
}

export default function ResearchIDScreen({ onValidated }: ResearchIDScreenProps) {
  const [researchId, setResearchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!researchId.trim()) {
      setError('Please enter a Research ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await VeraAPI.validateResearchID({
        research_id: researchId.trim()
      });

      if (response.valid) {
        onValidated(researchId.trim());
      } else {
        setError(response.message || 'Invalid Research ID');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate Research ID');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-imessage-blue rounded-full mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">VERA</h1>
          <p className="text-sm text-gray-600">
            Your guide to understanding P.A.D.
          </p>
        </div>

        {/* Research ID Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="research-id"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Enter Your Research ID
            </label>
            <input
              type="text"
              id="research-id"
              value={researchId}
              onChange={(e) => {
                setResearchId(e.target.value);
                setError(null);
              }}
              placeholder="1234"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-imessage-blue focus:border-transparent outline-none transition-all"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !researchId.trim()}
            className="w-full px-6 py-3 text-white text-lg font-semibold bg-imessage-blue rounded-xl hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Validating...
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
