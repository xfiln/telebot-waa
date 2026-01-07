const handler = async (m, { conn, text, command }) => {
    // Skip jika bukan di grup
    if (!m.isGroup) {
        return m.reply('❌ Command ini hanya bisa digunakan di grup!');
    }

    let targetUserId = null;

    // Ambil target user dari berbagai sumber
    if (m.quoted) {
        // Dari reply
        targetUserId = m.quoted.sender;
    } else if (m.mentionedAny && m.mentionedAny.length > 0) {
        // Dari mention (bisa user ID atau username)
        targetUserId = m.mentionedAny[0];
    } else if (text) {
        // Dari text (user ID langsung)
        targetUserId = text.replace(/[^0-9]/g, '');
    }

    // Inisialisasi blacklist jika belum ada
    if (!db.data.globalBlacklist) {
        db.data.globalBlacklist = [];
    }

    let globalBlacklist = db.data.globalBlacklist;

    // Cek apakah bot adalah admin
    try {
        const chatMember = await conn.telegram.getChatMember(m.chat, conn.botInfo.id);
        const botIsAdmin = ['administrator', 'creator'].includes(chatMember.status);

        if (!botIsAdmin) {
            return m.reply('❌ Bot harus menjadi admin untuk mengelola blacklist dan melakukan kick.');
        }
    } catch (e) {
        return m.reply('❌ Gagal memeriksa status bot di grup ini.');
    }

    switch (command) {
        case 'blacklist':
            if (!targetUserId) {
                return m.reply('❌ Tag, reply, atau masukkan User ID yang ingin di-blacklist.\n\nContoh:\n• Reply pesan user\n• /blacklist 123456789');
            }

            try {
                if (globalBlacklist.includes(targetUserId)) {
                    throw `User ID \`${targetUserId}\` sudah ada di daftar *Blacklist* global.`;
                }

                // Tambahkan ke blacklist global
                globalBlacklist.push(targetUserId);
                db.data.globalBlacklist = globalBlacklist;

                await m.reply(
                    `✅ *Sukses Blacklist Global*\n\n` +
                    `👤 User ID: \`${targetUserId}\`\n` +
                    `📋 Total Blacklist: ${globalBlacklist.length}\n\n` +
                    `User ini akan otomatis di-kick dari semua grup.`
                );

                // Kick dari semua grup
                await kickFromAllGroups(conn, targetUserId);

            } catch (e) {
                await m.reply(`❌ Error: ${e}`);
            }
            break;

        case 'unblacklist':
            if (!targetUserId) {
                return m.reply('❌ Tag, reply, atau masukkan User ID yang ingin di-unblacklist.');
            }

            try {
                const index = globalBlacklist.indexOf(targetUserId);
                if (index === -1) {
                    throw `User ID \`${targetUserId}\` tidak ada di daftar *Blacklist* global.`;
                }

                // Hapus dari blacklist
                globalBlacklist.splice(index, 1);
                db.data.globalBlacklist = globalBlacklist;

                await m.reply(
                    `✅ *Sukses Unblacklist*\n\n` +
                    `👤 User ID: \`${targetUserId}\`\n` +
                    `📋 Total Blacklist: ${globalBlacklist.length}`
                );

            } catch (e) {
                await m.reply(`❌ Error: ${e}`);
            }
            break;

        case 'listblacklist':
        case 'listbl':
            if (globalBlacklist.length === 0) {
                return m.reply('📋 *Daftar Blacklist Global*\n\n✅ Tidak ada user di blacklist.');
            }

            let txt = `📋 *Daftar Blacklist Global*\n\n`;
            txt += `📊 Total: ${globalBlacklist.length} user\n`;
            txt += `━━━━━━━━━━━━━━━\n\n`;

            globalBlacklist.forEach((userId, index) => {
                txt += `${index + 1}. \`${userId}\`\n`;
            });

            txt += `\n━━━━━━━━━━━━━━━`;

            return m.reply(txt);
            break;
    }
};

// Function untuk kick dari semua grup
async function kickFromAllGroups(conn, userId) {
    try {
        // Get all chats
        const chats = await conn.telegram.getUpdates();
        
        // Note: Telegram Bot API tidak bisa langsung fetch semua grup
        // Kita hanya bisa kick dari grup saat user terdeteksi mengirim pesan
        console.log(`User ${userId} added to global blacklist. Will be kicked when detected in any group.`);
        
    } catch (e) {
        console.error('Error in kickFromAllGroups:', e);
    }
}

// Auto-kick blacklisted users
handler.before = async function (m, { conn, isAdmin, isOwner }) {
    if (!m.isGroup || m.fromMe) return;

    let globalBlacklist = db.data.globalBlacklist || [];

    // Cek apakah sender adalah anonymous admin
    const isAnonymousAdmin = m.sender === 1087968824 || m.sender === 136817688;

    // Skip jika user adalah admin/owner atau anonymous admin
    if (isAdmin || isOwner || isAnonymousAdmin) return;

    // Cek apakah user di blacklist
    if (globalBlacklist.includes(String(m.sender))) {
        try {
            // Kirim pesan warning
            await conn.sendMessage(m.chat, {
                text: `⚠️ User ID \`${m.sender}\` ada dalam daftar blacklist global dan akan dikeluarkan dari grup.`
            });

            // Delay sebentar
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Kick user
            await conn.telegram.banChatMember(m.chat, m.sender);
            
            console.log(`Kicked blacklisted user ${m.sender} from ${m.chat}`);
        } catch (e) {
            console.error(`Failed to kick blacklisted user ${m.sender}:`, e.message);
        }
    }
};

handler.help = ['blacklist', 'unblacklist', 'listblacklist'];
handler.tags = ['owner'];
handler.command = /^(blacklist|unblacklist|listbl|listblacklist)$/i;
handler.group = true;
handler.owner = true;

module.exports = handler;