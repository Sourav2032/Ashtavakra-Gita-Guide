/**
 * Type declarations for the Ashtavakra Gita Spiritual App
 */

export interface ShlokaChunk {
  id: string;
  chapter: number;
  shlokaNumber: number;
  sanskrit: string;
  hindiTranslation: string;
  hindiChhand?: string;
  englishTranslation?: string;
  source: 'preset' | 'uploaded';
}

export interface VectorNode {
  chunk: ShlokaChunk;
  embedding: number[];
}

export interface MatchResult {
  chunk: ShlokaChunk;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  grounding?: MatchResult[];
}
