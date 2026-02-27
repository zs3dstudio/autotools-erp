-- Phase-3: Multi-Branch Access Control Layer Migration
-- This migration adds Phase-3 fields and tables on top of Phase-2

-- ─────────────────────────────────────────────
-- BRANCHES: Add city field
-- ─────────────────────────────────────────────
ALTER TABLE branches ADD COLUMN IF NOT EXISTS city VARCHAR(128);

-- ─────────────────────────────────────────────
-- USERS: Add Phase-3 fields
-- ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branchId INT;
ALTER TABLE users MODIFY COLUMN role ENUM('SuperAdmin','Admin','BranchManager','POSUser','user','admin','manager','cashier') NOT NULL DEFAULT 'POSUser';

-- ─────────────────────────────────────────────
-- USER PERMISSIONS: New table for granular permissions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  canSell BOOLEAN NOT NULL DEFAULT FALSE,
  canTransferRequest BOOLEAN NOT NULL DEFAULT FALSE,
  canReceiveStock BOOLEAN NOT NULL DEFAULT FALSE,
  canViewLedger BOOLEAN NOT NULL DEFAULT FALSE,
  canViewGlobalStock BOOLEAN NOT NULL DEFAULT FALSE,
  canViewFinancials BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Seed default SuperAdmin user permissions (full access)
-- ─────────────────────────────────────────────
-- Note: Run this after creating the SuperAdmin user
-- INSERT INTO user_permissions (userId, canSell, canTransferRequest, canReceiveStock, canViewLedger, canViewGlobalStock, canViewFinancials)
-- SELECT id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM users WHERE role = 'SuperAdmin' LIMIT 1;
