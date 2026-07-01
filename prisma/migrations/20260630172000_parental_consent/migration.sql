ALTER TABLE "RideRequest" ADD COLUMN "includesMinors" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RideRequest" ADD COLUMN "parentalConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RideRequest" ADD COLUMN "guardianName" TEXT;
ALTER TABLE "RideRequest" ADD COLUMN "guardianPhone" TEXT;
