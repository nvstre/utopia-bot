import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { client } from '../client.js';
import { db } from '../../core/database.js';
import { VerificationService } from '../../services/verification.js';
import { logger } from '../../core/logger.js';
import { config } from '../../config/index.js';
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
                        .setTitle('Trimite Videoclip TikTok');

                    const urlInput = new TextInputBuilder()
                        .setCustomId('tiktok_url')
                        .setLabel("Link TikTok")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://www.tiktok.com/@user/video/...')
                        .setRequired(true);

                    const firstActionRow = new ActionRowBuilder().addComponents(urlInput);
                    modal.addComponents(firstActionRow);

                    await interaction.showModal(modal);
                }

                // YOUR SUBMISSIONS HANDLER
                if (interaction.customId === 'my_submissions') {
                    const userId = interaction.user.id;
                    const submissions = db.prepare('SELECT * FROM Submission WHERE userId = ? ORDER BY createdAt DESC LIMIT 10').all(userId);

                    if (!submissions || submissions.length === 0) {
                        return interaction.reply({
                            content: 'ℹ️ **Nu s-au găsit submisii.**\nApasă "Trimite TikTok" pentru a începe!',
                            ephemeral: true
                        });
                    }

                    const fields = submissions.map(sub => ({
                        name: `📅 ${new Date(sub.createdAt).toLocaleDateString()}`,
                        value: `🔗 [Vezi Video](${sub.tikTokUrl})\n👀 Vizualizări: **${sub.lastViewCount}**\n💰 Puncte: ${sub.totalPointsEarned.toFixed(2)} | Status: **${sub.status}**`,
                        inline: false
                    }));

                    await interaction.reply({
                        embeds: [{
                            title: '📂 Submisile Tale Recente',
                            color: 0x0099ff,
                            fields: fields
                        }],
                        ephemeral: true
                    });
                }

                // SHOP MENU HANDLER
                if (interaction.customId === 'shop_menu') {
                    const userId = interaction.user.id;
                    const user = db.prepare('SELECT balance, ucoins FROM User WHERE id = ?').get(userId);

                    const balance = user ? user.balance.toFixed(2) : '0.00';
                    const ucoins = user ? (user.ucoins || 0).toFixed(2) : '0.00';

                    const embed = new EmbedBuilder()
                        .setTitle('🛒 Magazin Utopia')
                        .setDescription(
                            `**Portofelul Tău:**\n` +
                            `💎 Puncte: **${balance}**\n` +
                            `🪙 UCoins: **${ucoins}**\n\n` +
                            `**Schimb:**\n` +
                            `1 Punct = 1 UCoin\n\n` +
                            `Apasă pe butonul de mai jos pentru a converti toate punctele în UCoins.`
                        )
                        .setColor(0xFFA500);

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('convert_points')
                                .setLabel('Transformă Puncte în UCoins')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('💱')
                        );

                    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                }

                // CONVERT POINTS HANDLER
                if (interaction.customId === 'convert_points') {
                    const userId = interaction.user.id;

                    try {
                        const result = db.transaction(() => {
                            const user = db.prepare('SELECT balance, ucoins FROM User WHERE id = ?').get(userId);
                            if (!user || user.balance < 1) {
                                return { success: false, message: 'Nu ai suficiente puncte (Minim 1).' };
                            }

                            const transferAmount = user.balance;

                            if (transferAmount <= 0) return { success: false, message: 'Balanță 0.' };

                            db.prepare('UPDATE User SET balance = 0, ucoins = ? WHERE id = ?')
                                .run((user.ucoins || 0) + transferAmount, userId);

                            return { success: true, amount: transferAmount };
                        })();

                        if (result.success) {
                            const LogChannelId = config.discord.logChannelId;
                            const logChannel = interaction.guild.channels.cache.get(LogChannelId);

                            if (logChannel) {
                                logChannel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('💸 Schimb Valutar Efectuat')
                                            .setDescription(`**Utilizator:** <@${userId}>\n**Suma:** ${result.amount.toFixed(2)} Puncte -> UCoins`)
                                            .setColor(0x00FF00)
                                            .setTimestamp()
                                    ]
                                });
                            }
                            await interaction.reply({ content: `✅ **Succes!** Ai convertit ${result.amount.toFixed(2)} Puncte în UCoins.`, ephemeral: true });
                        } else {
                            await interaction.reply({ content: `❌ **Eroare:** ${result.message}`, ephemeral: true });
                        }
                    } catch (err) {
                        logger.error('Conversion error', err);
                        await interaction.reply({ content: '❌ Eroare la conversie.', ephemeral: true });
                    }
                }

                // VERIFY BUTTON HANDLER
                if (interaction.customId.startsWith('verify_sub_')) {
                    await interaction.deferReply({ ephemeral: true });
                    const submissionId = interaction.customId.replace('verify_sub_', '');

                    const result = await VerificationService.verifySubmission(submissionId);

                    if (result.success) {
                        await interaction.editReply(`✅ **Succes!** ${result.message}`);
                    } else {
                        // Translate common error messages if strictly needed, or ensure service returns generic enough English/Romanian
                        // For now, let's assume result.message is handled or we just output it. 
                        // Better: update service to return code, and map here. But for now outputting result.
                        await interaction.editReply(`❌ **Eșuat:** ${result.message}`);
                    }
                }

                // ADMIN DELETE HANDLER
                if (interaction.customId.startsWith('admin_delete_')) {
                    if (interaction.user.id !== '1098634271842898071') {
                        return interaction.reply({ content: '⛔ Nu ai permisiunea.', ephemeral: true });
                    }

                    const subId = interaction.customId.replace('admin_delete_', '');
                    try {
                        // Transaction for Atomic Delete
                        const deleteTx = db.transaction(() => {
                            db.prepare('DELETE FROM ViewLog WHERE submissionId = ?').run(subId);
                            db.prepare('DELETE FROM Submission WHERE id = ?').run(subId);
                        });

                        deleteTx();

                        await interaction.reply({ content: `🗑️ Submisia a fost ștearsă cu succes.`, ephemeral: true });
                    } catch (err) {
                        logger.error('Admin delete error for ID: ' + subId, err);
                        await interaction.reply({ content: `❌ Eroare la ștergere: ${err.message}`, ephemeral: true });
                    }
                }

                // ADMIN VERIFY HANDLER
                if (interaction.customId.startsWith('admin_verify_')) {
                    if (interaction.user.id !== '1098634271842898071') {
                        return interaction.reply({ content: '⛔ Nu ai permisiunea.', ephemeral: true });
                    }
                    const subId = interaction.customId.replace('admin_verify_', '');
                    try {
                        db.prepare("UPDATE Submission SET status = 'APPROVED', updatedAt = datetime('now') WHERE id = ?").run(subId);
                        await interaction.reply({ content: `✅ Submisia a fost verificată manual.`, ephemeral: true });
                    } catch (err) {
                        await interaction.reply({ content: `❌ Eroare: ${err.message}`, ephemeral: true });
                    }
                }
            }

            // Modals
            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'tiktok_submission_modal') {
                    const tikTokUrl = interaction.fields.getTextInputValue('tiktok_url');
                    const userId = interaction.user.id;

                    if (!tikTokUrl.includes('tiktok.com')) {
                        await interaction.reply({ content: '❌ Link invalid. Te rog asigură-te că este un link TikTok valid.', ephemeral: true });
                        return;
                    }

                    // CHECK FOR DUPLICATES
                    const existingCheck = db.prepare('SELECT id FROM Submission WHERE tikTokUrl = ?').get(tikTokUrl);
                    if (existingCheck) {
                        await interaction.reply({ content: '⚠️ **Acest video a fost deja trimis!**\nFiecare video poate fi trimis o singură dată.', ephemeral: true });
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

                    // Confirmation with Button - ROMANIAN
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`verify_sub_${submissionId}`)
                                .setLabel('Confirmă Verificarea')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📢')
                        );

                    await interaction.reply({
                        content: `✅ **Submisie Primită!**\n\n` +
                            `1. Copiază acest cod: **\`${verificationCode}\`**\n` +
                            `2. Pune-l în **Bio pe TikTok** sau în Descrierea Videoclipului.\n` +
                            `3. Apasă butonul de mai jos pentru a verifica.`,
                        components: [row],
                        ephemeral: true
                    });
                }
                if (interaction.customId === 'admin_manual_verify_modal') {
                    const subId = interaction.fields.getTextInputValue('submission_id');
                    try {
                        db.prepare("UPDATE Submission SET status = 'APPROVED', updatedAt = datetime('now') WHERE id = ?").run(subId);
                        await interaction.reply({ content: `✅ Submisia ${subId} a fost verificată.`, ephemeral: true });
                    } catch (e) {
                        await interaction.reply({ content: `❌ Eroare: ${e.message}`, ephemeral: true });
                    }
                }

                if (interaction.customId === 'admin_check_user_modal') {
                    const targetUserId = interaction.fields.getTextInputValue('user_id');
                    const submissions = db.prepare('SELECT * FROM Submission WHERE userId = ? ORDER BY createdAt DESC LIMIT 5').all(targetUserId);
                    if (!submissions.length) return interaction.reply({ content: 'Acest user nu are submisii.', ephemeral: true });

                    const embed = new EmbedBuilder().setTitle(`🔎 Submisii pt User: ${targetUserId}`).setColor(0xFF0000);
                    submissions.forEach((sub) => {
                        embed.addFields({
                            name: `ID: ${sub.id.split('-')[0]}...`,
                            value: `🔗 [Link](${sub.tikTokUrl}) | 👀 ${sub.lastViewCount} | ${sub.status}`
                        });
                    });

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        } catch (error) {
            logger.error('Interaction error', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Eroare la executarea comenzii!', ephemeral: true });
            } else if (interaction.deferred) {
                await interaction.editReply({ content: 'Eroare la executarea comenzii!' });
            }
        }
    });
}
