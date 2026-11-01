"use client";

const DB_NAME = "teror-mistik";
const DB_VERSION = 1;

export const STORES = [
  "stories",
  "chapters",
  "notes",
  "media",
  "versions",
  "ai_history",
  "progress",
  "profile",
  "blobs",
] as const;

export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          const keyPath = store === "progress" ? "story_id" : "id";
          db.createObjectStore(store, { keyPath });
        }
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Gagal membuka IndexedDB."));
  });

  return dbPromise;
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const objectStore = transaction.objectStore(store);
        let request: IDBRequest<T> | void;
        try {
          request = run(objectStore);
        } catch (error) {
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          if (request) resolve(request.result);
          else resolve(undefined as T);
        };
        transaction.onerror = () => reject(transaction.error ?? new Error("Transaksi gagal."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Transaksi dibatalkan."));
      })
  );
}

export function idbGetAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>).then((r) => r ?? []);
}

export function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbPut<T>(store: StoreName, value: T): Promise<void> {
  return tx<void>(store, "readwrite", (s) => {
    s.put(value as unknown as Record<string, unknown>);
  });
}

export function idbBulkPut<T>(store: StoreName, values: T[]): Promise<void> {
  return tx<void>(store, "readwrite", (s) => {
    for (const value of values) s.put(value as unknown as Record<string, unknown>);
  });
}

export function idbDelete(store: StoreName, key: string): Promise<void> {
  return tx<void>(store, "readwrite", (s) => {
    s.delete(key);
  });
}

export function idbClear(store: StoreName): Promise<void> {
  return tx<void>(store, "readwrite", (s) => {
    s.clear();
  });
}

export async function idbClearAll(): Promise<void> {
  for (const store of STORES) {
    await idbClear(store);
  }
}

export async function idbStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}
