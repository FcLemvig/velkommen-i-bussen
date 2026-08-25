ALTER TABLE "Event" ADD COLUMN "sourceRideRequestId" TEXT;

CREATE UNIQUE INDEX "Event_sourceRideRequestId_key" ON "Event"("sourceRideRequestId");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_sourceRideRequestId_fkey"
FOREIGN KEY ("sourceRideRequestId") REFERENCES "RideRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
