-- Create AppointmentPriority enum type
CREATE TYPE "AppointmentPriority" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- AddColumn priority to Appointment
ALTER TABLE "Appointment" ADD COLUMN "priority" "AppointmentPriority" NOT NULL DEFAULT 'ROUTINE';
