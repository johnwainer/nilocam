// IndexedDB-based offline upload queue.
// Photos are stored as processed blobs so filters/templates are already applied
// and don't need to be re-run on retry.

export type QueuedUpload = {
  id: string;
  eventId: string;
  blob: Blob;
  path: string; // pre-assigned storage path
  payload: Record<string, unknown>; // photos table insert payload
  moderationMode: "auto" | "manual";
  queuedAt: string;
};

const DB_NAME = "memorica-queue";
const STORE = "uploads";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("eventId", "eventId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueUpload(item: QueuedUpload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedUploads(eventId: string): Promise<QueuedUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).index("eventId").getAll(eventId);
    req.onsuccess = () => resolve(req.result as QueuedUpload[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedUpload(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countQueuedUploads(eventId: string): Promise<number> {
  const items = await getQueuedUploads(eventId).catch(() => []);
  return items.length;
}

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    !navigator.onLine ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    err instanceof TypeError
  );
}
