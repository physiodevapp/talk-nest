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
      console.log(error)

      throw new Error('Error while trying to create the user')
    }
  }
}
