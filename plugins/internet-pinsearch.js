// const axios = require("axios")
// const fs = require("fs")
// const path = require("path")
// const { searchPinterestAPI, downloadVideo: downloadPinterestVideo } = require("../lib/pinterest")

// const VIDEO_DIR = path.join(__dirname, "../tmp")
// if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true })

// function getMessageId(msg) {
//   return msg?.message_id
//     ?? msg?.id
//     ?? msg?.key?.id
//     ?? msg?.message?.message_id
//     ?? msg?.message?.id
//     ?? msg?.message?.key?.id
//     ?? null
// }

// function getChatId(obj) {
//   return obj?.chat?.id ?? obj?.chat ?? obj?.message?.chat?.id ?? null
// }

// async function safeDelete(conn, chat, msgOrId) {
//   const chatId = getChatId({ chat })
//   const id = typeof msgOrId === "object" ? getMessageId(msgOrId) : msgOrId
//   if (!chatId || !id) return
//   try { await conn.deleteMessage(chatId, id) } catch {}
// }

// async function safeEditOrReply(conn, m, loadingMsg, text) {
//   try {
//     const chatId = getChatId(m)
//     const id = getMessageId(loadingMsg)
//     await conn.editMessage(chatId, id, { text })
//   } catch {
//     try { await m.reply(text) } catch {}
//   }
// }

// async function downloadMedia(url, filename) {
//   const fp = path.join(VIDEO_DIR, filename)
//   const res = await axios.get(url, { responseType: "stream" })
//   await new Promise((resolve, reject) => {
//     const w = fs.createWriteStream(fp)
//     res.data.pipe(w)
//     w.on("finish", resolve)
//     w.on("error", reject)
//   })
//   return fp
// }

// let pinterestSessions = {}

// let handler = async (m, { conn, args, usedPrefix, command }) => {
//   const chatId = getChatId(m)

//   if (!args[0]) {
//     return m.reply(`Pinterest\n${usedPrefix + command} <query> [limit]`)
//   }

//   let query = ""
//   let limit = 30

//   if (args.length >= 2 && !isNaN(args[args.length - 1])) {
//     limit = parseInt(args.pop())
//     query = args.join(" ")
//   } else {
//     query = args.join(" ")
//   }

//   const loading = await m.reply(`🔍 Searching "${query}" (limit ${limit})...`)

//   try {
//     const results = await searchPinterestAPI(query, limit)
//     if (results.length === 0) {
//       await safeEditOrReply(conn, m, loading, "❌ No results found")
//       return
//     }

//     const id = Date.now().toString()
//     pinterestSessions[id] = {
//       query,
//       results,
//       currentIndex: 0,
//       previewMessageId: null,
//       originalMessageId: getMessageId(m)
//     }

//     const item = results[0]
//     const preview = item.type === "image" ? item.url : item.thumbnail

//     const sent = await conn.sendButt(
//       chatId,
//       { text: `🔍 ${query}`, image: preview, disable_web_page_preview: true },
//       [
//         [
//           { text: "⬅️", callback_data: `pinsearch_prev_${id}` },
//           { text: `1/${results.length}`, callback_data: `pinsearch_info_${id}` },
//           { text: "➡️", callback_data: `pinsearch_next_${id}` }
//         ],
//         [{ text: `📥 ${item.type === "video" ? "Video" : "Image"}`, callback_data: `pinsearch_download_${id}` }]
//       ],
//       { message_id: getMessageId(m) }
//     )

//     pinterestSessions[id].previewMessageId = sent?.message_id

//     await safeDelete(conn, m.chat, loading)

//   } catch (err) {
//     await safeEditOrReply(conn, m, loading, `❌ Error: ${err.message}`)
//   }
// }

// handler.callback = async (ctx) => {
//   const data = ctx.data
//   const conn = ctx.conn
//   const chatId = ctx.callbackQuery.message.chat.id
//   const messageId = ctx.callbackQuery.message.message_id

//   if (!data) return false
//   if (!data.startsWith("pinsearch_")) return false

//   const [, action, id] = data.split("_")
//   const s = pinterestSessions[id]
//   if (!s) return ctx.answerCbQuery("Expired")

//   const r = s.results

//   if (action === "prev") {
//     s.currentIndex = (s.currentIndex - 1 + r.length) % r.length
//     ctx.answerCbQuery("◀️")
//     return updateSearch(ctx, conn, s, id)
//   }

//   if (action === "next") {
//     s.currentIndex = (s.currentIndex + 1) % r.length
//     ctx.answerCbQuery("▶️")
//     return updateSearch(ctx, conn, s, id)
//   }

//   if (action === "info") {
//     return ctx.answerCbQuery(`${s.currentIndex + 1}/${r.length}`)
//   }

//   if (action === "download") {
//     ctx.answerCbQuery("Processing...")
//     const item = r[s.currentIndex]
//     const quoted = s.originalMessageId ? { message_id: s.originalMessageId } : {}

//     if (item.type === "video") {
//       const fp = await downloadPinterestVideo(item.url, item.filename, VIDEO_DIR)
//       await conn.sendButt(chatId, { text: item.title, video: { source: fp } }, [], quoted)
//       fs.unlink(fp, () => {})
//     } else {
//       const fp = await downloadMedia(item.url, `pin_${id}_${s.currentIndex}.jpg`)
//       await conn.sendButt(chatId, { text: item.title, image: { source: fp } }, [], quoted)
//       fs.unlink(fp, () => {})
//     }

//     return true
//   }

//   return false
// }

// async function updateSearch(ctx, conn, s, id) {
//   const chatId = ctx.callbackQuery.message.chat.id
//   const oldPreviewId = s.previewMessageId
//   const item = s.results[s.currentIndex]

//   const preview = item.type === "image" ? item.url : item.thumbnail

//   try {
//     if (oldPreviewId) {
//       await conn.deleteMessage(chatId, oldPreviewId)
//     }
//   } catch {}

//   const sent = await conn.sendButt(
//     chatId,
//     { text: item.title, image: preview, disable_web_page_preview: true },
//     [
//       [
//         { text: "⬅️", callback_data: `pinsearch_prev_${id}` },
//         { text: `${s.currentIndex + 1}/${s.results.length}`, callback_data: `pinsearch_info_${id}` },
//         { text: "➡️", callback_data: `pinsearch_next_${id}` }
//       ],
//       [{ text: `📥 ${item.type === "video" ? "Video" : "Image"}`, callback_data: `pinsearch_download_${id}` }]
//     ]
//   )

//   s.previewMessageId = sent?.message_id
//   return true
// }

// handler.help = ["pinsearch <query> [limit]"]
// handler.tags = ["internet"]
// handler.command = /^(pinsearch|pin)$/i

// module.exports = handler


const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { searchPinterestAPI, downloadPinterestVideo } = require("../lib/pinterest");

const VIDEO_DIR = path.join(__dirname, "../tmp");
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

function getMessageId(msg) {
  return msg?.message_id
    ?? msg?.id
    ?? msg?.key?.id
    ?? msg?.message?.message_id
    ?? msg?.message?.id
    ?? msg?.message?.key?.id
    ?? null;
}

function getChatId(obj) {
  return obj?.chat?.id ?? obj?.chat ?? obj?.message?.chat?.id ?? null;
}

async function safeDelete(conn, chat, msgOrId) {
  const chatId = getChatId({ chat });
  const id = typeof msgOrId === "object" ? getMessageId(msgOrId) : msgOrId;
  if (!chatId || !id) return;
  try { await conn.deleteMessage(chatId, id); } catch {}
}

async function safeEditOrReply(conn, m, loadingMsg, text) {
  try {
    const chatId = getChatId(m);
    const id = getMessageId(loadingMsg);
    await conn.editMessage(chatId, id, { text });
  } catch {
    try { await m.reply(text); } catch {}
  }
}

async function downloadMedia(url, filename) {
  const fp = path.join(VIDEO_DIR, filename);
  const res = await axios.get(url, { responseType: "stream", headers: { "User-Agent": "Mozilla/5.0" } });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(fp);
    res.data.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
  });
  return fp;
}

const pinterestSessions = {};

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const chatId = getChatId(m);
  if (!args[0]) return m.reply(`🔎 *Gunakan:*\n${usedPrefix + command} <query> [limit]\n\nContoh:\n${usedPrefix + command} aesthetic wallpaper`);

  let query = "";
  let limit = 30;

  if (args.length >= 2 && !isNaN(args[args.length - 1])) {
    limit = parseInt(args.pop());
    query = args.join(" ");
  } else query = args.join(" ");

  const loading = await m.reply(`🔍 Mencari di Pinterest...\n"${query}" (limit ${limit})`);

  try {
    const results = await searchPinterestAPI(query, limit);
    if (results.length === 0) {
      await safeEditOrReply(conn, m, loading, "❌ Tidak ada hasil ditemukan.");
      return;
    }

    const id = Date.now().toString();
    pinterestSessions[id] = {
      query,
      results,
      currentIndex: 0,
      previewMessageId: null,
      originalMessageId: getMessageId(m),
      timeout: null
    };

    const item = results[0];
    const preview = item.type === "image" ? item.url : item.thumbnail;

    const sent = await conn.sendButt(
      chatId,
      { text: `🔍 ${query}`, image: preview },
      [
        [
          { text: "⬅️", callback_data: `pinsearch_prev_${id}` },
          { text: `1/${results.length}`, callback_data: `pinsearch_info_${id}` },
          { text: "➡️", callback_data: `pinsearch_next_${id}` }
        ],
        [{ text: `📥 ${item.type === "video" ? "Video" : "Image"}`, callback_data: `pinsearch_download_${id}` }]
      ],
      { message_id: getMessageId(m) },
      { protect_content: true }
    );

    pinterestSessions[id].previewMessageId = sent?.message_id;

    // auto delete buttons after 5 minutes inactivity
    startAutoDeleteTimer(conn, chatId, id);

    await safeDelete(conn, m.chat, loading);
  } catch (err) {
    await safeEditOrReply(conn, m, loading, `❌ Error: ${err.message}`);
  }
};

handler.callback = async (ctx) => {
  const data = ctx.data;
  const conn = ctx.conn;
  const chatId = ctx.callbackQuery.message.chat.id;
  const messageId = ctx.callbackQuery.message.message_id;

  if (!data || !data.startsWith("pinsearch_")) return false;

  const [, action, id] = data.split("_");
  const s = pinterestSessions[id];
  if (!s) return ctx.answerCbQuery("⏰ Sesi sudah kadaluarsa.");

  const r = s.results;
  resetAutoDeleteTimer(conn, chatId, id);

  if (action === "prev") {
    s.currentIndex = (s.currentIndex - 1 + r.length) % r.length;
    ctx.answerCbQuery("◀️");
    return updateSearch(ctx, conn, s, id);
  }

  if (action === "next") {
    s.currentIndex = (s.currentIndex + 1) % r.length;
    ctx.answerCbQuery("▶️");
    return updateSearch(ctx, conn, s, id);
  }

  if (action === "info") {
    return ctx.answerCbQuery(`${s.currentIndex + 1}/${r.length}`);
  }

  if (action === "download") {
    ctx.answerCbQuery("⏳ Mengunduh...");
    const item = r[s.currentIndex];
    const quoted = s.originalMessageId ? { message_id: s.originalMessageId } : {};

    try {
      if (item.type === "video") {
        const fp = await downloadPinterestVideo(item.url, item.filename || `video_${Date.now()}`, VIDEO_DIR);
        if (!fp || !fs.existsSync(fp)) {
          await conn.sendMessage(chatId, { text: "❌ Gagal mengunduh video." });
          return;
        }
        await conn.sendButt(chatId, { text: item.title || "Video", video: { source: fp } }, [], quoted, { protect_content: false });
        fs.unlink(fp, () => {});
      } else {
        const fp = await downloadMedia(item.url, `pin_${id}_${s.currentIndex}.jpg`);
        if (!fp || !fs.existsSync(fp)) {
          await conn.sendMessage(chatId, { text: "❌ Gagal mengunduh gambar." });
          return;
        }
        await conn.sendButt(chatId, { text: item.title || "Image", image: { source: fp } }, [], quoted, { protect_content: false });
        fs.unlink(fp, () => {});
      }
    } catch (err) {
      console.error("Download Error:", err);
      await conn.sendMessage(chatId, { text: "❌ Terjadi kesalahan saat mengunduh." });
    }

    return true;
  }

  return false;
};

async function updateSearch(ctx, conn, s, id) {
  const chatId = ctx.callbackQuery.message.chat.id;
  const oldPreviewId = s.previewMessageId;
  const item = s.results[s.currentIndex];
  const preview = item.type === "image" ? item.url : item.thumbnail;

  try {
    if (oldPreviewId) await conn.deleteMessage(chatId, oldPreviewId).catch(() => {});
  } catch {}

  const sent = await conn.sendButt(
    chatId,
    { text: item.title || "Pinterest", image: preview },
    [
      [
        { text: "⬅️", callback_data: `pinsearch_prev_${id}` },
        { text: `${s.currentIndex + 1}/${s.results.length}`, callback_data: `pinsearch_info_${id}` },
        { text: "➡️", callback_data: `pinsearch_next_${id}` }
      ],
      [{ text: `📥 ${item.type === "video" ? "Video" : "Image"}`, callback_data: `pinsearch_download_${id}` }]
    ],
    null,
    { protect_content: true }
  );

  s.previewMessageId = sent?.message_id;
  return true;
}

function startAutoDeleteTimer(conn, chatId, id) {
  if (!pinterestSessions[id]) return;
  clearTimeout(pinterestSessions[id].timeout);
  pinterestSessions[id].timeout = setTimeout(async () => {
    try {
      const msgId = pinterestSessions[id]?.previewMessageId;
      if (msgId) await conn.deleteMessage(chatId, msgId).catch(() => {});
      delete pinterestSessions[id];
    } catch {}
  }, 5 * 60 * 1000); // 5 menit
}

function resetAutoDeleteTimer(conn, chatId, id) {
  if (!pinterestSessions[id]) return;
  clearTimeout(pinterestSessions[id].timeout);
  startAutoDeleteTimer(conn, chatId, id);
}

handler.help = ["pinsearch <query> [limit]"];
handler.tags = ["internet"];
handler.command = /^(pinsearch|pin)$/i;

module.exports = handler;