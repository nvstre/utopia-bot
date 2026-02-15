import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { client } from '../client.js';
import { db } from '../../core/database.js';
import { VerificationService } from '../../services/verification.js';
import { logger } from '../../core/logger.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';

export async function registerInteractionHandler() {
    console.log('[DEBUG] Registering Interaction Handler...');
    client.on(Events.InteractionCreate, async interaction => {
        // Debug Log
        console.log(`[Interaction] Type: ${interaction.type}, CustomID: ${interaction.customId || 'N/A'}, Command: ${interaction.commandName || 'N/A'}`);

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

                // ADMIN DASHBOARD & BUTTONS
                if (interaction.customId === 'admin_view_recent') {
                    if (interaction.user.id !== '1098634271842898071') return interaction.reply({ content: '⛔', ephemeral: true });

                    try {
                        const recentSubmissions = db.prepare('SELECT * FROM Submission ORDER BY createdAt DESC LIMIT 5').all();

                        if (!recentSubmissions || recentSubmissions.length === 0) {
                            return interaction.reply({ content: 'ℹ️ **Nu s-au găsit submisii.**', ephemeral: true });
                        }

                        const embed = new EmbedBuilder().setTitle('🛡️ Submisii Recente').setColor(0xFF0000);
                        const rows = [];

                        recentSubmissions.forEach((sub, index) => {
                            const isSus = sub.lastViewCount > 100000;
                            const statusIcon = isSus ? '⚠️ SUSPICIOUS' : sub.status;
                            embed.addFields({
                                name: `ID: ${sub.id.split('-')[0]}... | User: <@${sub.userId}>`,
                                value: `🔗 [Link](${sub.tikTokUrl})\n👀 Views: **${sub.lastViewCount}** | Status: **${statusIcon}**`
                            });
                            rows.push(new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId(`admin_delete_${sub.id}`).setLabel('Șterge').setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId(`admin_verify_${sub.id}`).setLabel('Verifică').setStyle(ButtonStyle.Success)
                            ));
                        });

                        if (rows.length > 5) rows.length = 5;
                        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
                    } catch (error) {
                        logger.error('Admin View Recent Error', error);
                        await interaction.reply({ content: '❌ Eroare la afișarea submisiilor.', ephemeral: true });
                    }
                }

                if (interaction.customId === 'admin_manual_verify_btn') {
                    if (interaction.user.id !== '1098634271842898071') return interaction.reply({ content: '⛔', ephemeral: true });
                    const modal = new ModalBuilder().setCustomId('admin_manual_verify_modal').setTitle('Verificare Manuală');
                    const idInput = new TextInputBuilder().setCustomId('submission_id').setLabel("ID Submisie (Full UUID)").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                    await interaction.showModal(modal);
                }

                if (interaction.customId === 'admin_check_user_btn') {
                    if (interaction.user.id !== '1098634271842898071') return interaction.reply({ content: '⛔', ephemeral: true });
                    const modal = new ModalBuilder().setCustomId('admin_check_user_modal').setTitle('Verifică User');
                    const idInput = new TextInputBuilder().setCustomId('user_id').setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                    await interaction.showModal(modal);
                }

                // SHOP MENU HANDLER
                if (interaction.customId === 'shop_menu') {
                    try {
                        const userId = interaction.user.id;
                        const user = db.prepare('SELECT balance, ucoins FROM User WHERE id = ?').get(userId);

                        const balance = user ? (user.balance || 0).toFixed(2) : '0.00';
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
                            .setColor(0xFFA500)
                            .setFooter({ text: 'Utopia Rewards System' });

                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('shop_convert_modal_btn')
                                    .setLabel('Transformă Puncte în UCoins')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('💱')
                            );

                        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                    } catch (err) {
                        logger.error('Shop Menu Error', err);
                        await interaction.reply({ content: '❌ A apărut o eroare la deschiderea magazinului.', ephemeral: true });
                    }
                }

                // OPEN SHOP CONVERSION MODAL
                if (interaction.customId === 'shop_convert_modal_btn') {
                    const modal = new ModalBuilder()
                        .setCustomId('shop_convert_modal_submission')
                        .setTitle('💱 Convertire Puncte -> UCoins');

                    const amountInput = new TextInputBuilder()
                        .setCustomId('convert_amount')
                        .setLabel("Suma de puncte de convertit")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: 100')
                        .setRequired(true);

                    const usernameInput = new TextInputBuilder()
                        .setCustomId('ingame_username')
                        .setLabel("Numele tău din joc (IGN)")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: RoGamer123')
                        .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(amountInput),
                        new ActionRowBuilder().addComponents(usernameInput)
                    );

                    await interaction.showModal(modal);
                }

                // OLD HANDLER REMOVED - Logic moved to ModalSubmit
                if (interaction.customId === 'convert_points') {
                    await interaction.reply({ content: '❌ Această funcție a fost actualizată. Te rog redeschide meniul.', ephemeral: true });
                }

                // VERIFY BUTTON HANDLER
                if (interaction.customId.startsWith('verify_sub_')) {
                    await interaction.deferReply({ ephemeral: true });
                    const submissionId = interaction.customId.replace('verify_sub_', '');

                    const result = await VerificationService.verifySubmission(submissionId);

                    if (result.success) {
                        await interaction.editReply(`✅ **Succes!** ${result.message}`);
                    } else {
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

                // ADMIN SHOP APPROVE
                if (interaction.customId.startsWith('shop_approve_')) {
                    console.log('[DEBUG] Shop Approve Clicked:', interaction.customId);
                    // ID format: shop_approve_USERID_AMOUNT
                    const parts = interaction.customId.split('_');
                    const targetUserId = parts[2];
                    const amount = parseFloat(parts[3]);

                    await interaction.deferUpdate(); // Defer immediately to prevent timeout

                    try {
                        db.prepare('UPDATE User SET ucoins = ucoins + ? WHERE id = ?').run(amount, targetUserId);

                        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                        embed.setColor(0x00FF00); // Green
                        embed.setTitle('✅ Cerere Schimb Valutar - FINALIZAT');

                        await interaction.editReply({ embeds: [embed], components: [] });

                        // DM User
                        try {
                            const targetUser = await client.users.fetch(targetUserId);
                            await targetUser.send(`✅ **Schimb Finalizat!**\nAdminul a confirmat schimbul tău de **${amount}** puncte. Verifică contul.`);
                        } catch (dmErr) {
                            console.log('[WARN] Could not DM user', dmErr);
                            // Do not fail the whole interaction if DM fails
                            await interaction.followUp({ content: `✅ Aprobat, dar nu am putut trimite DM userului (${dmErr.message}).`, ephemeral: true });
                        }
                    } catch (err) {
                        logger.error('Approve Error', err);
                        await interaction.followUp({ content: '❌ Eroare la aprobare: ' + err.message, ephemeral: true });
                    }
                }

                // ADMIN SHOP DECLINE (REFUND)
                if (interaction.customId.startsWith('shop_decline_')) {
                    console.log('[DEBUG] Shop Decline Clicked:', interaction.customId);
                    const parts = interaction.customId.split('_');
                    const targetUserId = parts[2];
                    const amount = parseFloat(parts[3]);

                    await interaction.deferUpdate();

                    try {
                        // Refund Points
                        db.prepare('UPDATE User SET balance = balance + ? WHERE id = ?').run(amount, targetUserId);

                        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                        embed.setColor(0xFF0000); // Red
                        embed.setTitle('⛔ Cerere Schimb Valutar - RESPINS');
                        embed.setFooter({ text: `Respins de ${interaction.user.tag}` });

                        await interaction.editReply({ embeds: [embed], components: [] });

                        // DM User
                        try {
                            const targetUser = await client.users.fetch(targetUserId);
                            await targetUser.send(`⛔ **Cerere Respinsă.**\nSchimbul tău de **${amount}** puncte a fost respins. Punctele au fost returnate în cont.`);
                        } catch (dmErr) {
                            console.log('[WARN] Could not DM user', dmErr);
                            await interaction.followUp({ content: `⛔ Respins (Refund OK), dar nu am putut trimite DM userului (${dmErr.message}).`, ephemeral: true });
                        }
                    } catch (err) {
                        logger.error('Decline Error', err);
                        await interaction.followUp({ content: '❌ Eroare la respingere: ' + err.message, ephemeral: true });
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

                // SHOP CONVERSION MODAL SUBMIT
                if (interaction.customId === 'shop_convert_modal_submission') {
                    const userId = interaction.user.id;
                    const amountRaw = interaction.fields.getTextInputValue('convert_amount');
                    const ingameName = interaction.fields.getTextInputValue('ingame_username');

                    const amountToConvert = parseInt(amountRaw);

                    if (isNaN(amountToConvert) || amountToConvert < 1) {
                        return interaction.reply({ content: '❌ Suma invalidă. Te rog introdu un număr întreg (min 1), fără virgule sau puncte.', ephemeral: true });
                    }

                    try {
                        const result = db.transaction(() => {
                            const user = db.prepare('SELECT balance, ucoins FROM User WHERE id = ?').get(userId);
                            if (!user || user.balance < amountToConvert) {
                                return { success: false, message: `Nu ai suficiente puncte. Ai doar **${user ? user.balance.toFixed(2) : 0}**.` };
                            }

                            // DEDUCT POINTS ONLY (Do not add UCoins yet)
                            db.prepare('UPDATE User SET balance = balance - ? WHERE id = ?').run(amountToConvert, userId);

                            return { success: true, amount: amountToConvert, remaining: user.balance - amountToConvert };
                        })();

                        if (result.success) {
                            const LogChannelId = config.discord.logChannelId;
                            const logChannel = interaction.guild.channels.cache.get(LogChannelId);

                            if (logChannel) {
                                const actionRow = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`shop_approve_${userId}_${amountToConvert}`)
                                        .setLabel('✅ Finalizat (Aprobă)')
                                        .setStyle(ButtonStyle.Success),
                                    new ButtonBuilder()
                                        .setCustomId(`shop_decline_${userId}_${amountToConvert}`)
                                        .setLabel('⛔ Respinge (Refund)')
                                        .setStyle(ButtonStyle.Danger)
                                );

                                await logChannel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('💸 Cerere Schimb Valutar - PENDING')
                                            .setDescription(
                                                `**Discord User:** <@${userId}> (${interaction.user.tag})\n` +
                                                `**IGN:** \`${ingameName}\`\n` +
                                                `**Suma:** ${result.amount.toFixed(2)} Puncte\n\n` +
                                                `⚠️ **Acțiune necesară:** Verifică dacă ai transferat bunurile în joc, apoi apasă pe Finalizat.`
                                            )
                                            .setColor(0xFFA500) // Orange for Pending
                                            .setTimestamp()
                                    ],
                                    components: [actionRow]
                                });
                            }

                            // Send confirmation to user
                            await interaction.reply({
                                content: `✅ **Cerere trimisă!**\nSuma de **${result.amount.toFixed(2)}** puncte a fost rezervată.\nUn administrator va verifica cererea și vei primi un mesaj când schimbul este finalizat.`,
                                ephemeral: true
                            });

                        } else {
                            await interaction.reply({ content: `❌ **Eroare:** ${result.message}`, ephemeral: true });
                        }
                    } catch (err) {
                        logger.error('Shop conversion error', err);
                        await interaction.reply({ content: '❌ Eroare internă la conversie.', ephemeral: true });
                    }
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
