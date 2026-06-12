import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

import {
  addMessage,
  createCategory,
  deleteCategory,
  deleteDocumentData,
  getDatabase,
  getDocument,
  getLibraryStats,
  getOrCreateConversation,
  listCategories,
  listDocuments,
  listMessages,
  saveSummary,
  updateCategory,
  updateDocumentMetadata,
} from '@/data/database';
import type {
  Category,
  ConversationMessage,
  DocumentRecord,
  DocumentSummary,
  ImportProgress,
  LibraryStats,
  ModelSettings,
} from '@/domain/types';
import { answerDocumentQuestion, analyzeDocument } from '@/services/analysisService';
import { pickAndImportDocument } from '@/services/importService';
import { clearKimiApiKey, loadModelSettings, saveModelSettings } from '@/services/modelSettings';
import { deleteWebStoredFile, isWebStoredFileUri } from '@/services/webFileStore';
import { createId } from '@/utils/ids';

interface AppContextValue {
  categories: Category[];
  documents: DocumentRecord[];
  stats: LibraryStats;
  settings: ModelSettings | null;
  importProgress: ImportProgress;
  isReady: boolean;
  selectedDocumentId: string | null;
  reload: () => Promise<void>;
  setSelectedDocumentId: (id: string | null) => void;
  importDocument: () => Promise<DocumentRecord | null>;
  analyze: (documentId: string) => Promise<void>;
  saveSettings: (settings: ModelSettings, apiKey?: string) => Promise<void>;
  saveDocumentMetadata: (
    documentId: string,
    input: { title: string; categoryId: string | null; tags: string[]; notes: string },
  ) => Promise<void>;
  saveDocumentSummary: (summary: DocumentSummary) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  updateCategory: (categoryId: string, input: { name: string; color: string; icon: string }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  askQuestion: (documentId: string, question: string) => Promise<ConversationMessage[]>;
  loadMessages: (documentId: string) => Promise<ConversationMessage[]>;
}

const EMPTY_STATS: LibraryStats = {
  totalDocuments: 0,
  analyzed: 0,
  pending: 0,
  annotations: 0,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState<LibraryStats>(EMPTY_STATS);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: 'idle',
    label: 'Ready',
    detail: 'Import a PDF, Word, Markdown, or TXT file.',
  });

  const reload = useCallback(async () => {
    const db = await getDatabase();
    const [nextCategories, nextDocuments, nextStats, nextSettings] = await Promise.all([
      listCategories(db),
      listDocuments(db),
      getLibraryStats(db),
      loadModelSettings(),
    ]);

    setCategories(nextCategories);
    setDocuments(nextDocuments);
    setStats(nextStats);
    setSettings(nextSettings);
    setSelectedDocumentId((current) => current ?? nextDocuments[0]?.id ?? null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const importDocument = useCallback(async () => {
    setImportProgress({
      status: 'working',
      label: 'Opening picker',
      detail: 'Choose a study file from your device.',
    });

    const document = await pickAndImportDocument();
    if (!document) {
      setImportProgress({
        status: 'idle',
        label: 'Import canceled',
        detail: 'No file was added.',
      });
      return null;
    }

    setSelectedDocumentId(document.id);
    setImportProgress({
      documentId: document.id,
      status: 'done',
      label: 'Imported',
      detail: `${document.title} is stored locally.`,
    });
    await reload();
    return document;
  }, [reload]);

  const analyze = useCallback(
    async (documentId: string) => {
      if (!settings) {
        return;
      }

      setImportProgress({
        documentId,
        status: 'working',
        label: 'Queued for analysis',
        detail: 'Preparing the document pipeline.',
      });

      try {
        await analyzeDocument(documentId, settings, (label, detail) => {
          setImportProgress({
            documentId,
            status: 'working',
            label,
            detail,
          });
        });

        setImportProgress({
          documentId,
          status: 'done',
          label: 'Analysis complete',
          detail: 'Summary and searchable chunks are ready.',
        });
      } catch (error) {
        setImportProgress({
          documentId,
          status: 'failed',
          label: 'Analysis failed',
          detail: error instanceof Error ? error.message : 'Unknown error.',
        });
      } finally {
        await reload();
      }
    },
    [reload, settings],
  );

  const handleSaveSettings = useCallback(
    async (nextSettings: ModelSettings, apiKey?: string) => {
      const saved = await saveModelSettings(nextSettings, apiKey);
      setSettings(saved);
      await reload();
    },
    [reload],
  );

  const saveDocumentMetadata = useCallback(
    async (documentId: string, input: { title: string; categoryId: string | null; tags: string[]; notes: string }) => {
      const db = await getDatabase();
      await updateDocumentMetadata(db, documentId, input);
      await reload();
    },
    [reload],
  );

  const saveDocumentSummary = useCallback(
    async (summary: DocumentSummary) => {
      const db = await getDatabase();
      await saveSummary(db, {
        ...summary,
        updatedAt: new Date().toISOString(),
      });
      await reload();
    },
    [reload],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const db = await getDatabase();
      const document = await getDocument(db, documentId);

      if (document && isWebStoredFileUri(document.localUri)) {
        try {
          await deleteWebStoredFile(document.localUri);
        } catch {
          // Keep deleting the database record even if the browser file was already gone.
        }
      } else if (document && !document.localUri.startsWith('demo://')) {
        try {
          await FileSystem.deleteAsync(document.localUri, { idempotent: true });
        } catch {
          // Keep deleting the database record even if the imported file was already gone.
        }
      }

      await deleteDocumentData(db, documentId);
      setSelectedDocumentId((current) => (current === documentId ? null : current));
      await reload();
    },
    [reload],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      const db = await getDatabase();
      await createCategory(db, { name: trimmed });
      await reload();
    },
    [reload],
  );

  const handleUpdateCategory = useCallback(
    async (categoryId: string, input: { name: string; color: string; icon: string }) => {
      const db = await getDatabase();
      await updateCategory(db, categoryId, input);
      await reload();
    },
    [reload],
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const db = await getDatabase();
      await deleteCategory(db, categoryId);
      await reload();
    },
    [reload],
  );

  const clearApiKey = useCallback(async () => {
    const nextSettings = await clearKimiApiKey();
    setSettings(nextSettings);
    await reload();
  }, [reload]);

  const loadMessages = useCallback(async (documentId: string) => {
    const db = await getDatabase();
    const conversation = await getOrCreateConversation(db, documentId);
    return listMessages(db, conversation.id);
  }, []);

  const askQuestion = useCallback(
    async (documentId: string, question: string) => {
      if (!settings) {
        return [];
      }

      const db = await getDatabase();
      const document = await getDocument(db, documentId);
      if (!document) {
        throw new Error('Document not found.');
      }

      const conversation = await getOrCreateConversation(db, documentId);
      const now = new Date().toISOString();
      const userMessage: ConversationMessage = {
        id: createId('msg'),
        conversationId: conversation.id,
        role: 'user',
        content: question,
        citations: [],
        createdAt: now,
      };

      await addMessage(db, userMessage);
      const answer = await answerDocumentQuestion({ documentId, question, settings });
      const assistantMessage: ConversationMessage = {
        id: createId('msg'),
        conversationId: conversation.id,
        role: 'assistant',
        content: answer.content,
        citations: answer.citations,
        createdAt: new Date().toISOString(),
      };

      await addMessage(db, assistantMessage);
      return listMessages(db, conversation.id);
    },
    [settings],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      categories,
      documents,
      stats,
      settings,
      importProgress,
      isReady,
      selectedDocumentId,
      reload,
      setSelectedDocumentId,
      importDocument,
      analyze,
      saveSettings: handleSaveSettings,
      saveDocumentMetadata,
      saveDocumentSummary,
      deleteDocument,
      createCategory: handleCreateCategory,
      updateCategory: handleUpdateCategory,
      deleteCategory: handleDeleteCategory,
      clearApiKey,
      askQuestion,
      loadMessages,
    }),
    [
      analyze,
      askQuestion,
      categories,
      documents,
      clearApiKey,
      deleteDocument,
      handleSaveSettings,
      handleCreateCategory,
      handleDeleteCategory,
      handleUpdateCategory,
      importDocument,
      importProgress,
      isReady,
      loadMessages,
      reload,
      saveDocumentMetadata,
      saveDocumentSummary,
      selectedDocumentId,
      settings,
      stats,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppData must be used inside AppProvider.');
  }

  return context;
}
