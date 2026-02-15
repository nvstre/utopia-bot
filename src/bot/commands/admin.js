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
            .setColor(0x2B2D31) // Dark Discord Theme
            .addFields(
                { name: '📂 Submisii Recente', value: 'Vezi ultimele solicitări intrate in sistem.', inline: true },
                { name: '👤 Caută User', value: 'Găsește toate submisiile unui utilizator specific.', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('admin_view_recent')
                    .setLabel('🔍 Submisii Recente')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('admin_check_user_btn')
                    .setLabel('👤 Caută User')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
