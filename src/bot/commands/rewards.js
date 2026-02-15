import { SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Deschide meniul principal Utopia'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎥 Sistem de Recompense Utopia')
            .setDescription(
                'Bine ai venit în Sistemul de Afiliere Utopia!\n\n' +
                '**Cum funcționează:**\n' +
                '1. Postează un video pe TikTok promovând brandul nostru.\n' +
                '2. Trimite link-ul aici.\n' +
                '3. Verifică deținerea contului.\n' +
                '4. Câștigă puncte automat pentru fiecare vizualizare!\n\n' +
                'Apasă butoanele de mai jos pentru a începe.'
            )
            .setColor(0x0095FF);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('submit_tiktok')
                    .setLabel('Trimite TikTok')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎥'),
                new ButtonBuilder()
                    .setCustomId('my_submissions')
                    .setLabel('Submisile Mele')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('shop_menu')
                    .setLabel('Magazin')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛒')
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
