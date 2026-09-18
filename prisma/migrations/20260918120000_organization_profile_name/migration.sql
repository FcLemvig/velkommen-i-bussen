ALTER TABLE "OrganizationProfile" ADD COLUMN "name" TEXT;

UPDATE "OrganizationProfile"
SET "name" = "User"."name"
FROM "User"
WHERE "OrganizationProfile"."userId" = "User"."id"
  AND "OrganizationProfile"."name" IS NULL;
