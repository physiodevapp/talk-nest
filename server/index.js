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
    maxDisconnectionDuration: 10 * 60 * 1000,
    skipMiddlewares: true
  }
})

app.use(express.static(path.resolve(process.cwd(), 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

io.engine.use(cookieParser())
io.use(authenticateSocket)

io.on('connection', async (socket) => {
  console.log('An user has connected')
  // console.log(socket)

  socket.on('disconnect', () => {
    console.log('An user has disconnected')
    // console.log(socket)
  })

  socket.on('chat message', async (message, tempId) => {
    console.log('++ server -> on chat message : ', message, ' - ', tempId)
    try {
      const { id, username } = validateUser(socket)
      const user = { id, username }

      const messageId = await MessageModel.add({ userId: user.id, message, createdULID: tempId })

      io.emit('chat message', message, messageId.toString(), user, tempId)
    } catch (error) {
      console.error('++ server -> auth_error ? --> ', error.message)
      if (['Invalid token', 'Token required', 'Token expired'].includes(error.message)) {
        socket.emit('auth_error', 'Invalid token')
      }
    }
  })

  console.log('++ server -> on connect socket recovered ?', socket.recovered, '-> serverOffset: ', socket.handshake.auth.serverOffset)
  if (!socket.recovered) {
    try {
      const messageId = socket.handshake.auth.serverOffset ?? 0
      const results = await MessageModel.getNewerMessages({ id: messageId })

      if (!results.length) return

      const userIds = [...new Set(results.map(({ user_id: userId }) => userId))]
      const users = await UserModel.getUsersByIds(userIds)
      const userMap = Object.fromEntries(users.map(user => [user.id, user]))

      for (const { id: messageId, message, user_id: userId } of results) {
        const user = userMap[userId] || null

        socket.emit('chat message', message, messageId, user)
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
