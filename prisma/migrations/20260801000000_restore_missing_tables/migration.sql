-- Restore missing historical definitions before later migrations reference them.
-- Idempotent for installations originally created using db push.
CREATE TABLE IF NOT EXISTS "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BusBooking" (
    "id" TEXT NOT NULL,
    "organizationProfileId" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "bus" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pickupInfo" TEXT,
    "capacity" INTEGER NOT NULL,
    "bus" TEXT NOT NULL,
    "driverProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventSignup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "citizenProfileId" TEXT NOT NULL,
    "pickupAddress" TEXT,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSignup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DriverShift" ADD COLUMN IF NOT EXISTS "bus" TEXT NOT NULL DEFAULT 'EAST';
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationProfile_userId_key" ON "OrganizationProfile"("userId");
CREATE INDEX IF NOT EXISTS "BusBooking_bookingDate_startTime_idx" ON "BusBooking"("bookingDate", "startTime");
CREATE INDEX IF NOT EXISTS "BusBooking_bus_bookingDate_startTime_idx" ON "BusBooking"("bus", "bookingDate", "startTime");
CREATE INDEX IF NOT EXISTS "BusBooking_organizationProfileId_bookingDate_idx" ON "BusBooking"("organizationProfileId", "bookingDate");
CREATE INDEX IF NOT EXISTS "BusBooking_driverProfileId_bookingDate_idx" ON "BusBooking"("driverProfileId", "bookingDate");
CREATE INDEX IF NOT EXISTS "BusBooking_status_idx" ON "BusBooking"("status");
CREATE INDEX IF NOT EXISTS "Event_eventDate_startTime_idx" ON "Event"("eventDate", "startTime");
CREATE INDEX IF NOT EXISTS "Event_bus_eventDate_startTime_idx" ON "Event"("bus", "eventDate", "startTime");
CREATE INDEX IF NOT EXISTS "Event_driverProfileId_eventDate_idx" ON "Event"("driverProfileId", "eventDate");
CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event"("status");
CREATE INDEX IF NOT EXISTS "EventSignup_citizenProfileId_createdAt_idx" ON "EventSignup"("citizenProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "EventSignup_eventId_status_idx" ON "EventSignup"("eventId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "EventSignup_eventId_citizenProfileId_key" ON "EventSignup"("eventId", "citizenProfileId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationProfile_userId_fkey' AND conrelid = '"OrganizationProfile"'::regclass) THEN ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusBooking_organizationProfileId_fkey' AND conrelid = '"BusBooking"'::regclass) THEN ALTER TABLE "BusBooking" ADD CONSTRAINT "BusBooking_organizationProfileId_fkey" FOREIGN KEY ("organizationProfileId") REFERENCES "OrganizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusBooking_driverProfileId_fkey' AND conrelid = '"BusBooking"'::regclass) THEN ALTER TABLE "BusBooking" ADD CONSTRAINT "BusBooking_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_driverProfileId_fkey' AND conrelid = '"Event"'::regclass) THEN ALTER TABLE "Event" ADD CONSTRAINT "Event_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventSignup_eventId_fkey' AND conrelid = '"EventSignup"'::regclass) THEN ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventSignup_citizenProfileId_fkey' AND conrelid = '"EventSignup"'::regclass) THEN ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_citizenProfileId_fkey" FOREIGN KEY ("citizenProfileId") REFERENCES "CitizenProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
