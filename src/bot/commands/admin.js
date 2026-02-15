import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { db } from '../../core/database.js';

const ADMIN_ID = '1098634271842898071';

export const command = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin Control Panel'),

    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '⛔ You are not authorized to use this command.', ephemeral: true });
        }

        const recentSubmissions = db.prepare(`
      SELECT * FROM Submission 
      ORDER BY createdAt DESC 
      LIMIT 5
    `).all();

        if (recentSubmissions.length === 0) {
            return interaction.reply({ content: 'Nu s-au găsit submisii în baza de date.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Panou Admin - Submisii Recente')
            .setColor(0xFF0000);

        const rows = [];

        recentSubmissions.forEach((sub, index) => {
            embed.addFields({
                name: `ID: ${sub.id.split('-')[0]}... | Utilizator: ${sub.userId}`,
                value: `🔗 [Link](${sub.tikTokUrl}) | Status: **${sub.status}**\nDată: ${new Date(sub.createdAt).toLocaleTimeString()}`
            });

            // Create a delete button for this submission
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`admin_delete_${sub.id}`)
                        .setLabel(`Șterge #${index + 1}`)
                        .setStyle(ButtonStyle.Danger)
                );
            rows.push(row);
        });

        // Discord allows max 5 action rows. We are showing top 5, so 5 rows is perfect.

        await interaction.reply({
            embeds: [embed],
            components: rows,
            ephemeral: true
        });
    }
};
