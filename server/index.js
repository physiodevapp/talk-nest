import express from 'express'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'
import path from 'node:path'
import { createServer } from 'node:http'

import { EXPRESS_HOST, PORT, MODERATION_MICROSERVICE_URL } from '../config.js'
import { chatRouter } from './routes.js'
import { MessageModel } from './models/message.js'
import { UserModel } from './models/user.js'
import { handleSocketTokenValidation, validateSocketUser } from './middlewares/validate-token.js'
import { socialAuth } from './middlewares/social-auth.js'

// Setting the port
const port = PORT ?? 3000

// Initializing Express App
const app = express()
const server = createServer(app)

// Setting up Socket.IO
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 10 * 60 * 1000,
    skipMiddlewares: true
  }
})

// Middlewares
app.use(express.static(path.resolve(process.cwd(), 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(socialAuth.initialize())
app.use(cookieParser())

io.engine.use(cookieParser())
io.use(handleSocketTokenValidation)

io.on('connection', async (socket) => {
  console.info('An user has connected')

  socket.on('disconnect', () => {
    console.info('An user has disconnected')
  })

  socket.on('chat message', async (message, messageULID) => {
    try {
      const moderatorResponse = await fetch(`${MODERATION_MICROSERVICE_URL}/moderation/validate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      })

      if (!moderatorResponse.ok) {
        throw new Error('An error ocurred in the moderation service')
      }

      const moderatorResponseSResult = await moderatorResponse.json()

      if (!moderatorResponseSResult.valid) {
        return socket.emit('moderation_error', { message: 'Message not approved by the moderator', messageULID })
      }

      const { id, username } = validateSocketUser(socket)
      const user = { id, username }

      const messageId = await MessageModel.add({ userId: user.id, message, createdULID: messageULID })

      io.emit('chat message', message, messageULID, user, messageId)
    } catch (error) {
      if (['Invalid token', 'Token required', 'Token expired'].includes(error.message)) {
        socket.emit('auth_error', 'Invalid token')
      } else if (['DB Error: duplicated'].includes(message.error)) {
        socket.emit('db_error', { message: 'Message duplicated', messageULID })
      }
    }
  })

  if (!socket.recovered) {
    try {
      const messageId = socket.handshake.auth.serverOffset ?? 0
      const results = await MessageModel.getNewerMessages({ id: messageId })

      if (!results.length) return

      const userIds = [...new Set(results.map(({ user_id: userId }) => userId))]
      const users = await UserModel.getAllById(userIds)
      const userMap = Object.fromEntries(users.map(user => [user.id, user]))

      for (const { created_ulid: createdULID, message, user_id: userId } of results) {
        const user = userMap[userId] || null

        socket.emit('chat message', message, createdULID, user, messageId)
      }
    } catch (error) {
      console.error(error)
    }
  }
})

app.set('view engine', 'ejs')
app.set('views', path.resolve(process.cwd(), 'client'))

app.use('', chatRouter)

// Middleware for handling 404 errors
app.use((req, res, next) => {
  res.status(404).send('Client error')
})

// Start the server
server.listen(port, EXPRESS_HOST ?? 'localhost', () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
