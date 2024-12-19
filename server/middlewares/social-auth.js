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
    username: profile.displayName,
    email: profile.emails[0]?.value,
    password: profile.id
  }
  const { username, email, password } = result

  try {
    const user = await UserModel.isValid({ input: { username, password } })

    return done(null, { username: user.username, password, isOauth: true })
  } catch (error) {
    try {
      if (error.message === 'Invalid username') {
        const newUser = await UserModel.create({ input: { username, email, password }, isOauth: true })

        return done(null, { username: newUser.username, password, isOauth: true })
      }

      return done(error, false)
    } catch (createError) {
      return done(createError, false)
    }
  }
}))

const addUserToBody = (req, res, next) => {
  if (req.user) {
    const user = req.user
    req.body.username = user.username
    req.body.password = user.password

    req.isOauth = true

    delete req.user
  }

  next()
}

export const socialAuth = passport
socialAuth.addUserToBody = addUserToBody
