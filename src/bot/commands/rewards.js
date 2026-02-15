import { SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
        .setName('rewards')
        .setDescription('Access the Affiliate Rewards System'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎥 Affiliate Rewards System')
            .setDescription(
                'Welcome to the Utopia Affiliate Program!\n\n' +
                '**How it works:**\n' +
                '1. Post a TikTok video promoting our brand.\n' +
                '2. Submit the link here.\n' +
                '3. Verify ownership of the account.\n' +
                '4. Earn points for every view your video gets!\n\n' +
                'Click the buttons below to get started.'
            )
            .setColor(0x0095FF);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('submit_tiktok')
                    .setLabel('Submit TikTok')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎥'),
                new ButtonBuilder()
                    .setCustomId('my_submissions')
                    .setLabel('My Submissions')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊')
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
