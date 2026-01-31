export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date | string; // Allow string for hydration from JSON
  isReport?: boolean;
}

export interface OnboardingState {
  isInterviewComplete: boolean;
  isProcessing: boolean;
  language: 'en-GB' | 'pt-PT' | 'unknown';
}

export enum GeminiModel {
  FLASH = 'gemini-3-flash-preview',
  LIVE = 'gemini-2.5-flash-native-audio-preview-12-2025'
}

export interface ReportData {
  summary: string;
  clientName: string;
  projectType: string;
  budget: string;
  timeline: string;
  keyRequirements: string[];
  sentiment: string;
  languageUsed: string;
}

export interface OnboardingSession {
  id: string;
  clientName: string;
  date: string;
  transcript: Message[];
  report: string | null;
  language: 'en' | 'pt';
  status: 'completed' | 'abandoned' | 'in-progress';
}