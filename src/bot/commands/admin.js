import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { db } from '../../core/database.js';

const ADMIN_ID = '1098634271842898071';

export const command = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin Control Panel'),

    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '⛔ Nu ai permisiunea de a folosi acest panou.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Panou Principal Admin')
            .setDescription('Selectează o opțiune din meniul de mai jos:')
            .setColor(0xFF0000)
            .addFields(
                { name: '📂 Submisii Recente', value: 'Vezi ultimele videoclipuri trimise.' },
                { name: '👤 Verifică Utilizator', value: 'Caută submisii după ID-ul utilizatorului.' },
                { name: '✅ Verificare Manuală', value: 'Aprobă manual o submisie după ID.' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('admin_view_recent')
                    .setLabel('Submisii Recente')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📂'),
                new ButtonBuilder()
                    .setCustomId('admin_check_user_btn')
                    .setLabel('Verifică User')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('admin_manual_verify_btn')
                    .setLabel('Verificare Manuală')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
