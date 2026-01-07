let handler = async (m, { conn }) => {
    let user = global.db.data.users[m.sender];
    if (!user) return m.reply("Kamu belum terdaftar.");

    let from = m.from || {};
    let name =
        (from.username ? "@" + from.username :
        from.first_name ? from.first_name :
        from.last_name ? from.last_name :
        m.sender || "User");

    const f = (l, v) => v > 0 ? `${l}: *${v}*\n` : "";

    let inv = `🏅 INVENTORY\n`;
    inv += `━━━━━━━━━━━━━━\n`;
    inv += `👤 User: ${name}\n`;
    inv += `💰 Money: ${user.money}\n`;
    inv += `⭐ Exp: ${user.exp}\n`;
    inv += `❤️ Healt: ${user.healt}\n`;
    inv += `⚡ Stamina: ${user.stamina}\n`;
    inv += `━━━━━━━━━━━━━━\n\n`;

    inv += `⛏️ HASIL TAMBANG\n`;
    inv += f("💎 Diamond", user.resources?.diamond || 0);
    inv += f("🟢 Emerald", user.resources?.emerald || 0);
    inv += f("⚫ Coal", user.resources?.coal || 0);
    inv += f("⛓ Iron", user.resources?.iron || 0);
    inv += `━━━━━━━━━━━━━━\n\n`;

    inv += `🐾 HEWAN\n`;
    inv += f("🦀 Kepiting", user.kepiting);
    inv += f("🦞 Lobster", user.lobster);
    inv += f("🦐 Udang", user.udang);
    inv += f("🦑 Cumi", user.cumi);
    inv += f("🐙 Gurita", user.gurita);
    inv += f("🐡 Buntal", user.buntal);
    inv += f("🐠 Dory", user.dory);
    inv += f("🐬 Lumba", user.lumba);
    inv += f("🐋 Paus", user.paus);
    inv += f("🐅 Harimau", user.harimau);
    inv += f("🐃 Banteng", user.banteng);
    inv += f("🐖 Babi", user.babi);
    inv += f("🐗 Babi Hutan", user.babihutan);
    inv += f("🐂 Sapi", user.sapi);
    inv += f("🐐 Kambing", user.kambing);
    inv += f("🐒 Monyet", user.monyet);
    inv += f("🐊 Buaya", user.buaya);
    inv += f("🐼 Panda", user.panda);
    inv += `━━━━━━━━━━━━━━\n\n`;

    inv += `🎒 ITEM\n`;
    inv += f("🧪 Potion", user.potion);
    inv += f("📦 Common", user.common);
    inv += f("📦 Uncommon", user.uncommon);
    inv += f("💠 Mythic", user.mythic);
    inv += f("👑 Legendary", user.legendary);
    inv += f("🛡 Armor", user.armor);
    inv += f("🗑 Sampah", user.sampah);

    await conn.reply(m.chat, inv, m);
};

handler.help = ['inv', 'inventory'];
handler.tags = ['rpg'];
handler.command = /^(inv|inventory|bag)$/i;

module.exports = handler;
