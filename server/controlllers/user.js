import jwt from 'jsonwebtoken'
import { UserModel } from '../models/user.js'
import { JWT_SECRET_KEY, NODE_ENV } from '../../config.js'

export class UserController {
  static register = async (req, res) => {
    const { username, email, password } = req.body

    await UserModel.create({ input: { username, email, password } })

    res.redirect('/lobby')
  }

  static login = async (req, res) => {
    const { username, password } = req.body

    try {
      const user = await UserModel.getByUsername({
        input: { username, password }
      })

      if (user) {
        const token = jwt.sign(user, JWT_SECRET_KEY, { expiresIn: '1h' })

        res
          .cookie('access_token', token, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict'
          })
          .redirect('/lobby')
      } else {
        res.status(401).redirect('/access?formType=login')
      }
    } catch (error) {
      console.log(error)

      throw new Error('Error while trying to log in')
    }
  }

  static logout = async (req, res) => {
    res
      .clearCookie('access_token', {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict'
      })
      .redirect('/access')
  }
}
