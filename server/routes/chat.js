import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { UserController } from '../controlllers/user.js'
import { JWT_SECRET_KEY } from '../../config.js'

export const chatRouter = Router()

chatRouter.get('/', (req, res) => {
  res.redirect('/lobby')
})

chatRouter.get('/lobby', (req, res) => {
  const token = req.cookies.access_token

  if (!token) return res.status(401).redirect('/access')

  const user = jwt.verify(token, JWT_SECRET_KEY)

  if (!user) return res.status(401).redirect('/access')

  res.status(200).render('chat', { user: user.username })
})

chatRouter.post('/register', UserController.register)
chatRouter.post('/login', UserController.login)
chatRouter.get('/access', (req, res) => {
  const formType = req.query.formType ?? 'register'

  res.render('access', { formType })
})
