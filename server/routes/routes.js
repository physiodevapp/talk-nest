import { Router } from 'express'

import { UserController } from '../controlllers/user.js'
import { ChatController } from '../controlllers/chat.js'
import { authenticateUser } from '../middlewares/authentication.js'

export const chatRouter = Router()

chatRouter.get('/', ChatController.renderHome)

chatRouter.get('/lobby', authenticateUser, ChatController.renderLobby)

chatRouter.post('/register', UserController.register)
chatRouter.post('/login', UserController.login)
chatRouter.post('/refresh', UserController.refresh)
chatRouter.post('/logout', UserController.logout)
chatRouter.get('/access', UserController.renderAccess)
