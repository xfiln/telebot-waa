const handler = async (m, { conn, args }) => {
  try {
    if (!args[0]) return m.reply("⚠️ Kirim link postingan Telegram publik.\n\nContoh:\n/copy https://t.me/filnupdates/3");

    const regex = /^https?:\/\/t\.me\/([\w\d_]+)\/(\d+)$/;
    const match = args[0].match(regex);
    if (!match) return m.reply("❌ Format link salah atau tidak didukung.");

    const [, username, msgId] = match;

    // ✅ coba ambil pesan dari channel publik
    const chat = `@${username}`;
    const messageId = parseInt(msgId);
    const copied = await conn.telegram.copyMessage(m.chat, chat, messageId);

    // kalau pesan punya caption atau text
    const txt = copied?.caption || copied?.text || "(tidak ada teks)";
    const clean = txt.replace(/https?:\/\/[^\s]+/g, "").trim();

    const btn = [
      [
        { text: "📋 Salin Manual", callback_data: `copy_${encodeURIComponent(clean.slice(0, 1500))}` },
        { text: "🔗 Buka Asli", url: args[0] },
      ],
    ];

    await conn.sendButt(
      m.chat,
      { text: `✅ *Berhasil disalin dari @${username}*\n\n${clean}`, photo: "https://lann.pw/get-upload?id=uploader-api-1:1752838394888.jpg" },
      btn
    );
  } catch (e) {
    console.error("CopyText Error:", e);
    if (String(e).includes("message to copy not found")) {
      m.reply("❌ Bot belum join ke channel itu. Tambahkan bot ke channel terlebih dahulu.");
    } else {
      m.reply("❌ Gagal mengambil isi pesan. Pastikan link publik dan bot sudah join ke channel.");
    }
  }
};

handler.callback = async (ctx) => {
  try {
    const data = ctx.data || ctx.callbackQuery?.data;
    if (!data?.startsWith("copy_")) return false;

    const txt = decodeURIComponent(data.slice(5));
    await ctx.conn.telegram.answerCbQuery(
      ctx.callbackQuery.id,
      `📋 Teks:\n\n${txt}\n\n(Tekan & tahan untuk salin)`,
      { show_alert: true }
    );
    return true;
  } catch (e) {
    console.error("Copy callback error:", e);
    return true;
  }
};

handler.help = ["copy <link_telegram>"];
handler.tags = ["tools"];
handler.command = /^copy$/i;

module.exports = handler;
