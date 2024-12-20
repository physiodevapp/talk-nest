import path from 'node:path'
import { createServer } from 'node:http'

import express from 'express'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'

import { PORT } from '../config.js'
import { chatRouter } from './routes/routes.js'
import { MessageModel } from './models/message.js'
import { UserModel } from './models/user.js'
import { handleSocketTokenValidation, validateSocketUser } from './middlewares/validate-token.js'
import { socialAuth } from './middlewares/social-auth.js'

const port = PORT ?? 3000
const app = express()
const server = createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 10 * 60 * 1000,
    skipMiddlewares: true
  }
})

app.use(express.static(path.resolve(process.cwd(), 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(socialAuth.initialize())
app.use(cookieParser())

io.engine.use(cookieParser())
io.use(handleSocketTokenValidation)

io.on('connection', async (socket) => {
  console.log('An user has connected')

  socket.on('disconnect', () => {
    console.log('An user has disconnected')
  })

  socket.on('chat message', async (message, messageULID) => {
    try {
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

app.use((req, res, next) => {
  res.status(404).send('Client error')
})

server.listen(port, () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
