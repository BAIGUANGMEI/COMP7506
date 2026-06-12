const DB_NAME = 'studyvault-web-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const URI_PREFIX = 'webfile://studyvault/';

interface StoredWebFile {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: string;
}

export function createWebFileUri(id: string): string {
  return `${URI_PREFIX}${encodeURIComponent(id)}`;
}

export function isWebStoredFileUri(uri: string | null | undefined): uri is string {
  return Boolean(uri?.startsWith(URI_PREFIX));
}

export async function storeWebFile(input: {
  id: string;
  name: string;
  type: string;
  blob: Blob;
}): Promise<string> {
  const db = await openDatabase();
  const record: StoredWebFile = {
    id: input.id,
    name: input.name,
    type: input.type,
    blob: input.blob,
    createdAt: new Date().toISOString(),
  };

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    await waitForTransaction(transaction);
    return createWebFileUri(input.id);
  } finally {
    db.close();
  }
}

export async function readWebStoredBlob(uri: string): Promise<Blob> {
  const id = parseWebFileUri(uri);
  const db = await openDatabase();

  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const record = await requestToPromise<StoredWebFile | undefined>(transaction.objectStore(STORE_NAME).get(id));
    await waitForTransaction(transaction);

    if (!record?.blob) {
      throw new Error('The imported file is no longer available in browser storage. Please import it again.');
    }

    return record.blob;
  } finally {
    db.close();
  }
}

export async function readWebStoredText(uri: string): Promise<string> {
  const blob = await readWebStoredBlob(uri);
  return blob.text();
}

export async function deleteWebStoredFile(uri: string): Promise<void> {
  const id = parseWebFileUri(uri);
  const db = await openDatabase();

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction);
  } finally {
    db.close();
  }
}

function parseWebFileUri(uri: string): string {
  if (!isWebStoredFileUri(uri)) {
    throw new Error('Invalid browser file URI.');
  }

  return decodeURIComponent(uri.slice(URI_PREFIX.length));
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Browser file storage is not available.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onerror = () => reject(request.error ?? new Error('Could not open browser file storage.'));
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('Browser storage request failed.'));
    request.onsuccess = () => resolve(request.result);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Browser storage transaction failed.'));
    transaction.oncomplete = () => resolve();
  });
}
