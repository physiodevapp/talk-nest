import jwt from 'jsonwebtoken'
import { UserModel } from '../models/user.js'
import {
  JWT_SECRET_KEY,
  REFRESH_SECRET_KEY,
  ACCESS_TOKEN_EXPIRATION,
  REFRESH_TOKEN_EXPIRATION,
  NODE_ENV
} from '../../config.js'

const generateAccessToken = (user) =>
  jwt.sign(user, JWT_SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRATION })
const generateRefreshToken = (user) =>
  jwt.sign(user, REFRESH_SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRATION })

export class UserController {
  static register = async (req, res) => {
    const { username, email, password } = req.body

    await UserModel.create({ input: { username, email, password } })

    res.redirect('/access?formType=login')
  }

  static login = async (req, res) => {
    const { username, password } = req.body
    const { isOauth } = req

    try {
      const user = await UserModel.isValid({
        input: { username, password }
      })
      const isLoginFlowValid = user?.isOauth === !!isOauth

      if (user && isLoginFlowValid) {
        const accessToken = generateAccessToken({
          id: user.id,
          username: user.username
        })
        const refreshToken = generateRefreshToken({
          id: user.id
        })

        res
          .cookie('access_token', accessToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000
          })
          .cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
          })
          .redirect('/lobby')
      } else {
        res.status(401).render('access', { formType: 'login', error: 'Invalid credentials' })
      }
    } catch (error) {
      console.log(error)
      if (error.message === 'Invalid username') {
        res.status(401).render('access', { formType: 'login', error: 'Do not have an account' })
      } else if (error.message === 'Invalid password') {
        res.status(401).render('access', { formType: 'login', error: 'Invalid credentials' })
      } else {
        res.status(500).render('access', { formType: 'login', error: 'Server error' })
      }
    }
  }

  static refresh = async (req, res) => {
    const refreshToken = req.cookies.refresh_token

    if (!refreshToken) {
      return res.status(403).send('Token required')
    }

    try {
      const { id } = jwt.verify(refreshToken, REFRESH_SECRET_KEY)

      const user = await UserModel.getById({ id })

      const newAccessToken = generateAccessToken({
        id: user.id,
        username: user.username
      })

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 15 * 60 * 1000
      })

      res.sendStatus(200)
    } catch (error) {
      res.status(403).send('Invalid token')
    }
  }

  static logout = async (req, res) => {
    res
      .clearCookie('access_token', {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'Strict'
      })
      .clearCookie('refresh_token', {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'Strict'
      })
      .redirect('/access')
  }

  static renderAccess = (req, res) => {
    const formType = req.query.formType ?? 'login'

    res.render('access', { formType })
  }
}
