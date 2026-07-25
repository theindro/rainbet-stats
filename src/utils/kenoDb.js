const DB_NAME = "BetAnalytics";
const DB_VER = 3;
const KENO_STORE = "kenoResults";

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const tx = e.target.transaction;

      if (!db.objectStoreNames.contains("rows")) {
        const os = db.createObjectStore("rows", { autoIncrement: true });
        os.createIndex("createdAt", "createdAt");
        os.createIndex("game", "game");
        os.createIndex("betId", "betId", { unique: false });
      } else if (e.oldVersion < 3) {
        const os = tx.objectStore("rows");
        if (!os.indexNames.contains("betId")) {
          os.createIndex("betId", "betId", { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(KENO_STORE)) {
        db.createObjectStore(KENO_STORE, { keyPath: "betId" });
      }
    };
    req.onsuccess = (e) => res(e.target.result);
    req.onerror = (e) => rej(e.target.error);
  });
}

export async function getCachedKenoResult(betId) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(KENO_STORE, "readonly");
    const req = tx.objectStore(KENO_STORE).get(betId);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}

export async function cacheKenoResult(result) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(KENO_STORE, "readwrite");
    tx.objectStore(KENO_STORE).put({ ...result, cachedAt: Date.now() });
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

export async function getKenoCacheCount() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(KENO_STORE, "readonly");
    const req = tx.objectStore(KENO_STORE).count();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
