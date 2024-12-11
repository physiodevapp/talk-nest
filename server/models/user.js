import mysql from 'mysql2/promise'

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

    const [uuidResult] = await connection.query(`
        SELECT UUID() uuid
      `)
    const [{ uuid }] = uuidResult

    try {
      await connection.query(`
          INSERT INTO talkNest_users (id, username, email, password)
          VALUES (UUID_TO_BIN('${uuid}'), ?, ?, ?)
        `, [username, email, password])
    } catch (error) {
      console.log(error)

      throw new Error('Error while trying to create the user')
    }
  }
}
