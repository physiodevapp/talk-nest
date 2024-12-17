export const {
  PORT,
  JWT_SECRET_KEY,
  REFRESH_SECRET_KEY,
  ACCESS_TOKEN_EXPIRATION,
  REFRESH_TOKEN_EXPIRATION,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV
} = process.env
export const JWT_SALT = parseInt(process.env.JWT_SALT, 10)
