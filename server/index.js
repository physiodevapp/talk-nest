import path from 'node:path'
import { createServer } from 'node:http'

import express from 'express'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'

import { PORT } from '../config.js'
import { chatRouter } from './routes/routes.js'
import { MessageModel } from './models/message.js'
import { UserModel } from './models/user.js'
import { authenticateSocket, validateUser } from './middlewares/authentication.js'

const port = PORT ?? 3000
const app = express()
const server = createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 60000
  }
})

const globalState = {
  previousUserId: null
}

app.use(express.static(path.resolve(process.cwd(), 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

io.engine.use(cookieParser())
io.use(authenticateSocket)

io.on('connection', async (socket) => {
  const { username } = socket.user
  console.log(`User ${username} has connected`)

  socket.on('disconnect', () => {
    const { username } = socket.user
    console.log(`User ${username} has disconnected`)
  })

  socket.on('chat message', async (message) => {
    console.log('chat message event from server')
    try {
      const { id, username } = validateUser(socket)
      const user = { id, username }

      const messageId = await MessageModel.add({ userId: user.id, message })
      const isSameSender = user.id === globalState.previousUserId

      io.emit('chat message', message, messageId.toString(), user, isSameSender)

      globalState.previousUserId = user.id
    } catch (error) {
      console.error(error.message)

      socket.emit('auth_error', 'Session expired. Please, log in again.')

      socket.disconnect()
    }
  })

  if (!socket.recovered) {
    try {
      const messageId = socket.handshake.auth.serverOffset ?? 0
      const results = await MessageModel.getNewerMessages({ id: messageId })

      if (!results.length) return

      const userIds = [...new Set(results.map(({ user_id: userId }) => userId))]
      const users = await UserModel.getUsersByIds(userIds)
      const userMap = Object.fromEntries(users.map(user => [user.id, user]))

      for (const [index, { id: messageId, message, user_id: userId }] of results.entries()) {
        const user = userMap[userId] || null

        const isFirstMessage = index === 0 || globalState.previousUserId === null
        const isSameSender = !isFirstMessage && userId === globalState.previousUserId

        socket.emit('chat message', message, messageId, user, isSameSender)

        globalState.previousUserId = userId
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
