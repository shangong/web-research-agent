export enum AgentState {
  IDLE = 'IDLE',
  BRAINSTORMING = 'BRAINSTORMING',
  REFLECTING = 'REFLECTING',
  SEARCHING = 'SEARCHING',
  COMPILING = 'COMPILING',
  REVIEWING = 'REVIEWING',
  REWRITING = 'REWRITING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  step: AgentState;
  message: string;
  details?: string | object;
}

export interface ResearchReport {
  topic: string;
  markdown: string;
  sources: Array<{ title: string; uri: string }>;
  score?: number;
  feedback?: string;
  version: number;
}

export interface SearchQuery {
  query: string;
  rationale: string;
}

export interface ReviewResult {
  score: number;
  feedback: string;
  approved: boolean;
}
