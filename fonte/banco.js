export default async esquema => {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(esquema)))
  const nome = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
  const request = indexedDB.open(nome, 1)
  request.onupgradeneeded = (event) => {
    const db = event.target.result
    esquema.objectStores.forEach(store => {
      db.createObjectStore(store.name)
    })
  }
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      resolve(event.target.result)
    }
    request.onerror = (event) => {
      reject(event.target.error)
    }
  })
}
