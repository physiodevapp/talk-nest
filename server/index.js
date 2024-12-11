import path from 'node:path'

import express from 'express'
import { PORT } from '../config.js'
import { chatRouter } from './routes/chat.js'
import cookieParser from 'cookie-parser'

const app = express()
const port = PORT ?? 3000

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

app.listen(port, () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
