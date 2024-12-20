/* global indexedDB */

const retryQueue = []

if (!('indexedDB' in window)) {
  console.error('IndexedDB is not available')
}

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatDB', 1)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      const objectStore = db.createObjectStore('messages', { keyPath: 'id' })
      objectStore.createIndex('status', 'status', { unique: false })
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

export const saveMessage = async (messageULID, message) => {
  const db = await openDB()
  const transaction = db.transaction('messages', 'readwrite')
  const store = transaction.objectStore('messages')

  const data = {
    id: messageULID,
    content: message,
    status: 'pending'
  }

  store.add(data)
  transaction.oncomplete = () => {
    console.log('Message saved to IndexedDB')
  }
  transaction.onerror = () => {
    console.error('Error while saving the message, added to the retryQueue')
    retryQueue.push(data)
    retrySaveMessage()
  }
}

const retrySaveMessage = async () => {
  while (retryQueue.length > 0) {
    const db = await openDB()
    const transaction = db.transaction('messages', 'readwrite')
    const store = transaction.objectStore('messages')

    const message = retryQueue.shift()

    try {
      store.add(message)
      transaction.oncomplete = () => {
        console.log(`Retry successfull: ${message.id} saved`)
      }
    } catch (error) {
      console.error(`Retry failed for: ${message.id}, reinserting to the queue`)
      retryQueue.push(message)
      break
    }
  }

  if (retryQueue.length > 0) {
    setTimeout(retrySaveMessage, 5000)
  }
}

export const messageExists = async (id) => {
  const db = await openDB()
  const transaction = db.transaction('messages', 'readonly')
  const store = transaction.objectStore('messages')

  return new Promise((resolve, reject) => {
    const request = store.get(id)

    request.onsuccess = () => {
      resolve(!!request.result)
    }

    request.onerror = () => {
      console.error('Error al buscar el mensaje:', request.error)
      reject(request.error)
    }
  })
}

export const resendPendingMessages = async (socket) => {
  const db = await openDB()
  const transaction = db.transaction('messages', 'readonly')
  const store = transaction.objectStore('messages')
  const index = store.index('status')

  const pendingMessages = []
  index.openCursor('pending').onsuccess = (event) => {
    const cursor = event.target.result
    if (cursor) {
      pendingMessages.push(cursor.value)
      cursor.continue()
    } else {
      console.log('Pending messages found:', pendingMessages)

      pendingMessages.forEach(async (message) => {
        try {
          socket.emit('chat message', message.content, message.id)
        } catch (error) {
          console.error('Error while sending the message:', message.id)
        }
      })
    }
  }
}

export const deleteMessage = async (id) => {
  const db = await openDB()
  const transaction = db.transaction('messages', 'readwrite')
  const store = transaction.objectStore('messages')

  store.delete(id)
  console.log(`Mensaje ${id} eliminado de IndexedDB`)
}
