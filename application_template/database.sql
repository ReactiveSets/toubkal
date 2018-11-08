-- ------------------------------------------------------------------------------
CREATE DATABASE  IF NOT EXISTS `template_database_name`;
USE `template_database_name`;

-- ------------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `email` varchar(255) NOT NULL,
  `timestamp` varchar(32) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `photo` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ------------------------------------------------------------------------------
CREATE TABLE `users_providers` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `provider_name` varchar(255) DEFAULT NULL,
  `profile` text,
  PRIMARY KEY (`id`),
  KEY `idx_users_providers_user_id` (`user_id`),
  CONSTRAINT `fk_users_providers_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
