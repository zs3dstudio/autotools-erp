-- AutoTools ERP — Database Initialisation Script
-- This file is executed once when the MySQL Docker container is first created.
-- It creates all tables in the correct order (FK-safe).
-- For subsequent schema changes, use Drizzle migrations (pnpm db:migrate).

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `openId`       VARCHAR(64)  NOT NULL UNIQUE,
  `name`         TEXT,
  `email`        VARCHAR(320),
  `loginMethod`  VARCHAR(64),
  `role`         ENUM('user','admin','manager') NOT NULL DEFAULT 'user',
  `isActive`     BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── BRANCHES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `branches` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(128) NOT NULL,
  `code`        VARCHAR(16)  NOT NULL UNIQUE,
  `address`     TEXT,
  `phone`       VARCHAR(32),
  `isWarehouse` BOOLEAN NOT NULL DEFAULT FALSE,
  `isActive`    BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── USER-BRANCH ASSIGNMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_branches` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `userId`    INT NOT NULL,
  `branchId`  INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ub_user`   FOREIGN KEY (`userId`)   REFERENCES `users`(`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_ub_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_branch` (`userId`, `branchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `categories` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(128) NOT NULL,
  `description` TEXT,
  `createdAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── SUPPLIERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(128) NOT NULL,
  `contactPerson` VARCHAR(128),
  `phone`         VARCHAR(32),
  `email`         VARCHAR(320),
  `address`       TEXT,
  `isActive`      BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `sku`          VARCHAR(64)  NOT NULL UNIQUE,
  `name`         VARCHAR(256) NOT NULL,
  `description`  TEXT,
  `categoryId`   INT,
  `supplierId`   INT,
  `landingCost`  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `branchCost`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `retailPrice`  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reorderLevel` INT NOT NULL DEFAULT 5,
  `isActive`     BOOLEAN NOT NULL DEFAULT TRUE,
  `imageUrl`     TEXT,
  `barcode`      VARCHAR(128),
  `createdAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_prod_category` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prod_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── INVENTORY ITEMS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `serialNo`          VARCHAR(128) NOT NULL UNIQUE,
  `batchId`           VARCHAR(64),
  `productId`         INT NOT NULL,
  `branchId`          INT NOT NULL,
  `landingCost`       DECIMAL(12,2) NOT NULL,
  `branchCost`        DECIMAL(12,2) NOT NULL,
  `status`            ENUM('Available','Sold','InTransit','Reserved','Damaged') NOT NULL DEFAULT 'Available',
  `transitToBranchId` INT,
  `notes`             TEXT,
  `createdAt`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inv_branch`  (`branchId`),
  INDEX `idx_inv_product` (`productId`),
  CONSTRAINT `fk_inv_product` FOREIGN KEY (`productId`) REFERENCES `products`(`id`),
  CONSTRAINT `fk_inv_branch`  FOREIGN KEY (`branchId`)  REFERENCES `branches`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── SALES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sales` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `receiptNo`     VARCHAR(32)  NOT NULL UNIQUE,
  `branchId`      INT NOT NULL,
  `userId`        INT NOT NULL,
  `customerName`  VARCHAR(128),
  `customerPhone` VARCHAR(32),
  `subtotal`      DECIMAL(12,2) NOT NULL,
  `discount`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `totalAmount`   DECIMAL(12,2) NOT NULL,
  `paymentType`   ENUM('Cash','Card','Transfer','Mixed') NOT NULL,
  `status`        ENUM('Completed','Voided','Pending') NOT NULL DEFAULT 'Completed',
  `notes`         TEXT,
  `syncedAt`      TIMESTAMP NULL,
  `isOfflineSale` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sale_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`),
  CONSTRAINT `fk_sale_user`   FOREIGN KEY (`userId`)   REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── SALE LINE ITEMS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `saleId`          INT NOT NULL,
  `inventoryItemId` INT NOT NULL,
  `productId`       INT NOT NULL,
  `serialNo`        VARCHAR(128) NOT NULL,
  `landingCost`     DECIMAL(12,2) NOT NULL,
  `branchCost`      DECIMAL(12,2) NOT NULL,
  `retailPrice`     DECIMAL(12,2) NOT NULL,
  `profit`          DECIMAL(12,2) NOT NULL,
  `investor70`      DECIMAL(12,2) NOT NULL,
  `master30`        DECIMAL(12,2) NOT NULL,
  `cashDueHO`       DECIMAL(12,2) NOT NULL,
  `createdAt`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_si_sale`  FOREIGN KEY (`saleId`)          REFERENCES `sales`(`id`)           ON DELETE CASCADE,
  CONSTRAINT `fk_si_inv`   FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`),
  CONSTRAINT `fk_si_prod`  FOREIGN KEY (`productId`)       REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── STOCK TRANSFERS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `transferNo`          VARCHAR(32) NOT NULL UNIQUE,
  `fromBranchId`        INT NOT NULL,
  `toBranchId`          INT NOT NULL,
  `requestedByUserId`   INT NOT NULL,
  `approvedByUserId`    INT,
  `status`              ENUM('Pending','Approved','Rejected','InTransit','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `notes`               TEXT,
  `rejectionReason`     TEXT,
  `requestedAt`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approvedAt`          TIMESTAMP NULL,
  `completedAt`         TIMESTAMP NULL,
  `updatedAt`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_st_from`      FOREIGN KEY (`fromBranchId`)      REFERENCES `branches`(`id`),
  CONSTRAINT `fk_st_to`        FOREIGN KEY (`toBranchId`)        REFERENCES `branches`(`id`),
  CONSTRAINT `fk_st_requested` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_st_approved`  FOREIGN KEY (`approvedByUserId`)  REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── STOCK TRANSFER ITEMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `stock_transfer_items` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `transferId`      INT NOT NULL,
  `inventoryItemId` INT NOT NULL,
  `serialNo`        VARCHAR(128) NOT NULL,
  `productId`       INT NOT NULL,
  `createdAt`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sti_transfer` FOREIGN KEY (`transferId`)      REFERENCES `stock_transfers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sti_inv`      FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`),
  CONSTRAINT `fk_sti_prod`     FOREIGN KEY (`productId`)       REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── LEDGER ENTRIES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ledger_entries` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `branchId`       INT NOT NULL,
  `entryType`      ENUM('Sale','Expense','Payment','Adjustment','Transfer') NOT NULL,
  `referenceId`    INT,
  `referenceType`  VARCHAR(32),
  `description`    TEXT,
  `debit`          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `credit`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `runningBalance` DECIMAL(12,2) NOT NULL,
  `createdAt`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_le_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── EXPENSES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `expenses` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `branchId`    INT NOT NULL,
  `userId`      INT NOT NULL,
  `category`    VARCHAR(64) NOT NULL,
  `description` TEXT,
  `amount`      DECIMAL(12,2) NOT NULL,
  `expenseDate` TIMESTAMP NOT NULL,
  `createdAt`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_exp_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`),
  CONSTRAINT `fk_exp_user`   FOREIGN KEY (`userId`)   REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── HO PAYMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ho_payments` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `branchId`      INT NOT NULL,
  `userId`        INT NOT NULL,
  `amount`        DECIMAL(12,2) NOT NULL,
  `paymentMethod` VARCHAR(32),
  `reference`     VARCHAR(128),
  `notes`         TEXT,
  `paymentDate`   TIMESTAMP NOT NULL,
  `createdAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_hop_branch` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`),
  CONSTRAINT `fk_hop_user`   FOREIGN KEY (`userId`)   REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
  `userId`     INT,
  `userEmail`  VARCHAR(320),
  `userName`   VARCHAR(128),
  `action`     VARCHAR(64) NOT NULL,
  `entityType` VARCHAR(64) NOT NULL,
  `entityId`   VARCHAR(64),
  `branchId`   INT,
  `details`    TEXT,
  `ipAddress`  VARCHAR(64),
  `createdAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_entity` (`entityType`, `entityId`),
  INDEX `idx_audit_user`   (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── COMPANY SETTINGS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `companyName`    VARCHAR(256) NOT NULL DEFAULT 'AutoTools ERP',
  `tagline`        VARCHAR(256),
  `address`        TEXT,
  `phone`          VARCHAR(64),
  `email`          VARCHAR(320),
  `website`        VARCHAR(256),
  `currency`       VARCHAR(8) NOT NULL DEFAULT 'USD',
  `currencySymbol` VARCHAR(8) NOT NULL DEFAULT '$',
  `logoUrl`        TEXT,
  `primaryColor`   VARCHAR(32) DEFAULT '#f97316',
  `taxRate`        DECIMAL(5,2) DEFAULT 0.00,
  `receiptFooter`  TEXT,
  `updatedAt`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `customers` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `name`           VARCHAR(128) NOT NULL,
  `phone`          VARCHAR(32),
  `email`          VARCHAR(320),
  `address`        TEXT,
  `notes`          TEXT,
  `totalPurchases` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `isActive`       BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── REORDER ALERTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reorder_alerts` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `productId`    INT NOT NULL,
  `branchId`     INT NOT NULL,
  `currentStock` INT NOT NULL,
  `reorderLevel` INT NOT NULL,
  `isResolved`   BOOLEAN NOT NULL DEFAULT FALSE,
  `resolvedAt`   TIMESTAMP NULL,
  `createdAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ra_product` FOREIGN KEY (`productId`) REFERENCES `products`(`id`),
  CONSTRAINT `fk_ra_branch`  FOREIGN KEY (`branchId`)  REFERENCES `branches`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
