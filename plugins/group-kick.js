

let handler = async (m, { conn, text, isOwner, isAdmin }) => {
    if (m.fromMe) return;
    if (!m.isGroup) return m.reply('Gunakan di grup!');

    const anonim = [1087968824, 136817688];
    if (!isAdmin && !isOwner && !anonim.includes(m.sender))
        return m.reply('Hanya admin!');

    let target = [];

    if (m.quoted) target.push(m.quoted.sender);
    if (m.mentionedJid?.length)
        target.push(...m.mentionedJid.filter(id => !isNaN(id) && id != m.sender));
    else if (m.mentionedAny?.length) {
        const valid = m.mentionedAny.filter(id => {
            const num = typeof id === 'number' || /^\d+$/.test(String(id));
            return num && id != m.sender && (!m.quoted || id != m.quoted.sender);
        });
        target.push(...valid);
    }

    if (!target.length && text) {
        const id = text.replace(/[^0-9]/g, '');
        if (id.length > 5) target.push(id);
    }

    if (!target.length) {
        const help = `
Tidak ada target!

Cara pakai:
1. Reply pesan → /kick
2. /kick 123456789
3. Klik nama user saat ketik /kick`.trim();
        return conn.sendMessage(m.chat, { text: help }, { quoted: { message_id: m.id } });
    }

    let owner = null;
    try { const c = await conn.telegram.getChat(m.chat); owner = c.creator?.id; }
    catch (e) {}

    let ok = 0, fail = 0, safe = [], kicked = [];

    for (let id of target) {
        if (id == owner || id == conn.botInfo.id || anonim.includes(Number(id))) {
            safe.push(id == owner ? `${id} (Owner)` : id == conn.botInfo.id ? `${id} (Bot)` : `${id} (Anon)`);
            fail++; continue;
        }

        try {
            await conn.telegram.banChatMember(m.chat, id);
            setTimeout(() => conn.telegram.unbanChatMember(m.chat, id).catch(() => {}), 1000);
            ok++; kicked.push(id);
            if (target.length > 1) await new Promise(r => setTimeout(r, 500));
        } catch (e) { fail++; }
    }

    let res = `KICK SUMMARY
Berhasil: ${ok}
Gagal: ${fail}
━━━━━━━━━━━━━━`;

    if (kicked.length) res += `\n\nDikick:\n${kicked.map(id => `• \`${id}\``).join('\n')}`;
    if (safe.length)    res += `\n\nTerlindungi:\n${safe.map(s => `• ${s}`).join('\n')}`;

    await conn.sendMessage(m.chat, { text: res }, { quoted: { message_id: m.id } });
};

handler.help = ['kick <reply/id>'];
handler.tags = ['group'];
handler.command = /^(kic?k|remove|tendang|\-)$/i;
handler.group = true;
handler.botAdmin = true;

module.exports = handler;