import 'dotenv/config';

const DISCORD_SNOWFLAKE = /^\d{17,20}$/;

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

function optionalSnowflake(key: string): string | null {
  const value = process.env[key]?.trim();
  if (!value) return null;
  if (!DISCORD_SNOWFLAKE.test(value)) {
    throw new Error(`${key} must be a valid Discord ID`);
  }
  return value;
}

function requiredSnowflake(key: string): string {
  const value = requiredEnv(key);
  if (!DISCORD_SNOWFLAKE.test(value)) {
    throw new Error(`${key} must be a valid Discord ID`);
  }
  return value;
}

function databaseUrl(): string {
  const value = requiredEnv('DATABASE_URL');

  try {
    const parsed = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error('unsupported protocol');
    }
    if (!parsed.hostname || !parsed.username || !parsed.pathname) {
      throw new Error('incomplete URL');
    }
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  return value;
}

export const config = Object.freeze({
  discordToken: requiredEnv('DISCORD_TOKEN'),
  clientId: requiredSnowflake('DISCORD_CLIENT_ID'),
  guildId: requiredSnowflake('DISCORD_GUILD_ID'),
  databaseUrl: databaseUrl(),
  registrationChannelId: optionalSnowflake('REGISTRATION_CHANNEL_ID'),
  adminChannelId: optionalSnowflake('ADMIN_CHANNEL_ID'),
  interviewChannelId: optionalSnowflake('INTERVIEW_CHANNEL_ID'),
  interviewRoleId: optionalSnowflake('INTERVIEW_ROLE_ID'),
  memberRoleId: optionalSnowflake('MEMBER_ROLE_ID'),
  adminRoleId: optionalSnowflake('ADMIN_ROLE_ID'),
});
