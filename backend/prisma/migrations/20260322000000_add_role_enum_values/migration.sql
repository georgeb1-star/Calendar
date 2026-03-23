-- Add new Role enum values (must be committed before they can be used)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OFFICE_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'GLOBAL_ADMIN';
