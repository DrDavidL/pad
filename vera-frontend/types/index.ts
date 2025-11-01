// API Types matching FastAPI backend

export interface ResearchIDValidateRequest {
  research_id: string;
}

export interface ResearchIDResponse {
  valid: boolean;
  research_id: string;
  message: string;
}

export interface DisclaimerAcknowledgeRequest {
  research_id: string;
  acknowledged: boolean;
}

export interface DisclaimerResponse {
  success: boolean;
  research_id: string;
  message: string;
}

export interface LoginRequest {
  research_id: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  research_id: string;
  expires_at: string;
}

export interface Message {
  id?: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  model_used?: string;
  audio_url?: string | null;
}

export interface MessageCreateRequest {
  research_id: string;
  conversation_id: string;
  content: string;
  model: string;
}

export interface ConversationHistoryRequest {
  research_id: string;
  conversation_id: string;
  limit?: number;
  offset?: number;
}

export interface ConversationHistoryResponse {
  messages: Message[];
  total: number;
  research_id: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'chunk' | 'complete' | 'audio' | 'user_message_saved' | 'error';
  content?: string;
  full_response?: string;
  audio_base64?: string;
  audio_url?: string;
  conversation_id?: string;
  error?: string;
}

export interface WebSocketSendMessage {
  token: string;
  research_id: string;
  conversation_id: string;
  message: string;
  model: string;
}

// UI State types
export type AppScreen = 'research-id' | 'disclaimer' | 'chat';

export interface AppState {
  screen: AppScreen;
  researchId: string | null;
  token: string | null;
  conversationId: string | null;
}
