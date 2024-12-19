import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { UserModel } from '../models/user.js'
import { GOOGLE_CALLBACK_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../../config.js'

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  const result = {
    password: profile.id,
    email: profile.emails[0].value,
    username: profile.displayName
  }
  const { username, email, password } = result

  const user = await UserModel.isValid({ username, password })
  if (!user) {
    const newUser = await UserModel.create({ input: { username, email, password } })

    return done(null, newUser)
  }

  return done(null, user)
}))

const addUserToBody = (req, res, next) => {
  if (!req.user) {
    return res.status(400).json({ error: 'No user found in request' })
  }

  const user = req.user
  req.body.username = user.username
  req.body.password = user.password

  next()
}

export const socialAuth = passport
socialAuth.addUserToBody = addUserToBody
