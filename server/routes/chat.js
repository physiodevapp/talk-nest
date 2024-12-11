import { Router } from 'express'
import { UserController } from '../controlllers/user.js'

export const chatRouter = Router()

chatRouter.get('/', (req, res) => {
  res.redirect('/lobby')
})

chatRouter.get('/lobby', (req, res) => {
  res.render('chat', { user: 'PhysiodevchatRouter' })
})

chatRouter.post('/register', UserController.register)
chatRouter.get('/access', (req, res) => {
  const formType = req.query.formType || 'register'

  res.render('access', { formType })
})
