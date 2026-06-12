import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { getDatabase, insertDocument } from '@/data/database';
import type { DocumentRecord } from '@/domain/types';
import { formatBytes, getFileType, safeFileName, stripExtension } from '@/utils/files';
import { createId } from '@/utils/ids';

const DOCUMENT_DIR = `${FileSystem.documentDirectory ?? ''}documents/`;

export async function pickAndImportDocument(): Promise<DocumentRecord | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ],
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }

  const documentId = createId('doc');
  const fileType = getFileType(asset.name);
  const destination = `${DOCUMENT_DIR}${documentId}-${safeFileName(asset.name)}`;
  let localUri = asset.uri;

  if (FileSystem.documentDirectory) {
    await FileSystem.makeDirectoryAsync(DOCUMENT_DIR, { intermediates: true });

    try {
      await FileSystem.copyAsync({
        from: asset.uri,
        to: destination,
      });
      localUri = destination;
    } catch {
      localUri = asset.uri;
    }
  }

  const now = new Date().toISOString();
  const document: DocumentRecord = {
    id: documentId,
    title: stripExtension(asset.name),
    fileType,
    localUri,
    categoryId: null,
    tags: [],
    importStatus: 'imported',
    analysisStatus: fileType === 'unknown' ? 'failed' : 'queued',
    sizeLabel: formatBytes(asset.size),
    sourceName: asset.name,
    createdAt: now,
    updatedAt: now,
    analyzedAt: null,
    notes: fileType === 'unknown' ? 'Unsupported file type. Please import PDF, Word, Markdown, or TXT.' : '',
  };

  const db = await getDatabase();
  await insertDocument(db, document);

  return document;
}
