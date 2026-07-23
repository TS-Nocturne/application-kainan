import {
  ChannelType,
  MessageFlags,
  type ModalSubmitInteraction,
} from 'discord.js';
import {
  findRegistration,
  getGuildSettings,
  claimDashboardMessage,
  saveRegistration,
} from '../database.js';
import { componentIds, dashboardPayload } from '../ui.js';
import {
  ValidationError,
  validateRegistrationForm,
} from '../validation.js';

const RESUBMIT_COOLDOWN_MS = 30_000;

function isCoolingDown(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() < RESUBMIT_COOLDOWN_MS;
}

export async function handleRegistrationModal(
  interaction: ModalSubmitInteraction<'cached'>,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const settings = await getGuildSettings(interaction.guildId);
  if (!settings) {
    await interaction.editReply(
      '❌ ระบบยังไม่ได้ตั้งค่า กรุณาแจ้งแอดมินให้ใช้คำสั่ง `/setup`',
    );
    return;
  }

  const existing = await findRegistration(
    interaction.guildId,
    interaction.user.id,
  );

  if (existing?.status === 'approved') {
    await interaction.editReply(
      '✅ คุณได้รับการอนุมัติแล้ว ไม่จำเป็นต้องลงทะเบียนซ้ำ',
    );
    return;
  }

  if (existing && isCoolingDown(existing.updatedAt)) {
    await interaction.editReply(
      '⏳ กรุณารอ 30 วินาทีก่อนส่งแบบฟอร์มอีกครั้ง',
    );
    return;
  }

  let form;
  try {
    form = validateRegistrationForm(
      interaction.fields.getTextInputValue(componentIds.name),
      interaction.fields.getTextInputValue(componentIds.roblox),
      interaction.fields.getTextInputValue(componentIds.gang),
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.editReply(`❌ ${error.message}`);
      return;
    }
    throw error;
  }

  const registration = await saveRegistration({
    guildId: interaction.guildId,
    discordUserId: interaction.user.id,
    discordUsername: interaction.user.username,
    name: form.name,
    robloxUsername: form.robloxUsername,
    gang: form.gang,
    joinedAt: interaction.member.joinedAt ?? new Date(),
    dashboardMessageId: existing?.dashboardMessageId ?? null,
  });

  const adminChannel = await interaction.guild.channels.fetch(
    settings.adminChannelId,
  );
  if (adminChannel?.type !== ChannelType.GuildText) {
    throw new Error('Admin dashboard channel is missing or invalid');
  }

  const dashboardMessage = registration.dashboardMessageId
    ? await adminChannel.messages
        .fetch(registration.dashboardMessageId)
        .catch(() => null)
    : null;

  if (dashboardMessage) {
    await dashboardMessage.edit({
      ...dashboardPayload(registration),
      allowedMentions: { parse: [] },
    });
  } else {
    const newMessage = await adminChannel.send({
      ...dashboardPayload(registration),
      allowedMentions: { parse: [] },
    });
    const claimed = await claimDashboardMessage(
      registration.id,
      registration.dashboardMessageId,
      newMessage.id,
    );

    // มี submission อีกคำขอสร้างการ์ดก่อนหน้าเรา จึงลบการ์ดซ้ำของรอบนี้
    if (!claimed) await newMessage.delete().catch(() => null);
  }

  await interaction.editReply(
    `✅ ส่งข้อมูลสำเร็จ! กรุณารอการเรียกสัมภาษณ์ที่ <#${settings.interviewChannelId}>`,
  );
}
