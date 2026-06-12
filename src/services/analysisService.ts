import * as FileSystem from 'expo-file-system/legacy';

import {
  getDatabase,
  getDocument,
  getSummary,
  listChunks,
  replaceChunks,
  saveSummary,
  searchChunks,
  updateDocumentStatus,
} from '@/data/database';
import type { ConversationMessage, DocumentRecord, DocumentSummary, ModelSettings } from '@/domain/types';
import { KimiClient } from '@/services/kimiClient';
import { getKimiApiKey } from '@/services/modelSettings';
import { renderKeyPdfPages } from '@/services/pdfPageRenderer';
import { buildLocalSummary, chunksToCitations, chunkText, findRelevantChunks } from '@/utils/text';

export async function analyzeDocument(
  documentId: string,
  settings: ModelSettings,
  onProgress?: (label: string, detail: string) => void,
): Promise<DocumentSummary> {
  const db = await getDatabase();
  const document = await getDocument(db, documentId);

  if (!document) {
    throw new Error('Document not found.');
  }

  await updateDocumentStatus(db, documentId, {
    analysisStatus: 'analyzing',
    notes: '',
  });
  onProgress?.('Reading document', 'Preparing text extraction and local chunks.');

  const apiKey = await getKimiApiKey();
  const client = settings.hasApiKey && apiKey ? new KimiClient(settings, apiKey) : null;
  const extractedText = await extractText(document, client);

  onProgress?.('Chunking content', 'Building searchable local document context.');
  const chunks = chunkText(document.id, extractedText);
  const effectiveChunks =
    chunks.length > 0
      ? chunks
      : chunkText(
          document.id,
          `${document.title}\n\nNo readable text could be extracted. Add Kimi API credentials or try a text-based file.`,
        );

  await replaceChunks(db, document.id, effectiveChunks);

  onProgress?.('Checking key pages', 'PDF visual page analysis runs for rendered key pages only.');
  const visualNotes =
    client && document.fileType === 'pdf'
      ? await client.analyzeVisualPages({
          title: document.title,
          pageImages: await renderKeyPdfPages(document),
        })
      : [];

  onProgress?.('Generating summary', client ? 'Calling Kimi for a concise study summary.' : 'Creating an offline draft summary.');
  const generated = client
    ? await client.summarizeDocument({
        title: document.title,
        chunks: effectiveChunks,
        visualNotes,
      })
    : buildLocalSummary(document.title, effectiveChunks, visualNotes);

  const summary: DocumentSummary = {
    documentId: document.id,
    overview: generated.overview,
    keyPoints: generated.keyPoints,
    outline: generated.outline,
    terms: generated.terms,
    readingGuide: generated.readingGuide,
    updatedAt: new Date().toISOString(),
  };

  await saveSummary(db, summary);
  await updateDocumentStatus(db, document.id, {
    analysisStatus: 'analyzed',
    analyzedAt: summary.updatedAt,
    notes:
      visualNotes.length === 0 && document.fileType === 'pdf'
        ? 'Text summary is ready. Native PDF page rendering is prepared as an extension boundary for visual page analysis.'
        : document.notes,
  });

  return summary;
}

export async function answerDocumentQuestion(input: {
  documentId: string;
  question: string;
  settings: ModelSettings;
}): Promise<Pick<ConversationMessage, 'content' | 'citations'>> {
  const db = await getDatabase();
  const document = await getDocument(db, input.documentId);

  if (!document) {
    throw new Error('Choose a document before asking.');
  }

  const indexedChunks = await searchChunks(db, input.documentId, input.question);
  const fallbackChunks = indexedChunks.length > 0 ? indexedChunks : await listChunks(db, input.documentId);
  const chunks = findRelevantChunks(fallbackChunks, input.question);
  const citations = chunksToCitations(chunks);
  const apiKey = await getKimiApiKey();

  if (input.settings.hasApiKey && apiKey) {
    const client = new KimiClient(input.settings, apiKey);
    const content = await client.answerQuestion({
      question: input.question,
      title: document.title,
      chunks,
      citations,
    });

    return { content, citations };
  }

  const context = chunks.map((chunk, index) => `[Source ${index + 1}] ${chunk.text.slice(0, 260)}`).join('\n\n');

  return {
    citations,
    content:
      `I found ${chunks.length} local source${chunks.length === 1 ? '' : 's'} that may answer this. ` +
      `Add your Kimi API key in Settings for a full model answer.\n\n${context || 'No indexed content is available yet.'}`,
  };
}

export async function loadDocumentSummary(documentId: string): Promise<DocumentSummary | null> {
  const db = await getDatabase();
  return getSummary(db, documentId);
}

async function extractText(document: DocumentRecord, client: KimiClient | null): Promise<string> {
  if (document.localUri.startsWith('demo://')) {
    const chunks = await listChunks(await getDatabase(), document.id);
    return chunks.map((chunk) => chunk.text).join('\n\n');
  }

  if (document.fileType === 'txt' || document.fileType === 'md') {
    try {
      return await FileSystem.readAsStringAsync(document.localUri);
    } catch {
      return '';
    }
  }

  if ((document.fileType === 'pdf' || document.fileType === 'doc' || document.fileType === 'docx') && client) {
    return client.extractFileText({
      uri: document.localUri,
      name: document.sourceName,
      type: document.fileType,
    });
  }

  return `${document.title}\n\nThis file is imported locally. Configure Kimi API to extract text from ${document.fileType.toUpperCase()} files.`;
}
