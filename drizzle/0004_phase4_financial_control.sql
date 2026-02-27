CREATE TABLE `investor_capital` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investorId` int NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`contributionDate` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investor_capital_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`contactInfo` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profit_distribution_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributionId` int NOT NULL,
	`investorId` int NOT NULL,
	`capitalSharePercent` decimal(5,2) NOT NULL,
	`distributedAmount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profit_distribution_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profit_distributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributionPeriod` varchar(7) NOT NULL,
	`totalInvestorPool` decimal(14,2) NOT NULL,
	`isFinalized` boolean NOT NULL DEFAULT false,
	`finalizedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profit_distributions_id` PRIMARY KEY(`id`),
	CONSTRAINT `profit_distributions_distributionPeriod_unique` UNIQUE(`distributionPeriod`)
);
--> statement-breakpoint
CREATE TABLE `supplier_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`transactionType` enum('Purchase','Payment','CreditNote','DebitNote') NOT NULL,
	`referenceId` int NOT NULL,
	`debit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`credit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`runningBalance` decimal(12,2) NOT NULL,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`canSell` boolean NOT NULL DEFAULT false,
	`canTransferRequest` boolean NOT NULL DEFAULT false,
	`canReceiveStock` boolean NOT NULL DEFAULT false,
	`canViewLedger` boolean NOT NULL DEFAULT false,
	`canViewGlobalStock` boolean NOT NULL DEFAULT false,
	`canViewFinancials` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permissions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('SuperAdmin','Admin','BranchManager','POSUser','user','admin','manager','cashier') NOT NULL DEFAULT 'POSUser';--> statement-breakpoint
ALTER TABLE `branches` ADD `city` varchar(128);--> statement-breakpoint
ALTER TABLE `ho_payments` ADD `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `ho_payments` ADD `approvedByUserId` int;--> statement-breakpoint
ALTER TABLE `ho_payments` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `ho_payments` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `branchId` int;--> statement-breakpoint
CREATE INDEX `idx_ic_investor` ON `investor_capital` (`investorId`);--> statement-breakpoint
CREATE INDEX `idx_pdd_dist` ON `profit_distribution_details` (`distributionId`);--> statement-breakpoint
CREATE INDEX `idx_pdd_investor` ON `profit_distribution_details` (`investorId`);--> statement-breakpoint
CREATE INDEX `idx_sl_supplier` ON `supplier_ledger` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_sl_transtype` ON `supplier_ledger` (`transactionType`);