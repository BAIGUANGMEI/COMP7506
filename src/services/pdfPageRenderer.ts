import type { DocumentRecord } from '@/domain/types';

export interface RenderedPdfPage {
  pageNumber: number;
  dataUri: string;
}

export async function renderKeyPdfPages(_document: DocumentRecord): Promise<RenderedPdfPage[]> {
  // The MVP keeps this as a native boundary. Implement the iOS PDFKit and Android
  // PdfRenderer module after `expo prebuild`, then return data URI page images here.
  return [];
}
