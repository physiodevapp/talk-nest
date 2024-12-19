import { Router } from 'express'

import { UserController } from '../controlllers/user.js'
import { ChatController } from '../controlllers/chat.js'
import { handleUserTokenValidation } from '../middlewares/validate-token.js'
import { socialAuth } from '../middlewares/social-auth.js'

export const chatRouter = Router()

chatRouter.get('/', ChatController.renderHome)

chatRouter.get('/lobby', handleUserTokenValidation, ChatController.renderLobby)

chatRouter.post('/register', UserController.register)
chatRouter.post('/login', UserController.login)
chatRouter.post('/refresh', UserController.refresh)
chatRouter.post('/logout', UserController.logout)
chatRouter.get('/access', UserController.renderAccess)
chatRouter.get('/auth/google', socialAuth.authenticate('google', { scope: ['profile', 'email'] })
)
chatRouter.get('/auth/google/callback', socialAuth.authenticate('google', { session: false, failureRedirect: '/' }), socialAuth.addUserToBody, UserController.login)
