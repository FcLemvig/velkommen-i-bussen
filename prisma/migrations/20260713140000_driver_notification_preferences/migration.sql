CREATE TABLE "DriverNotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "newShifts" BOOLEAN NOT NULL DEFAULT true,
  "assignedRides" BOOLEAN NOT NULL DEFAULT true,
  "rideChanges" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DriverNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverNotificationPreference_userId_key" ON "DriverNotificationPreference"("userId");

ALTER TABLE "DriverNotificationPreference" ADD CONSTRAINT "DriverNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
