CREATE TYPE "registration_status" AS ENUM ('pending', 'interviewing', 'approved', 'rejected');

CREATE TABLE "guild_settings" (
    "guild_id" TEXT NOT NULL,
    "registration_channel_id" TEXT NOT NULL,
    "admin_channel_id" TEXT NOT NULL,
    "interview_channel_id" TEXT NOT NULL,
    "member_role_id" TEXT NOT NULL,
    "admin_role_id" TEXT,
    "welcome_message_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "guild_settings_pkey" PRIMARY KEY ("guild_id")
);

CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "guild_id" TEXT NOT NULL,
    "discord_user_id" TEXT NOT NULL,
    "discord_username" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "roblox_username" VARCHAR(100) NOT NULL,
    "gang" VARCHAR(100) NOT NULL DEFAULT '-',
    "status" "registration_status" NOT NULL DEFAULT 'pending',
    "dashboard_message_id" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registrations_guild_id_status_idx"
    ON "registrations"("guild_id", "status");

CREATE UNIQUE INDEX "registrations_guild_id_discord_user_id_key"
    ON "registrations"("guild_id", "discord_user_id");
