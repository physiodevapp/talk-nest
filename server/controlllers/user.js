import { UserModel } from '../models/user.js'

export class UserController {
  static register = async (req, res) => {
    const { username, email, password } = req.body

    await UserModel.create({ input: { username, email, password } })

    res.redirect('/lobby')
  }
}
