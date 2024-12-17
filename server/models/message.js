import mysql from 'mysql2/promise'
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from '../../config.js'

const DEFAULT_CONFIG = {
  host: DB_HOST ?? 'localhost',
  user: DB_USER ?? 'root',
  port: DB_PORT ?? 3306,
  password: DB_PASSWORD ?? '',
  database: DB_NAME
}

const connectionString = process.env.SQL_URL ?? DEFAULT_CONFIG

const connection = await mysql.createConnection(connectionString)

export class MessageModel {
  static add = async ({ userId, message, createdULID }) => {
    try {
      const [{ insertId: messageId }] = await connection.query(`
          INSERT INTO talknest_messages (message, user_id, created_ulid) 
          VALUES (?, UUID_TO_BIN(?), ?);
        `, [message, userId, createdULID])

      if (!messageId) throw new Error('DB Error: Unkown message')

      return messageId
    } catch (error) {
      console.error(error)
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('DB Error: duplicated')
      } else {
        throw new Error('DB Error: ', error.message)
      }
    }
  }

  static getNewerMessages = async ({ id }) => {
    try {
      const [results] = await connection.query(`
        SELECT id, message, BIN_TO_UUID(user_id) AS user_id, created_ulid
        FROM talknest_messages
        WHERE id > ?
        ORDER BY created_ulid ASC;
        `, [id])

      return results
    } catch (error) {
      console.error(error)

      throw new Error('Error while trying to retrieve messages')
    }
  }
}
