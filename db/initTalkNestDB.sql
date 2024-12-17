CREATE DATABASE IF NOT EXISTS talkNestDB;

USE talkNestDB;

CREATE TABLE talknest_users (
  id binary(16) NOT NULL DEFAULT (uuid_to_bin(uuid())),
  username char(255) DEFAULT NULL,
  email char(255) DEFAULT NULL,
  password char(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
);

CREATE TABLE talknest_messages (
	id INT PRIMARY KEY AUTO_INCREMENT,
  message VARCHAR(255),
  user_id BINARY(16) NOT NULL,
  created_ulid VARCHAR(26) NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES talknest_users(id)
  ON DELETE CASCADE
);