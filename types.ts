export enum AppMode {
  LIVE = 'LIVE',
  CHAT = 'CHAT',
  ANALYZE = 'ANALYZE',
  SEEDREAM = 'SEEDREAM',
  FAST = 'FAST'
}

export enum ChatMode {
  STANDARD = 'STANDARD', // gemini-3-pro-preview
  SEARCH = 'SEARCH', // gemini-3-flash-preview + googleSearch
  MAPS = 'MAPS', // gemini-2.5-flash + googleMaps
  THINKING = 'THINKING' // gemini-3-pro-preview + thinkingConfig
}

export enum AnalysisType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingMetadata?: any;
  thinking?: boolean;
  thoughtProcess?: string;
  image?: string; // base64 for generated images in chat
}

export interface AnalysisResult {
  text: string;
  type: AnalysisType;
}