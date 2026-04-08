-- Add INTERNAL to Role before the cleanup migration rewrites legacy SUPER_ADMIN rows.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'INTERNAL';
