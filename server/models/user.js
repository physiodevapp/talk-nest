import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import { JWT_SALT } from '../../config.js'

const DEFAULT_CONFIG = {
  host: 'localhost',
  user: 'root',
  port: 3306,
  password: '',
  database: 'talkNestDB'
}

const connectionString = process.env.SQL_URL ?? DEFAULT_CONFIG

const connection = await mysql.createConnection(connectionString)

export class UserModel {
  static create = async ({ input }) => {
    const { username, email, password } = input

    try {
      const [uuidResult] = await connection.query(`
          SELECT UUID() uuid
        `)
      const [{ uuid }] = uuidResult

      const passwordHashed = await bcrypt.hash(password, JWT_SALT)

      await connection.query(`
          INSERT INTO talkNest_users (id, username, email, password)
          VALUES (UUID_TO_BIN('${uuid}'), ?, ?, ?)
        `, [username, email, passwordHashed])
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

  static getUsersByIds = async (ids) => {
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

  static isAuthorised = async ({ input }) => {
    const { username, password } = input

    try {
      const [userResult] = await connection.query(`
          SELECT username, password, BIN_TO_UUID(id) AS id
          FROM talkNest_users
          WHERE username = ?;
        `, [username])
      const [user] = userResult

      if (!user) throw new Error('Invalid credentials')

      const isValid = await bcrypt.compare(password, user.password)

      if (!isValid) throw new Error('Invalid credentials')

      return {
        username: user.username,
        id: user.id
      }
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to check the credentials')
    }
  }
}
