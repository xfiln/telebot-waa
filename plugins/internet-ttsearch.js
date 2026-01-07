const fetch = require("node-fetch")

const tiktokSessions = {}

function getMessageId(msg) {
  return msg?.message_id
    ?? msg?.id
    ?? msg?.key?.id
    ?? msg?.message?.message_id
    ?? msg?.message?.id
    ?? msg?.message?.key?.id
    ?? null
}

function getChatId(obj) {
  return obj?.chat?.id ?? obj?.chat ?? obj?.message?.chat?.id ?? null
}

function startAutoDeleteTimer(conn, chatId, id) {
  if (!tiktokSessions[id]) return
  clearTimeout(tiktokSessions[id].timeout)
  tiktokSessions[id].timeout = setTimeout(async () => {
    try {
      const msgId = tiktokSessions[id]?.previewMessageId
      if (msgId) await conn.deleteMessage(chatId, msgId).catch(() => {})
      delete tiktokSessions[id]
    } catch {}
  }, 5 * 60 * 1000)
}

function resetAutoDeleteTimer(conn, chatId, id) {
  if (!tiktokSessions[id]) return
  clearTimeout(tiktokSessions[id].timeout)
  startAutoDeleteTimer(conn, chatId, id)
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const chatId = getChatId(m)
  if (!args[0]) {
    return m.reply(`🔎 *Gunakan:*\n${usedPrefix + command} <query>\n\nContoh:\n${usedPrefix + command} anime`)
  }

  const query = args.join(" ")
  const loading = await m.reply(`🔍 Mencari TikTok...\n"${query}"`)

  try {
    const res = await fetch(
      `https://api.betabotz.eu.org/api/search/tiktoks?query=${encodeURIComponent(query)}&apikey=${lann}`
    )
    const json = await res.json()
    const results = json?.result?.data || []

    if (!results.length) {
      await conn.editMessage(chatId, getMessageId(loading), { text: "❌ Tidak ada hasil ditemukan." })
      return
    }

    const id = Date.now().toString()
    tiktokSessions[id] = {
      query,
      results,
      currentIndex: 0,
      previewMessageId: null,
      originalMessageId: getMessageId(m),
      timeout: null
    }

    const item = results[0]
    const caption =
`🎵 *TIKTOK SEARCH*
📌 ${query}

👤 ${item.author.nickname}
❤️ ${item.digg_count} | 💬 ${item.comment_count} | 🔁 ${item.share_count}
⏱ ${item.duration}s`

    const sent = await conn.sendButt(
      chatId,
      {
        text: caption,
        image: item.cover || item.play
      },
      [
        [
          { text: "⬅️", callback_data: `ttsearch_prev_${id}` },
          { text: `1/${results.length}`, callback_data: `ttsearch_info_${id}` },
          { text: "➡️", callback_data: `ttsearch_next_${id}` }
        ],
        [{ text: "📥 Download", callback_data: `ttsearch_download_${id}` }]
      ],
      { message_id: getMessageId(m) },
      { protect_content: true }
    )

    tiktokSessions[id].previewMessageId = sent?.message_id
    startAutoDeleteTimer(conn, chatId, id)
    await conn.deleteMessage(chatId, getMessageId(loading)).catch(() => {})

  } catch (e) {
    await m.reply("❌ Terjadi kesalahan saat mencari TikTok.")
  }
}

handler.callback = async (ctx) => {
  const data = ctx.data
  if (!data || !data.startsWith("ttsearch_")) return false

  const conn = ctx.conn
  const chatId = ctx.callbackQuery.message.chat.id
  const [, action, id] = data.split("_")
  const s = tiktokSessions[id]

  if (!s) return ctx.answerCbQuery("⏰ Sesi sudah berakhir.")
  resetAutoDeleteTimer(conn, chatId, id)

  const r = s.results

  if (action === "prev") {
    s.currentIndex = (s.currentIndex - 1 + r.length) % r.length
    ctx.answerCbQuery("◀️")
    return updateTTSearch(ctx, conn, s, id)
  }

  if (action === "next") {
    s.currentIndex = (s.currentIndex + 1) % r.length
    ctx.answerCbQuery("▶️")
    return updateTTSearch(ctx, conn, s, id)
  }

  if (action === "info") {
    return ctx.answerCbQuery(`${s.currentIndex + 1}/${r.length}`)
  }

  if (action === "download") {
    ctx.answerCbQuery("⏳ Mengirim video...")
    const item = r[s.currentIndex]

    await conn.sendFile(
      chatId,
      item.play,
      "tiktok.mp4",
      `🎬 ${item.title || "TikTok Video"}`,
      { message_id: s.originalMessageId }
    )
    return true
  }

  return false
}

async function updateTTSearch(ctx, conn, s, id) {
  const chatId = ctx.callbackQuery.message.chat.id
  const oldMsg = s.previewMessageId
  const item = s.results[s.currentIndex]

  const caption =
`🎵 *TIKTOK SEARCH*
📌 ${s.query}

👤 ${item.author.nickname}
❤️ ${item.digg_count} | 💬 ${item.comment_count} | 🔁 ${item.share_count}
⏱ ${item.duration}s`

  if (oldMsg) await conn.deleteMessage(chatId, oldMsg).catch(() => {})

  const sent = await conn.sendButt(
    chatId,
    {
      text: caption,
      image: item.cover || item.play
    },
    [
      [
        { text: "⬅️", callback_data: `ttsearch_prev_${id}` },
        { text: `${s.currentIndex + 1}/${s.results.length}`, callback_data: `ttsearch_info_${id}` },
        { text: "➡️", callback_data: `ttsearch_next_${id}` }
      ],
      [{ text: "📥 Download", callback_data: `ttsearch_download_${id}` }]
    ],
    null,
    { protect_content: true }
  )

  s.previewMessageId = sent?.message_id
  return true
}

handler.help = ["ttsearch <query>"]
handler.tags = ["internet"]
handler.command = /^(tiktoksearch|ttsearch)$/i
handler.limit = true

module.exports = handler