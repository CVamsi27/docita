-- CreateEnum for LabTestOrderStatus
CREATE TYPE "LabTestOrderStatus" AS ENUM ('ORDERED', 'PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum for WhatsappConversationStatus  
CREATE TYPE "WhatsappConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum for WhatsappMessageStatus
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED', 'PENDING', 'QUEUED');

-- Convert LabTestOrder.status from String to Enum
ALTER TABLE "LabTestOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LabTestOrder" 
ALTER COLUMN "status" TYPE "LabTestOrderStatus" 
USING CASE "status"
  WHEN 'ordered' THEN 'ORDERED'::text
  WHEN 'pending' THEN 'PENDING'::text
  WHEN 'completed' THEN 'COMPLETED'::text
  WHEN 'cancelled' THEN 'CANCELLED'::text
  ELSE 'ORDERED'::text
END::"LabTestOrderStatus";
ALTER TABLE "LabTestOrder" ALTER COLUMN "status" SET DEFAULT 'ORDERED';

-- Convert WhatsappConversation.status from String to Enum
ALTER TABLE "WhatsappConversation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WhatsappConversation"
ALTER COLUMN "status" TYPE "WhatsappConversationStatus"
USING CASE "status"
  WHEN 'open' THEN 'OPEN'::text
  WHEN 'closed' THEN 'CLOSED'::text
  WHEN 'archived' THEN 'ARCHIVED'::text
  ELSE 'OPEN'::text
END::"WhatsappConversationStatus";
ALTER TABLE "WhatsappConversation" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Convert WhatsappMessage.status from String to Enum
ALTER TABLE "WhatsappMessage" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WhatsappMessage"
ALTER COLUMN "status" TYPE "WhatsappMessageStatus"
USING CASE "status"
  WHEN 'sent' THEN 'SENT'::text
  WHEN 'delivered' THEN 'DELIVERED'::text
  WHEN 'read' THEN 'READ'::text
  WHEN 'failed' THEN 'FAILED'::text
  WHEN 'pending' THEN 'PENDING'::text
  WHEN 'queued' THEN 'QUEUED'::text
  ELSE 'SENT'::text
END::"WhatsappMessageStatus";
ALTER TABLE "WhatsappMessage" ALTER COLUMN "status" SET DEFAULT 'PENDING';
