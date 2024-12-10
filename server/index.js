import path from 'node:path'
import express from 'express'
import { PORT } from '../config.js'

const app = express()
const port = PORT ?? 3000

app.set('view engine', 'ejs')
app.set('views', path.resolve(process.cwd(), 'client'))

app.get('/', (req, res) => {
  res.render('chat', { user: 'Physiodevapp' })
})

app.listen(port, () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
