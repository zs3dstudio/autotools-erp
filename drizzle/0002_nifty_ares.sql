CREATE TABLE `branch_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`saleId` int,
	`type` enum('stock_received','sale_profit','payment_sent','payment_received') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `branch_ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_settings` (
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
CREATE TABLE `customers` (
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
--> statement-breakpoint
CREATE TABLE `goods_received_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnNo` varchar(32) NOT NULL,
	`poId` int NOT NULL,
	`supplierId` int NOT NULL,
	`warehouseBranchId` int NOT NULL,
	`receivedByUserId` int NOT NULL,
	`status` enum('Pending','Received','Reversed') NOT NULL DEFAULT 'Pending',
	`totalReceivedAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`receivedAt` timestamp,
	`reversedAt` timestamp,
	CONSTRAINT `goods_received_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `goods_received_notes_grnNo_unique` UNIQUE(`grnNo`)
);
--> statement-breakpoint
CREATE TABLE `grn_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnId` int NOT NULL,
	`poItemId` int NOT NULL,
	`productId` int NOT NULL,
	`quantityReceived` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grn_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_aging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`invoiceNo` varchar(32) NOT NULL,
	`supplierId` int,
	`customerId` int,
	`branchId` int NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`outstandingAmount` decimal(12,2) NOT NULL,
	`daysOverdue` int NOT NULL DEFAULT 0,
	`agingBucket` enum('Current','30Days','60Days','90Days','Over90Days') NOT NULL DEFAULT 'Current',
	`dueDate` timestamp,
	`lastPaymentDate` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoice_aging_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_aging_invoiceId_unique` UNIQUE(`invoiceId`)
);
--> statement-breakpoint
CREATE TABLE `invoice_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`paymentAmount` decimal(12,2) NOT NULL,
	`paymentMethod` varchar(32) NOT NULL,
	`reference` varchar(128),
	`notes` text,
	`createdByUserId` int NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoice_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNo` varchar(32) NOT NULL,
	`invoiceType` enum('Sales','Purchase','CreditNote','DebitNote') NOT NULL,
	`referenceId` int NOT NULL,
	`supplierId` int,
	`customerId` int,
	`branchId` int NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`outstandingAmount` decimal(12,2) NOT NULL,
	`creditAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('Draft','Issued','PartiallyPaid','Paid','Overdue','Cancelled') NOT NULL DEFAULT 'Draft',
	`dueDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`issuedAt` timestamp,
	`paidAt` timestamp,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNo_unique` UNIQUE(`invoiceNo`)
);
--> statement-breakpoint
CREATE TABLE `landing_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnId` int NOT NULL,
	`costType` varchar(64) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `landing_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`paymentId` int NOT NULL,
	`allocatedAmount` decimal(12,2) NOT NULL,
	`allocationDate` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_finalizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grnId` int NOT NULL,
	`poId` int NOT NULL,
	`supplierId` int NOT NULL,
	`warehouseBranchId` int NOT NULL,
	`finalizedByUserId` int NOT NULL,
	`baseAmount` decimal(12,2) NOT NULL,
	`totalLandingCosts` decimal(12,2) NOT NULL DEFAULT '0.00',
	`finalAmount` decimal(12,2) NOT NULL,
	`payableEntryId` int,
	`status` enum('Pending','Finalized','Cancelled') NOT NULL DEFAULT 'Pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`finalizedAt` timestamp,
	CONSTRAINT `purchase_finalizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poNo` varchar(32) NOT NULL,
	`supplierId` int NOT NULL,
	`warehouseBranchId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`status` enum('Draft','Submitted','Approved','Cancelled') NOT NULL DEFAULT 'Draft',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`approvedAt` timestamp,
	`cancelledAt` timestamp,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_poNo_unique` UNIQUE(`poNo`)
);
--> statement-breakpoint
CREATE TABLE `stock_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`invoiceType` enum('Sale','Transfer','PurchaseOrder') NOT NULL,
	`branchId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`status` enum('Active','Released','Consumed') NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`releasedAt` timestamp,
	CONSTRAINT `stock_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `entryType` enum('Sale','Expense','Payment','Adjustment','Transfer','PurchasePayable') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','manager','cashier') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `idx_grn_po` ON `goods_received_notes` (`poId`);--> statement-breakpoint
CREATE INDEX `idx_grn_supplier` ON `goods_received_notes` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_grn_warehouse` ON `goods_received_notes` (`warehouseBranchId`);--> statement-breakpoint
CREATE INDEX `idx_grn_status` ON `goods_received_notes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_grni_grn` ON `grn_items` (`grnId`);--> statement-breakpoint
CREATE INDEX `idx_grni_product` ON `grn_items` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_ia_supplier` ON `invoice_aging` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_ia_customer` ON `invoice_aging` (`customerId`);--> statement-breakpoint
CREATE INDEX `idx_ia_aging` ON `invoice_aging` (`agingBucket`);--> statement-breakpoint
CREATE INDEX `idx_ip_invoice` ON `invoice_payments` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_ip_date` ON `invoice_payments` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `idx_inv_type` ON `invoices` (`invoiceType`);--> statement-breakpoint
CREATE INDEX `idx_inv_supplier` ON `invoices` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_inv_customer` ON `invoices` (`customerId`);--> statement-breakpoint
CREATE INDEX `idx_inv_branch` ON `invoices` (`branchId`);--> statement-breakpoint
CREATE INDEX `idx_inv_status` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lc_grn` ON `landing_costs` (`grnId`);--> statement-breakpoint
CREATE INDEX `idx_pa_invoice` ON `payment_allocations` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_pa_payment` ON `payment_allocations` (`paymentId`);--> statement-breakpoint
CREATE INDEX `idx_pf_grn` ON `purchase_finalizations` (`grnId`);--> statement-breakpoint
CREATE INDEX `idx_pf_po` ON `purchase_finalizations` (`poId`);--> statement-breakpoint
CREATE INDEX `idx_pf_supplier` ON `purchase_finalizations` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_poi_po` ON `purchase_order_items` (`poId`);--> statement-breakpoint
CREATE INDEX `idx_poi_product` ON `purchase_order_items` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_po_supplier` ON `purchase_orders` (`supplierId`);--> statement-breakpoint
CREATE INDEX `idx_po_warehouse` ON `purchase_orders` (`warehouseBranchId`);--> statement-breakpoint
CREATE INDEX `idx_po_status` ON `purchase_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_res_inventory` ON `stock_reservations` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `idx_res_invoice` ON `stock_reservations` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_res_branch` ON `stock_reservations` (`branchId`);