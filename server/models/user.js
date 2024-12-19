import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, JWT_SALT, SQL_URL } from '../../config.js'

const DEFAULT_CONFIG = {
  host: DB_HOST ?? 'localhost',
  user: DB_USER ?? 'root',
  port: DB_PORT ?? 3306,
  password: DB_PASSWORD ?? '',
  database: DB_NAME
}

const connectionString = SQL_URL ?? DEFAULT_CONFIG

const connection = await mysql.createConnection(connectionString)

export class UserModel {
  static create = async ({ input, isOauth = false }) => {
    const { username, email, password } = input

    try {
      const [uuidResult] = await connection.query(`
          SELECT UUID() uuid
        `)
      const [{ uuid }] = uuidResult

      const passwordHashed = await bcrypt.hash(password, JWT_SALT)

      await connection.query(`
          INSERT INTO talknest_users (id, username, email, password, is_oauth_user)
          VALUES (UUID_TO_BIN('${uuid}'), ?, ?, ?, ?)
        `, [username, email, passwordHashed, isOauth])

      const newUser = await this.getById({ id: uuid })

      return newUser
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to create the user')
    }
  }

  static getById = async ({ id }) => {
    if (!id) throw new Error('You must provide an id')

    try {
      const [results] = await connection.query(`
        SELECT username, BIN_TO_UUID(id) AS id
        FROM talknest_users
        WHERE id = UUID_TO_BIN(?);
        `, [id])

      const [user] = results

      return user
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to get the user')
    }
  }

  static getByUsername = async ({ username }) => {
    if (!username) throw new Error('You must provide an username')

    try {
      const [results] = await connection.query(`
        SELECT username, BIN_TO_UUID(id) AS id
        FROM talknest_users
        WHERE username = ?;
        `, [username])

      const [user] = results

      return user
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to get the user')
    }
  }

  static getAllById = async (ids) => {
    if (!ids || ids.length === 0) {
      throw new Error('You must provide at least one ID')
    }

    try {
      const placeholders = ids.map(() => 'UUID_TO_BIN(?)').join(', ')
      const [results] = await connection.query(
        `
        SELECT username, BIN_TO_UUID(id) AS id
        FROM talknest_users
        WHERE id IN (${placeholders});
        `, ids
      )

      return results
    } catch (error) {
      console.error('Error while trying to get users by IDs:', error)
      throw new Error('Error while trying to get users by IDs')
    }
  }

  static isValid = async ({ input }) => {
    const { username, password } = input

    try {
      const [userResult] = await connection.query(`
          SELECT username, password, BIN_TO_UUID(id) AS id, is_oauth_user
          FROM talknest_users
          WHERE username = ?;
        `, [username])
      const [user] = userResult

      if (!user) throw new Error('Invalid username')

      const isValid = await bcrypt.compare(password, user.password)

      if (!isValid) throw new Error('Invalid password')

      return {
        username: user.username,
        id: user.id,
        isOauth: !!user.is_oauth_user
      }
    } catch (error) {
      console.error(error)
      if (['Invalid username', 'Invalid password'].includes(error.message)) {
        throw new Error(error.message)
      }

      throw new Error('Error while trying to validate the credentials')
    }
  }
}
