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

export class MessageModel {
  static add = async ({ userId, message }) => {
    try {
      const [{ insertId: messageId }] = await connection.query(`
          INSERT INTO talknest_messages (message, user_id) 
          VALUES (?, UUID_TO_BIN(?));
        `, [message, userId])

      if (!messageId) throw new Error('Unkown message')

      return messageId
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to add a message')
    }
  }

  static getNewerMessages = async ({ id }) => {
    try {
      const [results] = await connection.query(`
        SELECT id, message, BIN_TO_UUID(user_id) AS user_id
        FROM talknest_messages
        WHERE id > ?;
        `, [id])

      return results
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to retrieve messages')
    }
  }
}
