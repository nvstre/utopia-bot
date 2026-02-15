import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../core/database.js';

export const command = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your rewards balance'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const user = db.prepare('SELECT balance FROM User WHERE id = ?').get(userId);
        const balance = user ? user.balance.toFixed(2) : '0.00';

        const embed = new EmbedBuilder()
            .setTitle('💰 Your Wallet')
            .setDescription(`Current Balance: **${balance} Points**`)
            .setColor(0xFFD700);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
