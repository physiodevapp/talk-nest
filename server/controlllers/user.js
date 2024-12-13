import jwt from 'jsonwebtoken'
import { UserModel } from '../models/user.js'
import { JWT_SECRET_KEY, REFRESH_SECRET_KEY, ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION, NODE_ENV, REFERSH_SECRET_KEY } from '../../config.js'

const generateAccessToken = (user) => jwt.sign(user, JWT_SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRATION })
const generateRefreshToken = (user) => jwt.sign(user, REFRESH_SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRATION })

export class UserController {
  static register = async (req, res) => {
    const { username, email, password } = req.body

    await UserModel.create({ input: { username, email, password } })

    res.redirect('/lobby')
  }

  static login = async (req, res) => {
    const { username, password } = req.body

    try {
      const user = await UserModel.isAuthorised({
        input: { username, password }
      })

      if (user) {
        const accessToken = generateAccessToken({ id: user.id, username: user.username })
        const refreshToken = generateRefreshToken({ id: user.id, username: user.username })

        res
          .cookie('access_token', refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict'
          })
          .json({ accessToken })
      } else {
        res.status(401).redirect('/access?formType=login')
      }
    } catch (error) {
      console.log(error)

      throw new Error('Error while trying to log in')
    }
  }

  static refresh = async (req, res) => {
    const refreshToken = req.cookies.refresh_token

    if (!refreshToken) {
      return res.status(403).send('Token required')
    }

    try {
      const user = jwt.verify(refreshToken, REFERSH_SECRET_KEY)

      const newAccessToken = generateAccessToken({ id: user.id, username: user.username })

      res.json({ accessToken: newAccessToken })
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  static logout = async (req, res) => {
    res
      .clearCookie('refresh_token', {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict'
      })
      .redirect('/access')
  }
}
