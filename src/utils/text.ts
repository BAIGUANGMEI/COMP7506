import type { Citation, DocumentChunk } from '@/domain/types';
import { createId } from '@/utils/ids';

const APPROX_CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

export function chunkText(documentId: string, rawText: string): DocumentChunk[] {
  const text = rawText.replace(/\r\n/g, '\n').trim();

  if (!text) {
    return [];
  }

  const sections = text
    .split(/\n(?=#{1,3}\s)|\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  const chunks: DocumentChunk[] = [];
  let buffer = '';
  let heading: string | null = null;

  const flush = () => {
    const content = buffer.trim();
    if (!content) {
      return;
    }

    chunks.push({
      id: createId('chunk'),
      documentId,
      heading,
      text: content,
      tokenEstimate: estimateTokens(content),
    });
    buffer = '';
  };

  for (const section of sections) {
    const headingMatch = section.match(/^(#{1,3})\s+(.+)$/m);
    const nextHeading: string | null = headingMatch?.[2]?.trim() ?? heading;

    if (estimateTokens(`${buffer}\n\n${section}`) > 900) {
      flush();
    }

    heading = nextHeading;
    buffer = `${buffer}\n\n${section}`.trim();
  }

  flush();
  return chunks;
}

export function findRelevantChunks(chunks: DocumentChunk[], question: string, limit = 4): DocumentChunk[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
    .filter((term) => term.length > 2);

  if (terms.length === 0) {
    return chunks.slice(0, limit);
  }

  const matches = [...chunks]
    .map((chunk) => {
      const haystack = `${chunk.heading ?? ''} ${chunk.text}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score || b.chunk.tokenEstimate - a.chunk.tokenEstimate)
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.chunk);

  return matches.length > 0 ? matches : chunks.slice(0, limit);
}

export function chunksToCitations(chunks: DocumentChunk[]): Citation[] {
  return chunks.map((chunk, index) => ({
    documentId: chunk.documentId,
    chunkId: chunk.id,
    pageNumber: chunk.pageNumber,
    label: chunk.pageNumber ? `Page ${chunk.pageNumber}` : `Source ${index + 1}`,
    excerpt: chunk.text.slice(0, 180),
  }));
}

export function buildLocalSummary(title: string, chunks: DocumentChunk[], visualNotes: string[] = []) {
  const firstChunk = chunks[0]?.text ?? 'No readable text was extracted yet.';
  const sentences = firstChunk
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return {
    overview:
      sentences.slice(0, 2).join(' ') ||
      `${title} is ready in the library. Configure Kimi API to generate a richer AI summary.`,
    keyPoints: [
      sentences[0] ?? 'Imported and stored locally for review.',
      sentences[1] ?? 'Text chunks are prepared for document-grounded Q&A.',
      visualNotes[0] ?? 'PDF page-level visual analysis will run when key page rendering is available.',
    ],
    outline: chunks.slice(0, 5).map((chunk, index) => chunk.heading ?? `Section ${index + 1}`),
    terms: ['Local-first', 'Document chunks', 'Citations'],
    readingGuide:
      'Start with the overview, scan the key points, then ask focused questions from the Q&A tab.',
  };
}
