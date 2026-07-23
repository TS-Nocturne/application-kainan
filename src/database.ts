import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type {
  GuildSettings,
  Prisma,
  Registration,
  RegistrationStatus,
} from '@prisma/client';
import { config } from './config.js';

const adapter = new PrismaPg({ connectionString: config.databaseUrl });
export const prisma = new PrismaClient({ adapter });

export type GuildSettingsInput = Omit<
  GuildSettings,
  'createdAt' | 'updatedAt'
>;

export interface RegistrationInput {
  guildId: string;
  discordUserId: string;
  discordUsername: string;
  name: string;
  robloxUsername: string;
  gang: string;
  joinedAt: Date;
  dashboardMessageId: string | null;
}

export async function getGuildSettings(
  guildId: string,
): Promise<GuildSettings | null> {
  return prisma.guildSettings.findUnique({ where: { guildId } });
}

export async function saveGuildSettings(
  settings: GuildSettingsInput,
): Promise<GuildSettings> {
  const { guildId, ...data } = settings;
  return prisma.guildSettings.upsert({
    where: { guildId },
    create: settings,
    update: data,
  });
}

export async function findRegistration(
  guildId: string,
  discordUserId: string,
): Promise<Registration | null> {
  return prisma.registration.findUnique({
    where: {
      guildId_discordUserId: { guildId, discordUserId },
    },
  });
}

export async function saveRegistration(
  input: RegistrationInput,
): Promise<Registration> {
  const {
    guildId,
    discordUserId,
    dashboardMessageId,
    ...profile
  } = input;

  const resetReview: Prisma.RegistrationUpdateInput = {
    ...profile,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
  };

  return prisma.registration.upsert({
    where: {
      guildId_discordUserId: { guildId, discordUserId },
    },
    create: {
      guildId,
      discordUserId,
      dashboardMessageId,
      ...profile,
    },
    update: resetReview,
  });
}

export async function getRegistration(
  id: string,
): Promise<Registration | null> {
  return prisma.registration.findUnique({ where: { id } });
}

export async function claimDashboardMessage(
  id: string,
  expectedMessageId: string | null,
  messageId: string,
): Promise<boolean> {
  const result = await prisma.registration.updateMany({
    where: {
      id,
      dashboardMessageId: expectedMessageId,
    },
    data: { dashboardMessageId: messageId },
  });
  return result.count === 1;
}

/**
 * เปลี่ยนสถานะแบบ compare-and-set และคืน row จาก statement เดียว
 * จึงมีแอดมินเพียงคนเดียวที่ชนะเมื่อกดปุ่มพร้อมกัน
 */
export async function transitionRegistration(
  id: string,
  allowedStatuses: RegistrationStatus[],
  nextStatus: RegistrationStatus,
  adminId: string,
): Promise<Registration | null> {
  const rows = await prisma.registration.updateManyAndReturn({
    where: {
      id,
      status: { in: allowedStatuses },
    },
    data: {
      status: nextStatus,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  return rows[0] ?? null;
}

export async function restoreRegistration(
  changed: Registration,
  previous: Registration,
): Promise<Registration | null> {
  const rows = await prisma.registration.updateManyAndReturn({
    where: {
      id: changed.id,
      status: changed.status,
      updatedAt: changed.updatedAt,
    },
    data: {
      status: previous.status,
      reviewedBy: previous.reviewedBy,
      reviewedAt: previous.reviewedAt,
    },
  });

  return rows[0] ?? null;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
