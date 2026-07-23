ALTER TABLE "registrations"
ADD COLUMN "joined_at" TIMESTAMPTZ(6);

UPDATE "registrations"
SET "joined_at" = "created_at"
WHERE "joined_at" IS NULL;

ALTER TABLE "registrations"
ALTER COLUMN "joined_at" SET NOT NULL;
