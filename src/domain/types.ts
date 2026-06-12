export type FileType = 'pdf' | 'doc' | 'docx' | 'md' | 'txt' | 'unknown';

export type ImportStatus = 'importing' | 'imported' | 'failed';

export type AnalysisStatus =
  | 'not_analyzed'
  | 'queued'
  | 'analyzing'
  | 'analyzed'
  | 'failed';

export interface ModelProvider {
  id: string;
  name: string;
  apiBase: string;
  apiKeyRef: string;
  chatModel: string;
  visionModel: string;
  supportsFiles: boolean;
  supportsVision: boolean;
}

export interface ModelSettings extends ModelProvider {
  hasApiKey: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  documentCount: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  fileType: FileType;
  localUri: string;
  categoryId: string | null;
  tags: string[];
  importStatus: ImportStatus;
  analysisStatus: AnalysisStatus;
  sizeLabel: string;
  sourceName: string;
  createdAt: string;
  updatedAt: string;
  analyzedAt: string | null;
  notes: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  pageNumber?: number | null;
  heading?: string | null;
  text: string;
  tokenEstimate: number;
}

export interface Citation {
  documentId: string;
  chunkId?: string;
  pageNumber?: number | null;
  label: string;
  excerpt: string;
}

export interface DocumentSummary {
  documentId: string;
  overview: string;
  keyPoints: string[];
  outline: string[];
  terms: string[];
  readingGuide: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  documentId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface LibraryStats {
  totalDocuments: number;
  analyzed: number;
  pending: number;
  annotations: number;
}

export interface ImportProgress {
  documentId?: string;
  label: string;
  detail: string;
  status: 'idle' | 'working' | 'done' | 'failed';
}
