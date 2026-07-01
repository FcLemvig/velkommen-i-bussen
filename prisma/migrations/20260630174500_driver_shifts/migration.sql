CREATE TABLE "DriverShift" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "driverProfileId" TEXT,
  "shiftDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverShift_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
