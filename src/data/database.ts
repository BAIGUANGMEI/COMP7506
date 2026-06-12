import * as SQLite from 'expo-sqlite';

import type {
  AnalysisStatus,
  Category,
  Citation,
  Conversation,
  ConversationMessage,
  DocumentChunk,
  DocumentRecord,
  DocumentSummary,
  FileType,
  ImportStatus,
  LibraryStats,
} from '@/domain/types';
import { createId } from '@/utils/ids';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

type DocumentRow = Omit<DocumentRecord, 'fileType' | 'tags' | 'importStatus' | 'analysisStatus'> & {
  fileType: string;
  tags: string;
  importStatus: string;
  analysisStatus: string;
};

type SummaryRow = Omit<DocumentSummary, 'keyPoints' | 'outline' | 'terms'> & {
  keyPoints: string;
  outline: string;
  terms: string;
};

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync('studyvault.db');
  const db = await databasePromise;
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      fileType TEXT NOT NULL,
      localUri TEXT NOT NULL,
      categoryId TEXT,
      tags TEXT NOT NULL,
      importStatus TEXT NOT NULL,
      analysisStatus TEXT NOT NULL,
      sizeLabel TEXT NOT NULL,
      sourceName TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      analyzedAt TEXT,
      notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY NOT NULL,
      documentId TEXT NOT NULL,
      pageNumber INTEGER,
      heading TEXT,
      text TEXT NOT NULL,
      tokenEstimate INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summaries (
      documentId TEXT PRIMARY KEY NOT NULL,
      overview TEXT NOT NULL,
      keyPoints TEXT NOT NULL,
      outline TEXT NOT NULL,
      terms TEXT NOT NULL,
      readingGuide TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      documentId TEXT,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await ensureFtsIndex(db);

  await seedDatabase(db);
}

async function ensureFtsIndex(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        text,
        heading,
        content='chunks',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunks_fts(rowid, text, heading) VALUES (new.rowid, new.text, new.heading);
      END;

      CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
        INSERT INTO chunks_fts(chunks_fts, rowid, text, heading) VALUES('delete', old.rowid, old.text, old.heading);
      END;

      CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
        INSERT INTO chunks_fts(chunks_fts, rowid, text, heading) VALUES('delete', old.rowid, old.text, old.heading);
        INSERT INTO chunks_fts(rowid, text, heading) VALUES (new.rowid, new.text, new.heading);
      END;
    `);
  } catch {
    // Expo SQLite on web may run without FTS5. The Q&A path falls back to LIKE search.
  }
}

async function seedDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const seedState = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', 'demoSeeded');
  if (seedState?.value === 'true') {
    return;
  }

  const existingDocuments = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM documents');
  if (existingDocuments?.count) {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      'demoSeeded',
      'true',
    );
    return;
  }

  const existingCategories = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');

  if (!existingCategories?.count) {
    const categories = [
      ['cat_cs', 'Computer Science', '#2563EB', 'book-open-variant', 1],
      ['cat_math', 'Mathematics', '#2FB85B', 'flask-outline', 2],
      ['cat_ml', 'Machine Learning', '#F68B1F', 'chart-bar', 3],
      ['cat_econ', 'Economics', '#7B4CE3', 'web', 4],
    ] as const;

    for (const category of categories) {
      await db.runAsync(
        'INSERT INTO categories (id, name, color, icon, sortOrder) VALUES (?, ?, ?, ?, ?)',
        ...category,
      );
    }
  }

  const now = new Date();
  const demoDocuments: Array<{
    title: string;
    fileType: FileType;
    categoryId: string;
    sizeLabel: string;
    status: AnalysisStatus;
    tags: string[];
    overview: string;
    keyPoints: string[];
  }> = [
    {
      title: 'Deep Learning, Chapter 6.pdf',
      fileType: 'pdf',
      categoryId: 'cat_ml',
      sizeLabel: '12.4 MB',
      status: 'analyzed',
      tags: ['neural networks', 'backprop'],
      overview: 'Chapter 6 introduces feedforward neural networks, loss functions, and backpropagation as the core training loop for deep models.',
      keyPoints: ['Understand computational graphs before studying backpropagation.', 'Compare activation functions by gradient behavior.', 'Use regularization to reduce overfitting.'],
    },
    {
      title: 'Linear Algebra Final Review.docx',
      fileType: 'docx',
      categoryId: 'cat_math',
      sizeLabel: '1.8 MB',
      status: 'analyzed',
      tags: ['matrix', 'exam'],
      overview: 'A compact review of vector spaces, linear maps, eigenvalues, and matrix factorization for final exam preparation.',
      keyPoints: ['Revisit rank-nullity theorem.', 'Practice diagonalization conditions.', 'Connect orthogonality with projections.'],
    },
    {
      title: 'Attention Mechanism Notes.md',
      fileType: 'md',
      categoryId: 'cat_ml',
      sizeLabel: '284 KB',
      status: 'analyzed',
      tags: ['transformer', 'attention'],
      overview: 'These notes explain scaled dot-product attention, multi-head attention, and how transformers use positional information.',
      keyPoints: ['Attention weights expose token relevance.', 'Scaling stabilizes softmax gradients.', 'Multi-head attention learns multiple relation spaces.'],
    },
    {
      title: 'Operating Systems Key Points.txt',
      fileType: 'txt',
      categoryId: 'cat_cs',
      sizeLabel: '68 KB',
      status: 'queued',
      tags: ['process', 'memory'],
      overview: 'Imported locally and waiting for analysis.',
      keyPoints: ['Configure Kimi API or tap Analyze to generate a summary.'],
    },
  ];

  for (const [index, doc] of demoDocuments.entries()) {
    const documentId = createId('doc');
    const createdAt = new Date(now.getTime() - index * 60 * 60 * 1000).toISOString();
    await insertDocument(db, {
      id: documentId,
      title: doc.title,
      fileType: doc.fileType,
      localUri: `demo://${documentId}`,
      categoryId: doc.categoryId,
      tags: doc.tags,
      importStatus: 'imported',
      analysisStatus: doc.status,
      sizeLabel: doc.sizeLabel,
      sourceName: doc.title,
      createdAt,
      updatedAt: createdAt,
      analyzedAt: doc.status === 'analyzed' ? createdAt : null,
      notes: '',
    });

    const chunks = doc.keyPoints.map((point, chunkIndex) => ({
      id: createId('chunk'),
      documentId,
      pageNumber: doc.fileType === 'pdf' ? chunkIndex + 1 : null,
      heading: `Demo source ${chunkIndex + 1}`,
      text: `${doc.overview}\n\n${point}`,
      tokenEstimate: 80,
    }));
    await replaceChunks(db, documentId, chunks);

    await saveSummary(db, {
      documentId,
      overview: doc.overview,
      keyPoints: doc.keyPoints,
      outline: ['Core concepts', 'Worked examples', 'Review checklist'],
      terms: doc.tags,
      readingGuide: 'Skim the outline, read the key points, then ask a question from the Q&A tab.',
      updatedAt: createdAt,
    });
  }

  await db.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    'demoSeeded',
    'true',
  );
}

export async function listCategories(db: SQLite.SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    `
    SELECT
      c.id,
      c.name,
      c.color,
      c.icon,
      c.sortOrder,
      COUNT(d.id) as documentCount
    FROM categories c
    LEFT JOIN documents d ON d.categoryId = c.id
    GROUP BY c.id
    ORDER BY c.sortOrder ASC
    `,
  );
}

export async function createCategory(
  db: SQLite.SQLiteDatabase,
  input: { name: string; color?: string; icon?: string },
): Promise<Category> {
  const row = await db.getFirstAsync<{ maxOrder: number | null }>('SELECT MAX(sortOrder) as maxOrder FROM categories');
  const category: Category = {
    id: createId('cat'),
    name: input.name.trim(),
    color: input.color ?? '#2563EB',
    icon: input.icon ?? 'folder-outline',
    sortOrder: (row?.maxOrder ?? 0) + 1,
    documentCount: 0,
  };

  await db.runAsync(
    'INSERT INTO categories (id, name, color, icon, sortOrder) VALUES (?, ?, ?, ?, ?)',
    category.id,
    category.name,
    category.color,
    category.icon,
    category.sortOrder,
  );

  return category;
}

export async function updateCategory(
  db: SQLite.SQLiteDatabase,
  categoryId: string,
  input: { name: string; color: string; icon: string },
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
    input.name.trim(),
    input.color,
    input.icon,
    categoryId,
  );
}

export async function deleteCategory(db: SQLite.SQLiteDatabase, categoryId: string): Promise<void> {
  await db.runAsync('UPDATE documents SET categoryId = NULL, updatedAt = ? WHERE categoryId = ?', new Date().toISOString(), categoryId);
  await db.runAsync('DELETE FROM categories WHERE id = ?', categoryId);
}

export async function listDocuments(db: SQLite.SQLiteDatabase): Promise<DocumentRecord[]> {
  const rows = await db.getAllAsync<DocumentRow>('SELECT * FROM documents ORDER BY updatedAt DESC');
  return rows.map(rowToDocument);
}

export async function getDocument(db: SQLite.SQLiteDatabase, id: string): Promise<DocumentRecord | null> {
  const row = await db.getFirstAsync<DocumentRow>('SELECT * FROM documents WHERE id = ?', id);
  return row ? rowToDocument(row) : null;
}

export async function insertDocument(db: SQLite.SQLiteDatabase, document: DocumentRecord): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO documents (
      id, title, fileType, localUri, categoryId, tags, importStatus, analysisStatus,
      sizeLabel, sourceName, createdAt, updatedAt, analyzedAt, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    document.id,
    document.title,
    document.fileType,
    document.localUri,
    document.categoryId,
    JSON.stringify(document.tags),
    document.importStatus,
    document.analysisStatus,
    document.sizeLabel,
    document.sourceName,
    document.createdAt,
    document.updatedAt,
    document.analyzedAt,
    document.notes,
  );
}

export async function updateDocumentStatus(
  db: SQLite.SQLiteDatabase,
  documentId: string,
  status: {
    importStatus?: ImportStatus;
    analysisStatus?: AnalysisStatus;
    notes?: string;
    analyzedAt?: string | null;
  },
): Promise<void> {
  const document = await getDocument(db, documentId);
  if (!document) {
    return;
  }

  await db.runAsync(
    `
    UPDATE documents
    SET importStatus = ?, analysisStatus = ?, notes = ?, analyzedAt = ?, updatedAt = ?
    WHERE id = ?
    `,
    status.importStatus ?? document.importStatus,
    status.analysisStatus ?? document.analysisStatus,
    status.notes ?? document.notes,
    status.analyzedAt === undefined ? document.analyzedAt : status.analyzedAt,
    new Date().toISOString(),
    documentId,
  );
}

export async function updateDocumentMetadata(
  db: SQLite.SQLiteDatabase,
  documentId: string,
  input: { title: string; categoryId: string | null; tags: string[]; notes: string },
): Promise<void> {
  await db.runAsync(
    `
    UPDATE documents
    SET title = ?, categoryId = ?, tags = ?, notes = ?, updatedAt = ?
    WHERE id = ?
    `,
    input.title,
    input.categoryId,
    JSON.stringify(input.tags),
    input.notes,
    new Date().toISOString(),
    documentId,
  );
}

export async function deleteDocumentData(db: SQLite.SQLiteDatabase, documentId: string): Promise<void> {
  const conversations = await db.getAllAsync<{ id: string }>('SELECT id FROM conversations WHERE documentId = ?', documentId);

  for (const conversation of conversations) {
    await db.runAsync('DELETE FROM messages WHERE conversationId = ?', conversation.id);
  }

  await db.runAsync('DELETE FROM conversations WHERE documentId = ?', documentId);
  await db.runAsync('DELETE FROM summaries WHERE documentId = ?', documentId);
  await db.runAsync('DELETE FROM chunks WHERE documentId = ?', documentId);
  await db.runAsync('DELETE FROM documents WHERE id = ?', documentId);
}

export async function getLibraryStats(db: SQLite.SQLiteDatabase): Promise<LibraryStats> {
  const row = await db.getFirstAsync<{
    totalDocuments: number;
    analyzed: number;
    pending: number;
    annotations: number;
  }>(
    `
    SELECT
      COUNT(*) as totalDocuments,
      SUM(CASE WHEN analysisStatus = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
      SUM(CASE WHEN analysisStatus IN ('queued', 'analyzing', 'not_analyzed') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN notes != '' THEN 1 ELSE 0 END) as annotations
    FROM documents
    `,
  );

  return {
    totalDocuments: row?.totalDocuments ?? 0,
    analyzed: row?.analyzed ?? 0,
    pending: row?.pending ?? 0,
    annotations: row?.annotations ?? 0,
  };
}

export async function replaceChunks(
  db: SQLite.SQLiteDatabase,
  documentId: string,
  chunks: DocumentChunk[],
): Promise<void> {
  await db.runAsync('DELETE FROM chunks WHERE documentId = ?', documentId);

  for (const chunk of chunks) {
    await db.runAsync(
      'INSERT INTO chunks (id, documentId, pageNumber, heading, text, tokenEstimate) VALUES (?, ?, ?, ?, ?, ?)',
      chunk.id,
      documentId,
      chunk.pageNumber ?? null,
      chunk.heading ?? null,
      chunk.text,
      chunk.tokenEstimate,
    );
  }
}

export async function listChunks(db: SQLite.SQLiteDatabase, documentId: string): Promise<DocumentChunk[]> {
  return db.getAllAsync<DocumentChunk>('SELECT * FROM chunks WHERE documentId = ? ORDER BY pageNumber, rowid', documentId);
}

export async function searchChunks(
  db: SQLite.SQLiteDatabase,
  documentId: string,
  query: string,
): Promise<DocumentChunk[]> {
  const normalized = query
    .split(/\s+/)
    .map((term) => term.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, ''))
    .filter((term) => term.length > 2)
    .slice(0, 6)
    .map((term) => `${term}*`)
    .join(' OR ');

  if (!normalized) {
    return listChunks(db, documentId);
  }

  try {
    return await db.getAllAsync<DocumentChunk>(
      `
      SELECT c.*
      FROM chunks_fts f
      JOIN chunks c ON c.rowid = f.rowid
      WHERE chunks_fts MATCH ? AND c.documentId = ?
      LIMIT 8
      `,
      normalized,
      documentId,
    );
  } catch {
    const like = `%${query.trim()}%`;
    return db.getAllAsync<DocumentChunk>(
      `
      SELECT *
      FROM chunks
      WHERE documentId = ? AND (text LIKE ? OR heading LIKE ?)
      LIMIT 8
      `,
      documentId,
      like,
      like,
    );
  }
}

export async function saveSummary(db: SQLite.SQLiteDatabase, summary: DocumentSummary): Promise<void> {
  await db.runAsync(
    `
    INSERT OR REPLACE INTO summaries (
      documentId, overview, keyPoints, outline, terms, readingGuide, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    summary.documentId,
    summary.overview,
    JSON.stringify(summary.keyPoints),
    JSON.stringify(summary.outline),
    JSON.stringify(summary.terms),
    summary.readingGuide,
    summary.updatedAt,
  );
}

export async function getSummary(db: SQLite.SQLiteDatabase, documentId: string): Promise<DocumentSummary | null> {
  const row = await db.getFirstAsync<SummaryRow>('SELECT * FROM summaries WHERE documentId = ?', documentId);
  return row
    ? {
        ...row,
        keyPoints: parseJsonArray(row.keyPoints),
        outline: parseJsonArray(row.outline),
        terms: parseJsonArray(row.terms),
      }
    : null;
}

export async function getOrCreateConversation(
  db: SQLite.SQLiteDatabase,
  documentId: string | null,
): Promise<Conversation> {
  const existing = await db.getFirstAsync<Conversation>(
    'SELECT * FROM conversations WHERE documentId IS ? ORDER BY updatedAt DESC LIMIT 1',
    documentId,
  );

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: createId('conv'),
    documentId,
    title: 'Document Q&A',
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    'INSERT INTO conversations (id, documentId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    conversation.id,
    conversation.documentId,
    conversation.title,
    conversation.createdAt,
    conversation.updatedAt,
  );

  return conversation;
}

export async function listMessages(
  db: SQLite.SQLiteDatabase,
  conversationId: string,
): Promise<ConversationMessage[]> {
  const rows = await db.getAllAsync<Omit<ConversationMessage, 'citations'> & { citations: string }>(
    'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC',
    conversationId,
  );

  return rows.map((row) => ({
    ...row,
    citations: parseCitations(row.citations),
  }));
}

export async function addMessage(db: SQLite.SQLiteDatabase, message: ConversationMessage): Promise<void> {
  await db.runAsync(
    'INSERT INTO messages (id, conversationId, role, content, citations, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    message.id,
    message.conversationId,
    message.role,
    message.content,
    JSON.stringify(message.citations),
    message.createdAt,
  );

  await db.runAsync('UPDATE conversations SET updatedAt = ? WHERE id = ?', message.createdAt, message.conversationId);
}

function rowToDocument(row: DocumentRow): DocumentRecord {
  return {
    ...row,
    fileType: row.fileType as FileType,
    tags: parseJsonArray(row.tags),
    importStatus: row.importStatus as ImportStatus,
    analysisStatus: row.analysisStatus as AnalysisStatus,
  };
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseCitations(value: string): Citation[] {
  try {
    const parsed = JSON.parse(value) as Citation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
