-- MySQL Workbench Synchronization
-- Generated: 2018-11-13 16:46
-- Model: template_database_name
-- Version: 1.0
-- Project: template_database_name
-- Author: Toubkal

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';

CREATE DATABASE  IF NOT EXISTS `template_database_name` DEFAULT CHARACTER SET utf8  DEFAULT COLLATE utf8_general_ci;
USE `template_database_name`;

-- ------------------------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `template_database_name`.`users` (
  `id` BINARY(16) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `timestamp` VARCHAR(32) NULL DEFAULT NULL,
  `first_name` VARCHAR(255) NULL DEFAULT NULL,
  `last_name` VARCHAR(255) NULL DEFAULT NULL,
  `photo` TEXT NULL DEFAULT NULL,
  `phone` VARCHAR(32) NULL DEFAULT NULL,
  `zip_code` VARCHAR(32) NULL DEFAULT NULL,
  `city` VARCHAR(255) NULL DEFAULT NULL,
  `settings` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

-- ------------------------------------------------------------------------------
-- Table: users_providers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `template_database_name`.`users_providers` (
  `id` BINARY(16) NOT NULL,
  `user_id` BINARY(16) NOT NULL,
  `provider_id` VARCHAR(255) NULL DEFAULT NULL,
  `provider_name` VARCHAR(255) NULL DEFAULT NULL,
  `profile` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_users_providers_user_id` (`user_id` ASC),
  CONSTRAINT `fk_users_providers_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `template_database_name`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

-- ------------------------------------------------------------------------------
-- Table: todos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `template_database_name`.`todos` (
  `id` BINARY(16) NOT NULL,
  `creator_id` BINARY(16) NULL DEFAULT NULL,
  `timestamp` VARCHAR(32) NULL DEFAULT NULL,
  `text` TEXT NULL DEFAULT NULL,
  `complete` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_todos_creator_id` (`creator_id` ASC),
  CONSTRAINT `fk_todos_creator_id`
    FOREIGN KEY (`creator_id`)
    REFERENCES `template_database_name`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
