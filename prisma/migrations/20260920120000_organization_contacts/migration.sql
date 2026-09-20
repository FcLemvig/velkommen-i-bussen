CREATE TABLE "OrganizationContact" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationProfileId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CONTACT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrganizationContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrganizationContact_organizationProfileId_fkey" FOREIGN KEY ("organizationProfileId") REFERENCES "OrganizationProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrganizationContact_userId_organizationProfileId_key" ON "OrganizationContact"("userId", "organizationProfileId");
CREATE INDEX "OrganizationContact_userId_idx" ON "OrganizationContact"("userId");
CREATE INDEX "OrganizationContact_organizationProfileId_idx" ON "OrganizationContact"("organizationProfileId");

INSERT INTO "OrganizationContact" ("id", "userId", "organizationProfileId", "role", "createdAt")
SELECT 'orgcontact_' || "id", "userId", "id", 'OWNER', CURRENT_TIMESTAMP
FROM "OrganizationProfile"
ON CONFLICT ("userId", "organizationProfileId") DO NOTHING;
