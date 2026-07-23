import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  REST,
  Routes,
  type Interaction,
} from 'discord.js';
import { config } from './config.js';
import { parseAdminAction } from './admin-action.js';
import { disconnectDatabase } from './database.js';
import {
  handleAdminAction,
} from './handlers/admin.js';
import { handleRegistrationModal } from './handlers/registration.js';
import {
  startHealthServer,
  stopHealthServer,
} from './health-server.js';
import { logger } from './logger.js';
import { setupCommand, setupGuild } from './setup.js';
import {
  componentIds,
  registrationModal,
} from './ui.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
const healthServer = startHealthServer(client);

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function replyWithError(interaction: Interaction): Promise<void> {
  if (!interaction.isRepliable()) return;

  const content = '❌ เกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ';

  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply({ content }).catch(() => null);
  } else if (interaction.replied) {
    await interaction.followUp({
      content,
      flags: MessageFlags.Ephemeral,
    }).catch(() => null);
  } else {
    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
    }).catch(() => null);
  }
}

function isConfiguredGuild(interaction: Interaction): boolean {
  return interaction.guildId === config.guildId;
}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`Logged in as ${readyClient.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: [setupCommand.toJSON()] },
    );
    logger.info('Registered /setup command');
  } catch (error) {
    logger.error('Cannot register slash commands', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!isConfiguredGuild(interaction)) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❌ บอทนี้ไม่ได้ตั้งค่าให้ใช้งานในเซิร์ฟเวอร์นี้',
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
      if (
        !interaction.inCachedGuild() ||
        !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
      ) {
        await interaction.reply({
          content: '❌ คำสั่งนี้ใช้ได้เฉพาะ Administrator',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const settings = await setupGuild(interaction.guild);
      await interaction.editReply(
        [
          '✅ ตั้งค่าระบบลงทะเบียนเรียบร้อย',
          `ลงทะเบียน: <#${settings.registrationChannelId}>`,
          `แอดมิน: <#${settings.adminChannelId}>`,
          `รอสัมภาษณ์: <#${settings.interviewChannelId}>`,
          `Role สมาชิก: <@&${settings.memberRoleId}>`,
        ].join('\n'),
      );
      return;
    }

    if (
      interaction.isButton() &&
      interaction.customId === componentIds.openRegistration
    ) {
      await interaction.showModal(registrationModal());
      return;
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId === componentIds.registrationModal
    ) {
      if (!interaction.inCachedGuild()) {
        await interaction.reply({
          content: '❌ แบบฟอร์มนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await handleRegistrationModal(interaction);
      return;
    }

    if (interaction.isButton() && interaction.inCachedGuild()) {
      const action = parseAdminAction(interaction.customId);
      if (action) await handleAdminAction(interaction, action);
    }
  } catch (error) {
    logger.error('Interaction failed', error);
    await replyWithError(interaction);
  }
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', error);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info(`Received ${signal}; shutting down`);
  client.destroy();
  await stopHealthServer(healthServer);
  await disconnectDatabase();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await client.login(config.discordToken);
