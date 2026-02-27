CREATE TABLE `audit_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userEmail` varchar(320),
	`userName` varchar(128),
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64),
	`branchId` int,
	`details` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`code` varchar(16) NOT NULL,
	`address` text,
	`phone` varchar(32),
	`isWarehouse` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` text,
	`amount` decimal(12,2) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ho_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paymentMethod` varchar(32),
	`reference` varchar(128),
	`notes` text,
	`paymentDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ho_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serialNo` varchar(128) NOT NULL,
	`batchId` varchar(64),
	`productId` int NOT NULL,
	`branchId` int NOT NULL,
	`landingCost` decimal(12,2) NOT NULL,
	`branchCost` decimal(12,2) NOT NULL,
	`status` enum('Available','Sold','InTransit','Reserved','Damaged') NOT NULL DEFAULT 'Available',
	`transitToBranchId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_items_serialNo_unique` UNIQUE(`serialNo`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`entryType` enum('Sale','Expense','Payment','Adjustment','Transfer') NOT NULL,
	`referenceId` int,
	`referenceType` varchar(32),
	`description` text,
	`debit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`credit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`runningBalance` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`categoryId` int,
	`supplierId` int,
	`landingCost` decimal(12,2) NOT NULL DEFAULT '0.00',
	`branchCost` decimal(12,2) NOT NULL DEFAULT '0.00',
	`retailPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
	`reorderLevel` int NOT NULL DEFAULT 5,
	`isActive` boolean NOT NULL DEFAULT true,
	`imageUrl` text,
	`barcode` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `reorder_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`branchId` int NOT NULL,
	`currentStock` int NOT NULL,
	`reorderLevel` int NOT NULL,
	`isResolved` boolean NOT NULL DEFAULT false,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reorder_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`productId` int NOT NULL,
	`serialNo` varchar(128) NOT NULL,
	`landingCost` decimal(12,2) NOT NULL,
	`branchCost` decimal(12,2) NOT NULL,
	`retailPrice` decimal(12,2) NOT NULL,
	`profit` decimal(12,2) NOT NULL,
	`investor70` decimal(12,2) NOT NULL,
	`master30` decimal(12,2) NOT NULL,
	`cashDueHO` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptNo` varchar(32) NOT NULL,
	`branchId` int NOT NULL,
	`userId` int NOT NULL,
	`customerName` varchar(128),
	`customerPhone` varchar(32),
	`subtotal` decimal(12,2) NOT NULL,
	`discount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalAmount` decimal(12,2) NOT NULL,
	`paymentType` enum('Cash','Card','Transfer','Mixed') NOT NULL,
	`status` enum('Completed','Voided','Pending') NOT NULL DEFAULT 'Completed',
	`notes` text,
	`syncedAt` timestamp,
	`isOfflineSale` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_receiptNo_unique` UNIQUE(`receiptNo`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfer_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`serialNo` varchar(128) NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_transfer_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferNo` varchar(32) NOT NULL,
	`fromBranchId` int NOT NULL,
	`toBranchId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`approvedByUserId` int,
	`status` enum('Pending','Approved','Rejected','InTransit','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
	`notes` text,
	`rejectionReason` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_transfers_transferNo_unique` UNIQUE(`transferNo`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`contactPerson` varchar(128),
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','manager') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_audit_user` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_inv_branch` ON `inventory_items` (`branchId`);--> statement-breakpoint
CREATE INDEX `idx_inv_product` ON `inventory_items` (`productId`);