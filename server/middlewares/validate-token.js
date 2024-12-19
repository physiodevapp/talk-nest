import jwt from 'jsonwebtoken'

import { JWT_SECRET_KEY } from '../../config.js'

export const handleUserTokenValidation = (req, res, next) => {
  const token = req.cookies.access_token

  if (!token) return res.status(401).redirect('/access')

  try {
    const user = verifyToken(token, JWT_SECRET_KEY)

    req.user = user

    next()
  } catch (error) {
    res.status(403).redirect('/access')
  }
}

export const handleSocketTokenValidation = async (socket, next) => {
  try {
    const { id, username } = validateSocketUser(socket)

    socket.user = { id, username }

    next()
  } catch (error) {
    return next(new Error(error.message))
  }
}

export const validateSocketUser = (socket) => {
  const { access_token: accessToken } = socket.request.cookies

  if (!accessToken) {
    throw new Error('Token required')
  }

  return verifyToken(accessToken, JWT_SECRET_KEY)
}

export const verifyToken = (token, secretKey) => {
  if (!token) throw new Error('Token required')

  try {
    return jwt.verify(token, secretKey)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired')
    } else {
      throw new Error('Invalid token')
    }
  }
}
