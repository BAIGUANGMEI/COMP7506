import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { DocumentRecord, DocumentSummary } from '@/domain/types';
import { safeFileName } from '@/utils/files';

export function buildSummaryMarkdown(document: DocumentRecord, summary: DocumentSummary | null): string {
  const tags = document.tags.length ? document.tags.map((tag) => `\`${tag}\``).join(' ') : 'None';

  return [
    `# ${document.title}`,
    '',
    `- Type: ${document.fileType.toUpperCase()}`,
    `- Source: ${document.sourceName}`,
    `- Tags: ${tags}`,
    `- Updated: ${new Date(document.updatedAt).toLocaleString()}`,
    '',
    '## Overview',
    summary?.overview ?? 'No summary has been generated yet.',
    '',
    '## Key Points',
    ...(summary?.keyPoints.length ? summary.keyPoints.map((point) => `- ${point}`) : ['- No key points yet.']),
    '',
    '## Outline',
    ...(summary?.outline.length ? summary.outline.map((item) => `- ${item}`) : ['- No outline yet.']),
    '',
    '## Terms',
    ...(summary?.terms.length ? summary.terms.map((term) => `- ${term}`) : ['- No terms yet.']),
    '',
    '## Reading Guide',
    summary?.readingGuide ?? 'No reading guide yet.',
    '',
    '## Personal Notes',
    document.notes || 'No personal notes.',
    '',
  ].join('\n');
}

export async function copySummaryMarkdown(document: DocumentRecord, summary: DocumentSummary | null): Promise<void> {
  await Clipboard.setStringAsync(buildSummaryMarkdown(document, summary));
}

export async function shareSummaryMarkdown(document: DocumentRecord, summary: DocumentSummary | null): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('File export is not available in this environment.');
  }

  const fileUri = `${FileSystem.documentDirectory}${safeFileName(document.title)}-summary.md`;
  await FileSystem.writeAsStringAsync(fileUri, buildSummaryMarkdown(document, summary));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      dialogTitle: `Export ${document.title}`,
      mimeType: 'text/markdown',
      UTI: 'net.daringfireball.markdown',
    });
  }

  return fileUri;
}
