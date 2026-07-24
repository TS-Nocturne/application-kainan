import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
  type User,
} from 'discord.js';
import type { GuildSettings, Registration } from '@prisma/client';
import type { ParsedAdminAction } from '../admin-action.js';
import {
  getGuildSettings,
  getRegistration,
  restoreRegistration,
  transitionRegistration,
} from '../database.js';
import { logger } from '../logger.js';
import { dashboardPayload } from '../ui.js';

function isAuthorizedAdmin(
  interaction: ButtonInteraction<'cached'>,
  settings: GuildSettings,
): boolean {
  if (
    interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  return Boolean(
    settings.adminRoleId &&
      interaction.member.roles.cache.has(settings.adminRoleId),
  );
}

async function safeDm(user: User, content: string): Promise<void> {
  await user.send({ content, allowedMentions: { parse: [] } }).catch(() => null);
}

async function updateDashboard(
  interaction: ButtonInteraction<'cached'>,
  registration: Registration,
  disabled = false,
): Promise<void> {
  await interaction.message.edit({
    ...dashboardPayload(registration, disabled),
    allowedMentions: { parse: [] },
  });
}

async function reportConcurrentUpdate(
  interaction: ButtonInteraction<'cached'>,
): Promise<void> {
  await interaction.editReply(
    'ℹ️ รายการนี้ถูกดำเนินการโดยแอดมินคนอื่นแล้ว กรุณาตรวจสถานะล่าสุด',
  );
}

async function handleInterview(
  interaction: ButtonInteraction<'cached'>,
  settings: GuildSettings,
  current: Registration,
): Promise<void> {
  const member = await interaction.guild.members
    .fetch(current.discordUserId)
    .catch(() => null);
  const interviewRole = settings.interviewRoleId
    ? await interaction.guild.roles
        .fetch(settings.interviewRoleId)
        .catch(() => null)
    : null;
  const botMember = interaction.guild.members.me;
  const waitingChannel = await interaction.guild.channels.fetch(
    settings.interviewChannelId,
  );
  if (waitingChannel?.type !== ChannelType.GuildText) {
    await interaction.editReply(
      '❌ ไม่พบห้องรอสัมภาษณ์ กรุณารัน `/setup` อีกครั้ง',
    );
    return;
  }

  if (!member || !interviewRole || !botMember) {
    await interaction.editReply(
      '❌ ไม่พบสมาชิกหรือ Role รอสัมภาษณ์ กรุณารัน `/setup` อีกครั้ง',
    );
    return;
  }

  if (
    !interviewRole.editable ||
    botMember.roles.highest.comparePositionTo(interviewRole) <= 0
  ) {
    await interaction.editReply(
      '❌ บอทไม่สามารถมอบ Role รอสัมภาษณ์ได้ กรุณาย้าย Role ของบอทให้อยู่สูงกว่า',
    );
    return;
  }

  const updated = await transitionRegistration(
    current.id,
    ['pending'],
    'interviewing',
    interaction.user.id,
  );
  if (!updated) {
    await reportConcurrentUpdate(interaction);
    return;
  }

  const alreadyHadInterviewRole = member.roles.cache.has(interviewRole.id);
  try {
    if (!alreadyHadInterviewRole) {
      await member.roles.add(
        interviewRole,
        `KAINAN HIGH interview call by ${interaction.user.id}`,
      );
    }
    await waitingChannel.send({
      content: `🗣️ <@${updated.discordUserId}> ทีมงานเรียกสัมภาษณ์แล้ว กรุณารายงานตัวในห้องนี้`,
      allowedMentions: {
        parse: [],
        users: [updated.discordUserId],
      },
    });
  } catch (error) {
    if (!alreadyHadInterviewRole) {
      await member.roles.remove(
        interviewRole,
        'KAINAN HIGH interview call rollback',
      ).catch(() => null);
    }
    const restored = await restoreRegistration(updated, current);
    if (restored) await updateDashboard(interaction, restored);
    logger.error('Cannot send interview notification; status restored', error);
    await interaction.editReply(
      '❌ มอบ Role หรือส่งข้อความเรียกสัมภาษณ์ไม่สำเร็จ สถานะถูกคืนค่าแล้ว',
    );
    return;
  }

  const user = await interaction.client.users
    .fetch(updated.discordUserId)
    .catch(() => null);
  if (user) {
    await safeDm(
      user,
      '🗣️ ทีมงาน KAINAN HIGH เรียกคุณเข้าสัมภาษณ์แล้ว กรุณาไปที่ห้องรอสัมภาษณ์ในเซิร์ฟเวอร์',
    );
  }

  await updateDashboard(interaction, updated);
  await interaction.editReply('✅ ส่งข้อความเรียกสัมภาษณ์เรียบร้อย');
}

async function handleSkip(
  interaction: ButtonInteraction<'cached'>,
  current: Registration,
): Promise<void> {
  const updated = await transitionRegistration(
    current.id,
    ['interviewing'],
    'pending',
    interaction.user.id,
  );
  if (!updated) {
    await reportConcurrentUpdate(interaction);
    return;
  }

  await updateDashboard(interaction, updated);
  await interaction.editReply(
    '⏭️ ข้ามคิวนี้แล้ว สามารถกดเรียกสัมภาษณ์รายการนี้อีกครั้งภายหลังได้',
  );
}

async function handleApprove(
  interaction: ButtonInteraction<'cached'>,
  settings: GuildSettings,
  current: Registration,
): Promise<void> {
  const member = await interaction.guild.members
    .fetch(current.discordUserId)
    .catch(() => null);
  const memberRole = await interaction.guild.roles
    .fetch(settings.memberRoleId)
    .catch(() => null);
  const interviewRole = settings.interviewRoleId
    ? await interaction.guild.roles
        .fetch(settings.interviewRoleId)
        .catch(() => null)
    : null;
  const botMember = interaction.guild.members.me;

  if (!member || !memberRole || !interviewRole || !botMember) {
    await interaction.editReply(
      '❌ ไม่พบสมาชิกหรือ Role ที่ตั้งค่าไว้ กรุณารัน `/setup` และลองใหม่',
    );
    return;
  }

  if (!member.manageable) {
    await interaction.editReply(
      '❌ บอทไม่สามารถเปลี่ยนชื่อสมาชิกคนนี้ได้ กรุณาย้าย Role ของบอทให้อยู่สูงกว่าสมาชิก และตรวจสิทธิ์ Manage Nicknames',
    );
    return;
  }

  if (
    !memberRole.editable ||
    !interviewRole.editable ||
    botMember.roles.highest.comparePositionTo(memberRole) <= 0 ||
    botMember.roles.highest.comparePositionTo(interviewRole) <= 0
  ) {
    await interaction.editReply(
      '❌ บอทไม่สามารถจัดการ Role ได้ กรุณาย้าย Role ของบอทให้อยู่สูงกว่า Citizen และรอสัมภาษณ์',
    );
    return;
  }

  const updated = await transitionRegistration(
    current.id,
    ['pending', 'interviewing'],
    'approved',
    interaction.user.id,
  );
  if (!updated) {
    await reportConcurrentUpdate(interaction);
    return;
  }

  const alreadyHadMemberRole = member.roles.cache.has(memberRole.id);
  const previousNickname = member.nickname;
  const desiredNickname = (current.serverNickname ?? current.name).slice(0, 32);
  const nicknameChanged = previousNickname !== desiredNickname;
  try {
    if (nicknameChanged) {
      await member.setNickname(
        desiredNickname,
        `KAINAN HIGH approval by ${interaction.user.id}`,
      );
    }
    if (!alreadyHadMemberRole) {
      await member.roles.add(
        memberRole,
        `KAINAN HIGH approval by ${interaction.user.id}`,
      );
    }
    if (member.roles.cache.has(interviewRole.id)) {
      await member.roles.remove(
        interviewRole,
        `KAINAN HIGH approval by ${interaction.user.id}`,
      );
    }
  } catch (error) {
    if (!alreadyHadMemberRole) {
      await member.roles.remove(
        memberRole,
        'KAINAN HIGH approval rollback',
      ).catch(() => null);
    }
    if (nicknameChanged) {
      await member.setNickname(
        previousNickname,
        'KAINAN HIGH approval rollback',
      ).catch(() => null);
    }
    const restored = await restoreRegistration(updated, current);
    if (restored) await updateDashboard(interaction, restored);
    logger.error('Cannot change nickname or roles; approval restored', error);
    await interaction.editReply(
      '❌ เปลี่ยนชื่อหรือ Role ไม่สำเร็จ ระบบยกเลิกการอนุมัติเพื่อให้ลองใหม่ได้',
    );
    return;
  }

  await safeDm(
    member.user,
    '🎉 ยินดีต้อนรับสู่ KAINAN HIGH! คุณได้รับการอนุมัติแล้ว ขอให้สนุก!',
  );
  await updateDashboard(interaction, updated, true);
  await interaction.editReply(
    '✅ อนุมัติแล้ว: เปลี่ยนชื่อ ถอด Role รอสัมภาษณ์ และมอบ Citizen เรียบร้อย',
  );
}

async function handleReject(
  interaction: ButtonInteraction<'cached'>,
  settings: GuildSettings,
  current: Registration,
): Promise<void> {
  const member = await interaction.guild.members
    .fetch(current.discordUserId)
    .catch(() => null);
  const interviewRole = settings.interviewRoleId
    ? await interaction.guild.roles
        .fetch(settings.interviewRoleId)
        .catch(() => null)
    : null;
  const botMember = interaction.guild.members.me;

  if (
    member?.roles.cache.has(settings.interviewRoleId ?? '') &&
    (!interviewRole ||
      !botMember ||
      !interviewRole.editable ||
      botMember.roles.highest.comparePositionTo(interviewRole) <= 0)
  ) {
    await interaction.editReply(
      '❌ บอทไม่สามารถถอด Role รอสัมภาษณ์ได้ กรุณาตรวจลำดับ Role แล้วลองใหม่',
    );
    return;
  }

  const updated = await transitionRegistration(
    current.id,
    ['pending', 'interviewing'],
    'rejected',
    interaction.user.id,
  );
  if (!updated) {
    await reportConcurrentUpdate(interaction);
    return;
  }

  try {
    if (member && interviewRole && member.roles.cache.has(interviewRole.id)) {
      await member.roles.remove(
        interviewRole,
        `KAINAN HIGH rejection by ${interaction.user.id}`,
      );
    }
  } catch (error) {
    const restored = await restoreRegistration(updated, current);
    if (restored) await updateDashboard(interaction, restored);
    logger.error('Cannot remove interview role; rejection restored', error);
    await interaction.editReply(
      '❌ ถอด Role รอสัมภาษณ์ไม่สำเร็จ ระบบยกเลิกการปฏิเสธเพื่อให้ลองใหม่ได้',
    );
    return;
  }

  const user = await interaction.client.users
    .fetch(updated.discordUserId)
    .catch(() => null);
  if (user) {
    await safeDm(
      user,
      '❌ ใบลงทะเบียน KAINAN HIGH ของคุณยังไม่ผ่านการอนุมัติ คุณสามารถแก้ไขและส่งใหม่ได้',
    );
  }

  await updateDashboard(interaction, updated, true);
  await interaction.editReply('✅ ปฏิเสธใบลงทะเบียนเรียบร้อย');
}

export async function handleAdminAction(
  interaction: ButtonInteraction<'cached'>,
  parsed: ParsedAdminAction,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const settings = await getGuildSettings(interaction.guildId);
  if (!settings || !isAuthorizedAdmin(interaction, settings)) {
    await interaction.editReply(
      '❌ ปุ่มนี้ใช้ได้เฉพาะ Administrator หรือ Role ทีมงานที่ตั้งค่าไว้',
    );
    return;
  }

  const current = await getRegistration(parsed.registrationId);
  if (!current || current.guildId !== interaction.guildId) {
    await interaction.editReply('❌ ไม่พบข้อมูลลงทะเบียนนี้');
    return;
  }

  if (current.status === 'approved' || current.status === 'rejected') {
    await updateDashboard(interaction, current, true);
    await interaction.editReply('ℹ️ รายการนี้ดำเนินการเรียบร้อยแล้ว');
    return;
  }

  switch (parsed.action) {
    case 'interview':
      await handleInterview(interaction, settings, current);
      break;
    case 'skip':
      await handleSkip(interaction, current);
      break;
    case 'approve':
      await handleApprove(interaction, settings, current);
      break;
    case 'reject':
      await handleReject(interaction, settings, current);
      break;
  }
}
