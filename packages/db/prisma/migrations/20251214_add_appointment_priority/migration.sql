-- Create AppointmentPriority enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "AppointmentPriority" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add priority column to Appointment if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Appointment" ADD COLUMN "priority" "AppointmentPriority" NOT NULL DEFAULT 'ROUTINE';
EXCEPTION WHEN duplicate_column THEN null;
END $$;
