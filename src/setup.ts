import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Guild,
  type OverwriteResolvable,
  type Role,
  type TextChannel,
} from 'discord.js';
import { config } from './config.js';
import { getGuildSettings, saveGuildSettings } from './database.js';
import { welcomePayload } from './ui.js';

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('สร้างและตั้งค่าระบบลงทะเบียน KAINAN HIGH')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

async function fetchTextChannel(
  guild: Guild,
  id: string | null | undefined,
): Promise<TextChannel | null> {
  if (!id) return null;
  const channel = await guild.channels.fetch(id).catch(() => null);
  return channel?.type === ChannelType.GuildText ? channel : null;
}

async function fetchRole(
  guild: Guild,
  id: string | null | undefined,
): Promise<Role | null> {
  if (!id) return null;
  return guild.roles.fetch(id).catch(() => null);
}

async function getOrCreateTextChannel(
  guild: Guild,
  channelId: string | null | undefined,
  options: {
    name: string;
    topic: string;
    permissionOverwrites: OverwriteResolvable[];
  },
): Promise<TextChannel> {
  const existing = await fetchTextChannel(guild, channelId);
  if (existing) {
    await existing.permissionOverwrites.set(
      options.permissionOverwrites,
      'KAINAN HIGH secure setup',
    );
    return existing;
  }

  return guild.channels.create({
    ...options,
    type: ChannelType.GuildText,
    reason: 'KAINAN HIGH registration setup',
  });
}

export async function setupGuild(guild: Guild) {
  const saved = await getGuildSettings(guild.id);
  const everyone = guild.roles.everyone;
  const botMember = guild.members.me;
  if (!botMember) throw new Error('Bot member is not available in the guild');

  let memberRole = await fetchRole(
    guild,
    config.memberRoleId ?? saved?.memberRoleId,
  );
  if (!memberRole) {
    memberRole = await guild.roles.create({
      name: 'Citizen',
      color: 0x2ecc71,
      reason: 'KAINAN HIGH registration setup',
    });
  }

  const registrationPermissions: OverwriteResolvable[] = [
    {
      id: everyone.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],
      deny: [PermissionFlagsBits.SendMessages],
    },
    {
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  const registrationChannel = await getOrCreateTextChannel(
    guild,
    config.registrationChannelId ?? saved?.registrationChannelId,
    {
      name: '📝ลงทะเบียน-kainan',
      topic: 'ลงทะเบียนเข้า KAINAN HIGH',
      permissionOverwrites: registrationPermissions,
    },
  );

  const interviewChannel = await getOrCreateTextChannel(
    guild,
    config.interviewChannelId ?? saved?.interviewChannelId,
    {
      name: '🔊รอสัมภาษณ์',
      topic: 'รอทีมงานเรียกสัมภาษณ์',
      permissionOverwrites: [
        {
          id: everyone.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: botMember.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    },
  );

  const adminRole = await fetchRole(
    guild,
    config.adminRoleId ?? saved?.adminRoleId,
  );
  const adminPermissions: OverwriteResolvable[] = [
    {
      id: everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (adminRole) {
    adminPermissions.push({
      id: adminRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const adminChannel = await getOrCreateTextChannel(
    guild,
    config.adminChannelId ?? saved?.adminChannelId,
    {
      name: '💻admin-dashboard',
      topic: 'จัดการใบลงทะเบียน KAINAN HIGH',
      permissionOverwrites: adminPermissions,
    },
  );

  const oldWelcomeMessage = saved?.welcomeMessageId
    ? await registrationChannel.messages
        .fetch(saved.welcomeMessageId)
        .catch(() => null)
    : null;

  const welcomeMessage = oldWelcomeMessage
    ? await oldWelcomeMessage.edit(welcomePayload())
    : await registrationChannel.send({
        ...welcomePayload(),
        allowedMentions: { parse: [] },
      });

  return saveGuildSettings({
    guildId: guild.id,
    registrationChannelId: registrationChannel.id,
    adminChannelId: adminChannel.id,
    interviewChannelId: interviewChannel.id,
    memberRoleId: memberRole.id,
    adminRoleId: adminRole?.id ?? null,
    welcomeMessageId: welcomeMessage.id,
  });
}
