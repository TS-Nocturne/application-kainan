import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  escapeMarkdown,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { Registration, RegistrationStatus } from '@prisma/client';

export const componentIds = Object.freeze({
  openRegistration: 'registration:open',
  registrationModal: 'registration:modal',
  name: 'registration:name',
  roblox: 'registration:roblox',
  gang: 'registration:gang',
});

const statusLabels: Record<RegistrationStatus, string> = {
  pending: '🟡 รอตรวจสอบ',
  interviewing: '🔵 เรียกสัมภาษณ์แล้ว',
  approved: '🟢 อนุมัติ',
  rejected: '🔴 ปฏิเสธ',
};

const statusColors: Record<RegistrationStatus, number> = {
  pending: 0xf1c40f,
  interviewing: 0x3498db,
  approved: 0x2ecc71,
  rejected: 0xe74c3c,
};

const joinDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatJoinDate(date: Date): string {
  return joinDateFormatter.format(date);
}

export function welcomePayload() {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🏫 ลงทะเบียนเข้า KAINAN HIGH')
    .setDescription(
      [
        'ยินดีต้อนรับ! กรุณากรอกข้อมูลสั้น ๆ เพื่อส่งให้ทีมงานตรวจสอบ',
        '',
        '• ใช้ชื่อ IC หรือชื่อเล่นที่ต้องการใช้',
        '• กรอก Roblox Username ให้ถูกต้อง',
        '• หากไม่มีสังกัด ให้ใส่ `-`',
        '',
        'เมื่อส่งแล้ว กรุณารอทีมงานเรียกสัมภาษณ์',
      ].join('\n'),
    )
    .setFooter({ text: 'KAINAN HIGH • Registration System' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(componentIds.openRegistration)
      .setLabel('กรอกข้อมูลลงทะเบียน')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

export function registrationModal() {
  const modal = new ModalBuilder()
    .setCustomId(componentIds.registrationModal)
    .setTitle('ลงทะเบียน KAINAN HIGH');

  const name = new TextInputBuilder()
    .setCustomId(componentIds.name)
    .setLabel('Name — ชื่อ IC หรือชื่อเล่น')
    .setPlaceholder('เช่น Kainan Smith')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);

  const roblox = new TextInputBuilder()
    .setCustomId(componentIds.roblox)
    .setLabel('Roblox — Username ในเกม')
    .setPlaceholder('กรอก Username ไม่ใช่ Display Name')
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(20)
    .setRequired(true);

  const gang = new TextInputBuilder()
    .setCustomId(componentIds.gang)
    .setLabel('Gang — สังกัด (ไม่มีให้ใส่ -)')
    .setPlaceholder('-')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(name),
    new ActionRowBuilder<TextInputBuilder>().addComponents(roblox),
    new ActionRowBuilder<TextInputBuilder>().addComponents(gang),
  );

  return modal;
}

export function dashboardPayload(
  registration: Registration,
  disabled = false,
) {
  const embed = new EmbedBuilder()
    .setColor(statusColors[registration.status])
    .setTitle('📋 Registration: KAINAN HIGH')
    .addFields(
      {
        name: 'Discord',
        value: `<@${registration.discordUserId}>\n\`${registration.discordUserId}\``,
      },
      {
        name: 'Name',
        value: escapeMarkdown(registration.name),
        inline: true,
      },
      {
        name: 'Roblox',
        value: escapeMarkdown(registration.robloxUsername),
        inline: true,
      },
      {
        name: 'Gang',
        value: escapeMarkdown(registration.gang),
        inline: true,
      },
      {
        name: 'Join Date',
        value: formatJoinDate(registration.joinedAt),
        inline: true,
      },
      {
        name: 'Status',
        value: statusLabels[registration.status],
      },
    )
    .setFooter({ text: `Registration ID: ${registration.id}` })
    .setTimestamp(registration.updatedAt);

  if (registration.reviewedBy) {
    embed.addFields({
      name: 'ดำเนินการโดย',
      value: `<@${registration.reviewedBy}>`,
    });
  }

  const isFinal =
    disabled ||
    registration.status === 'approved' ||
    registration.status === 'rejected';

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`registration:interview:${registration.id}`)
      .setLabel('เรียกสัมภาษณ์')
      .setEmoji('🗣️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFinal || registration.status === 'interviewing'),
    new ButtonBuilder()
      .setCustomId(`registration:approve:${registration.id}`)
      .setLabel('อนุมัติ')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFinal),
    new ButtonBuilder()
      .setCustomId(`registration:reject:${registration.id}`)
      .setLabel('ปฏิเสธ')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isFinal),
  );

  return { embeds: [embed], components: [row] };
}
