import type { FileType } from '@/domain/types';

const EXTENSION_TO_TYPE: Record<string, FileType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  md: 'md',
  markdown: 'md',
  txt: 'txt',
};

export function getFileType(name: string): FileType {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TO_TYPE[extension] ?? 'unknown';
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) {
    return 'Unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function mimeTypeForFile(type: FileType): string {
  switch (type) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'md':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
