-- Granular consent purposes: marketing and analytics (additive enum values)
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'ANALYTICS';
