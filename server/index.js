import path from 'node:path'
import express from 'express'
import { PORT } from '../config.js'
import { chatRouter } from './routes/chat.js'

const app = express()
const port = PORT ?? 3000

app.use(express.static(path.resolve(process.cwd(), 'public')))
// app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set('view engine', 'ejs')
app.set('views', path.resolve(process.cwd(), 'client'))

app.use('', chatRouter)

app.listen(port, () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
