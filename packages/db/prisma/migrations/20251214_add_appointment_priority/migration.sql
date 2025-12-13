-- AddColumn priority to Appointment
ALTER TABLE "Appointment" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'ROUTINE';
