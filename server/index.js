import path from 'node:path'
import { createServer } from 'node:http'

import express from 'express'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'

import { PORT } from '../config.js'
import { chatRouter } from './routes/chat.js'
import { MessageModel } from './models/message.js'
import { UserModel } from './models/user.js'

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

io.on('connection', async (socket) => {
  console.log('An user has connected')

  socket.on('disconnect', () => {
    console.log('An user has disconnected')
  })

  socket.on('chat message', async (message) => {
    let messageId
    const user = socket.handshake.auth.user ?? null

    if (!user?.username) throw new Error('Unknown user')

    try {
      messageId = await MessageModel.add({ userId: user.id, message })
    } catch (error) {
      console.error(error.message)

      return
    }

    const isSameSender = user.id === globalState.previousUserId

    io.emit('chat message', message, messageId.toString(), user, isSameSender)

    globalState.previousUserId = user.id
  })

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

        const isSameSender = userId === globalState.previousUserId

        socket.emit('chat message', message, messageId, user, isSameSender)

        globalState.previousUserId = userId
      }
    } catch (error) {
      console.error(error)
    }
  }
})

app.use(express.static(path.resolve(process.cwd(), 'public')))
// app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.set('view engine', 'ejs')
app.set('views', path.resolve(process.cwd(), 'client'))

app.use('', chatRouter)

app.use((req, res, next) => {
  res.status(404).send('Client error')
})

server.listen(port, () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
