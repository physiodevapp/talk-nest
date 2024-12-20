import { io } from 'https://cdn.socket.io/4.8.1/socket.io.esm.min.js'

import { currentUser } from '../../../../../js/globals.js'
import { addMessageToUI, resetFormAndMessages, updateMessageInUI } from './chat.js'
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
    console.info('--> client on connect')
    await resendPendingMessages(socket)
  })

  socket.on('connect_error', async (error) => {
    if (['Invalid token', 'Token required', 'Token expired'].includes(error.message)) {
      console.info('--> client on connect_error -> Trying to renew the token...', error.message)
      await handleTokenRefresh()
    }
  })

  socket.on('auth_error', async (error) => {
    console.info('--> client auth_error -> Trying to renew the token...', error)
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
}

connectToSocket()
