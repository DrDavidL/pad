import {
  ResearchIDValidateRequest,
  ResearchIDResponse,
  DisclaimerAcknowledgeRequest,
  DisclaimerResponse,
  LoginRequest,
  Token,
  ConversationHistoryRequest,
  ConversationHistoryResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class VeraAPI {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static async validateResearchID(
    data: ResearchIDValidateRequest
  ): Promise<ResearchIDResponse> {
    return this.request<ResearchIDResponse>('/auth/validate-research-id', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async acknowledgeDisclaimer(
    data: DisclaimerAcknowledgeRequest
  ): Promise<DisclaimerResponse> {
    return this.request<DisclaimerResponse>('/auth/acknowledge-disclaimer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async login(data: LoginRequest): Promise<Token> {
    return this.request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getConversationHistory(
    data: ConversationHistoryRequest,
    token: string
  ): Promise<ConversationHistoryResponse> {
    return this.request<ConversationHistoryResponse>('/chat/history', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }
}

// Helper to generate conversation ID
export function generateConversationId(researchId: string): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return `conv_${timestamp}_${researchId}`;
}

// WebSocket connection helper
export function createWebSocketConnection(token: string): WebSocket {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/chat/ws/chat';
  return new WebSocket(wsUrl);
}
