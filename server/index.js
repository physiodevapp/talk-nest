import path from 'node:path'
import express from 'express'
import { PORT } from '../config.js'

const app = express()
const port = PORT ?? 3000

app.use(express.static(path.resolve(process.cwd(), 'public')))

app.set('view engine', 'ejs')
app.set('views', path.resolve(process.cwd(), 'client'))

app.get('/', (req, res) => {
  res.redirect('/lobby')
})
app.get('/lobby', (req, res) => {
  res.render('chat', { user: 'Physiodevapp' })
})
app.get('/access', (req, res) => {
  res.render('access')
})

app.listen(port, () => {
  console.log(`Server is listening at: http://localhost:${port}`)
})
