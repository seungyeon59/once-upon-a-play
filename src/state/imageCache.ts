const DB_NAME = 'tale-weaver-images'
const STORE = 'backgrounds'

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveBackground(id: string, dataUrl: string): Promise<void> {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}

export async function loadBackground(id: string): Promise<string | undefined> {
  const db = await database()
  try {
    return await new Promise<string | undefined>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : undefined)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}
