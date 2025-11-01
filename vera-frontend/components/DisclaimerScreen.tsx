'use client';

import React, { useState } from 'react';
import { VeraAPI } from '@/lib/api';

interface DisclaimerScreenProps {
  researchId: string;
  onAcknowledged: () => void;
}

export default function DisclaimerScreen({ researchId, onAcknowledged }: DisclaimerScreenProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!isChecked) {
      setError('Please acknowledge the disclaimer to continue');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await VeraAPI.acknowledgeDisclaimer({
        research_id: researchId,
        acknowledged: true
      });

      onAcknowledged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge disclaimer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Research Disclaimer</h2>
        <p className="text-sm text-gray-600 mt-1">Research ID: {researchId}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Important Notice Box */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
              <p className="mt-1 text-sm text-yellow-700">
                This is a research tool for educational purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer Content */}
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <h3 className="text-base font-semibold text-gray-900">
            Research Study Participation
          </h3>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <h4 className="font-semibold text-red-900 mb-2">⚠️ Important Medical Disclaimer</h4>
            <p className="text-sm text-red-800 leading-relaxed">
              VERA is a research tool. It is not intended to provide individualized medical advice,
              make diagnoses or treatment recommendations, or act as a substitute for a trained
              healthcare provider. The information provided by VERA may be wrong or incomplete.
              Always check with your healthcare provider before making decisions about your health.
            </p>
          </div>

          <div className="bg-red-100 border border-red-300 p-4 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h4 className="font-bold text-red-900">Medical Emergency</h4>
                <p className="mt-1 text-sm text-red-800">
                  If you are having a medical emergency, please stop and call 911.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pl-4 border-l-2 border-gray-200 mt-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Research Purpose</h4>
              <p>
                Your interactions with VERA may be recorded and analyzed for research purposes.
                All data will be anonymized and used solely for improving health education tools.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Consult Healthcare Professionals</h4>
              <p>
                Always seek the advice of your physician or other qualified health provider
                with any questions you may have regarding a medical condition. Never disregard
                professional medical advice or delay in seeking it because of information you
                receive from VERA.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <p className="text-sm text-blue-900">
              <strong>Questions or Concerns?</strong> If you have any questions about this
              research study, please contact the research team before proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Fixed bottom acknowledgment */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-4">
        {/* Checkbox */}
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              setIsChecked(e.target.checked);
              setError(null);
            }}
            className="mt-1 h-5 w-5 text-imessage-blue rounded border-gray-300 focus:ring-imessage-blue focus:ring-2"
          />
          <span className="ml-3 text-sm text-gray-700">
            I have read and understand the disclaimer. I acknowledge that VERA is a research tool
            and does not provide individualized medical advice. The information may be wrong or
            incomplete, and I will consult my healthcare provider before making health decisions.
            In case of emergency, I will call 911.
          </span>
        </label>

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
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

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!isChecked || isLoading}
          className="w-full px-6 py-3 text-white text-lg font-semibold bg-purple-500 rounded-xl hover:bg-purple-600 active:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
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
              Processing...
            </div>
          ) : (
            'I Agree - Continue to VERA'
          )}
        </button>
      </div>
    </div>
  );
}
