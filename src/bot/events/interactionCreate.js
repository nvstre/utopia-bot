import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { client } from '../client.js';
import { db } from '../../core/database.js';
import { VerificationService } from '../../services/verification.js';
import { logger } from '../../core/logger.js';
import crypto from 'crypto';

export async function registerInteractionHandler() {
    client.on(Events.InteractionCreate, async interaction => {
        try {
            // Chat Input Commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction);
            }

            // Buttons
            if (interaction.isButton()) {
                if (interaction.customId === 'submit_tiktok') {
                    const modal = new ModalBuilder()
                        .setCustomId('tiktok_submission_modal')
                        .setTitle('Submit TikTok Video');

                    const urlInput = new TextInputBuilder()
                        .setCustomId('tiktok_url')
                        .setLabel("TikTok Video URL")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://www.tiktok.com/@user/video/...')
                        .setRequired(true);

                    const firstActionRow = new ActionRowBuilder().addComponents(urlInput);
                    modal.addComponents(firstActionRow);

                    await interaction.showModal(modal);
                }

                // VERIFY BUTTON HANDLER
                if (interaction.customId.startsWith('verify_sub_')) {
                    await interaction.deferReply({ ephemeral: true });
                    const submissionId = interaction.customId.replace('verify_sub_', '');

                    const result = await VerificationService.verifySubmission(submissionId);

                    if (result.success) {
                        await interaction.editReply(`✅ **Success!** ${result.message}`);
                    } else {
                        await interaction.editReply(`❌ **Failed:** ${result.message}`);
                    }
                }
            }

            // Modals
            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'tiktok_submission_modal') {
                    const tikTokUrl = interaction.fields.getTextInputValue('tiktok_url');
                    const userId = interaction.user.id;

                    if (!tikTokUrl.includes('tiktok.com')) {
                        await interaction.reply({ content: '❌ Invalid TikTok URL.', ephemeral: true });
                        return;
                    }

                    const verificationCode = VerificationService.generateCode();
                    const submissionId = crypto.randomUUID();

                    // Upsert User
                    const upsertUser = db.prepare(`
            INSERT INTO User (id) VALUES (?)
            ON CONFLICT(id) DO UPDATE SET updatedAt = datetime('now')
          `);
                    upsertUser.run(userId);

                    // Create Submission
                    const insertSubmission = db.prepare(`
            INSERT INTO Submission (id, userId, tikTokUrl, verificationCode, status)
            VALUES (?, ?, ?, ?, ?)
          `);

                    insertSubmission.run(submissionId, userId, tikTokUrl, verificationCode, 'PENDING');

                    // Confirmation with Button
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`verify_sub_${submissionId}`)
                                .setLabel('Confirm Verification')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📢')
                        );

                    await interaction.reply({
                        content: `✅ **Submission Received!**\n\n` +
                            `1. Copy this code: **\`${verificationCode}\`**\n` +
                            `2. Paste it in your **TikTok Bio** or Video Description.\n` +
                            `3. Click the button below to verify immediately.`,
                        components: [row],
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            logger.error('Interaction error', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Error executing command', ephemeral: true });
            } else if (interaction.deferred) {
                await interaction.editReply({ content: 'Error executing command' });
            }
        }
    });
}
