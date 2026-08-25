ALTER TABLE "Membership" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL';

UPDATE "Membership"
SET "type" = 'ORGANIZATION'
WHERE "userId" IN (SELECT "userId" FROM "OrganizationProfile");
