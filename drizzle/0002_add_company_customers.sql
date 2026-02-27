-- Migration: Add company_settings and customers tables
-- Generated for: AutoTools ERP v1.1 feature additions

CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `companyName` varchar(256) NOT NULL DEFAULT 'AutoTools ERP',
  `tagline` varchar(256),
  `address` text,
  `phone` varchar(64),
  `email` varchar(320),
  `website` varchar(256),
  `currency` varchar(8) NOT NULL DEFAULT 'USD',
  `currencySymbol` varchar(8) NOT NULL DEFAULT '$',
  `logoUrl` text,
  `primaryColor` varchar(32) DEFAULT '#f97316',
  `taxRate` decimal(5,2) DEFAULT '0.00',
  `receiptFooter` text,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `customers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(128) NOT NULL,
  `phone` varchar(32),
  `email` varchar(320),
  `address` text,
  `notes` text,
  `totalPurchases` decimal(12,2) NOT NULL DEFAULT '0.00',
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
