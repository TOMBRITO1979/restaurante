#!/bin/bash
PGPASSWORD=RestauranteDB2024Secure psql -h 3c369b91dbc0 -U postgres -d restaurante << 'SQL'
-- Create public schema tables
CREATE TABLE IF NOT EXISTS "companies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE,
  "phone" TEXT,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "plan" TEXT NOT NULL DEFAULT 'FREE',
  "maxUsers" INTEGER NOT NULL DEFAULT 5,
  "schemaName" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "companyId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "permissions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resetToken" TEXT,
  "resetTokenExpiry" TIMESTAMP(3),
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);
SQL
