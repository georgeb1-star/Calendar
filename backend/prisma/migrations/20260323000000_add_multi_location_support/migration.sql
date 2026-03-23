-- AddMultiLocationSupport

-- Phase 2: Create Location table
CREATE TABLE "Location" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "address"   TEXT,
    "color"     TEXT         NOT NULL DEFAULT '#3B82F6',
    "isActive"  BOOLEAN      NOT NULL DEFAULT true,
    "companyId" TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

ALTER TABLE "Location"
    ADD CONSTRAINT "Location_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 3: Create LocationDailyTokens table
CREATE TABLE "LocationDailyTokens" (
    "id"          TEXT             NOT NULL,
    "locationId"  TEXT             NOT NULL,
    "date"        TEXT             NOT NULL,
    "tokensTotal" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "tokensUsed"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationDailyTokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationDailyTokens_locationId_date_key"
    ON "LocationDailyTokens"("locationId", "date");

ALTER TABLE "LocationDailyTokens"
    ADD CONSTRAINT "LocationDailyTokens_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 4: Add nullable locationId columns
ALTER TABLE "User"             ADD COLUMN "locationId" TEXT;
ALTER TABLE "Room"             ADD COLUMN "locationId" TEXT;
ALTER TABLE "Booking"          ADD COLUMN "locationId" TEXT;
ALTER TABLE "RecurringBooking" ADD COLUMN "locationId" TEXT;

-- Phase 5: Remove unique constraint on Room.name (different locations can have same room name)
DROP INDEX IF EXISTS "Room_name_key";

-- Phase 6: Data backfill
DO $$
DECLARE
    v_company_id  TEXT;
    v_location_id TEXT;
BEGIN
    -- Ensure Nammu Workplace company exists
    INSERT INTO "Company" ("id", "name", "color", "createdAt")
    VALUES (gen_random_uuid()::TEXT, 'Nammu Workplace', '#3B82F6', NOW())
    ON CONFLICT ("name") DO NOTHING;

    SELECT "id" INTO v_company_id FROM "Company" WHERE "name" = 'Nammu Workplace';

    -- If somehow still null, pick first company and rename it
    IF v_company_id IS NULL THEN
        SELECT "id" INTO v_company_id FROM "Company" ORDER BY "createdAt" LIMIT 1;
        UPDATE "Company" SET "name" = 'Nammu Workplace' WHERE "id" = v_company_id;
    END IF;

    -- Create Borough (home location) if it does not exist
    INSERT INTO "Location" ("id", "name", "address", "color", "isActive", "companyId", "createdAt")
    VALUES (gen_random_uuid()::TEXT, 'Borough', '70 Borough High Street', '#3B82F6', TRUE, v_company_id, NOW())
    ON CONFLICT ("name") DO NOTHING;

    SELECT "id" INTO v_location_id FROM "Location" WHERE "name" = 'Borough';

    -- Assign all existing records to Borough / Nammu Workplace
    UPDATE "User"             SET "locationId" = v_location_id, "companyId" = v_company_id WHERE "locationId" IS NULL;
    UPDATE "Room"             SET "locationId" = v_location_id                              WHERE "locationId" IS NULL;
    UPDATE "Booking"          SET "locationId" = v_location_id, "companyId" = v_company_id WHERE "locationId" IS NULL;
    UPDATE "RecurringBooking" SET "locationId" = v_location_id, "companyId" = v_company_id WHERE "locationId" IS NULL;

    -- Migrate deprecated ADMIN role to OFFICE_ADMIN
    UPDATE "User" SET "role" = 'OFFICE_ADMIN' WHERE "role" = 'ADMIN';

    -- Insert the remaining 13 Nammu Workplace locations
    INSERT INTO "Location" ("id", "name", "address", "color", "isActive", "companyId", "createdAt")
    VALUES
        (gen_random_uuid()::TEXT, 'Waterloo',                  'Westminster Bridge House', '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'St James',                  '11 Haymarket',             '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Chelsea Fulham Road',       '264a Fulham Road',          '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Chelsea Kings Road',        '440 Kings Road',            '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Fulham',                    '212 New Kings Road',        '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Mayfair',                   '51 South Audley Street',    '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Esher',                     '79a Grapes House',          '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Kingston Apple Market Hub', 'Apple Market Hub',          '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Kingston Rivermead',        'Rivermead',                 '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Kingston Crown Passage',    '5 Crown Passage',           '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Epsom',                     'Epsom Square',              '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Cobham Grosvenor House',    '8 Grosvenor House',         '#3B82F6', TRUE, v_company_id, NOW()),
        (gen_random_uuid()::TEXT, 'Cobham Anyards Road',       '14a Anyards Road',          '#3B82F6', TRUE, v_company_id, NOW())
    ON CONFLICT ("name") DO NOTHING;

END $$;

-- Phase 7: Make locationId non-nullable on Room, Booking, RecurringBooking
-- (User.locationId stays nullable for GLOBAL_ADMIN accounts)
ALTER TABLE "Room"             ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "Booking"          ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "RecurringBooking" ALTER COLUMN "locationId" SET NOT NULL;

-- Phase 8: Add foreign key constraints
ALTER TABLE "User"
    ADD CONSTRAINT "User_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Room"
    ADD CONSTRAINT "Room_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringBooking"
    ADD CONSTRAINT "RecurringBooking_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
