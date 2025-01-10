import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js'

import { currentUser } from '../../../../../js/globals.js'
import { addMessageToUI, blockMessageInUI, resetFormAndMessages, updateMessageInUI } from './chat.js'
import { deleteMessage, messageExists, resendPendingMessages } from './local-db.js'

const handleTokenRefresh = async () => {
  const refreshed = await refreshAccessToken()

  if (!refreshed) {
    window.location.href = '/access'
  }
}

const refreshAccessToken = async () => {
  try {
    const response = await fetch('/refresh', {
      method: 'POST',
      credentials: 'include'
    })

    if (response.ok) {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('Trying to renew the token failed')

    return false
  }
}

const connectToSocket = async () => {
  const socket = io({
    auth: {
      token: 'USE_COOKIE',
      serverOffset: 0
    }
  })

  if (socket) {
    resetFormAndMessages(socket)
  }

  socket.on('chat message', async (message, messageULID, user, messageId) => {
    let isInLocalStore
    const isCurrentUser = user?.id === currentUser.id

    try {
      isInLocalStore = await messageExists(messageULID)
    } catch (error) {
      isInLocalStore = false
    }
    const isMessageRendered = isCurrentUser && isInLocalStore

    if (!isMessageRendered) {
      addMessageToUI(message, messageULID, isCurrentUser, false, user?.id)
    } else {
      await deleteMessage(messageULID)

      updateMessageInUI(message, messageULID)
    }

    socket.auth.serverOffset = messageId
  })

  socket.on('connect', async () => {
    await resendPendingMessages(socket)
  })

  socket.on('connect_error', async (error) => {
    if (['Invalid token', 'Token required', 'Token expired'].includes(error.message)) {
      await handleTokenRefresh()
    }
  })

  socket.on('auth_error', async () => {
    socket.disconnect()

    await handleTokenRefresh()

    socket.connect()
  })

  socket.on('db_error', async (error) => {
    if (['Message duplicated'].includes(error.message)) {
      socket.disconnect()

      await deleteMessage(error.messageULID)

      socket.connect()
    }
  })

  socket.on('moderation_error', async (error) => {
    blockMessageInUI(error.messageULID)
    await deleteMessage(error.messageULID)
  })
}

connectToSocket()
