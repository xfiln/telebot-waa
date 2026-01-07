let timeout = 100000
let poin = 10000
let src

const MINI_APP_URL = "https://game.filn.xyz/"

function buildButtons(isGroup) {
  // GROUP → PAKAI URL
  if (isGroup) {
    return {
      inline_keyboard: [
        [
          { text: "🕹️ Buka Mini App", url: MINI_APP_URL },
          { text: "💡 Clue", callback_data: "tebakjkt_clue" }
        ]
      ]
    }
  }

  // PRIVATE → BOLEH web_app
  return {
    inline_keyboard: [
      [
        { text: "🕹️ Buka Mini App", web_app: { url: MINI_APP_URL } },
        { text: "💡 Clue", callback_data: "tebakjkt_clue" }
      ]
    ]
  }
}

let handler = async (m, { conn, usedPrefix }) => {
  conn.tebakjkt ||= {}
  let id = m.chat

  if (id in conn.tebakjkt) {
    return conn.reply(m.chat, 'Masih ada soal belum terjawab', conn.tebakjkt[id][0])
  }

  if (!src) {
    src = await (await fetch(
      `https://api.betabotz.eu.org/api/game/tebakjkt48?apikey=${lann}`
    )).json()
  }

  let json = src[Math.floor(Math.random() * src.length)]
  if (!json) throw "Soal kosong"

  let caption = `
≡ _GAME TEBAK GAMBAR_

┌─⊷ *SOAL*
▢ Timeout *${(timeout / 1000).toFixed(2)} detik*
▢ Bonus: ${poin} money
▢ Ketik ${usedPrefix}jkcu untuk clue
▢ *REPLY pesan ini untuk jawab*
└──────────────
`.trim()

  const reply_markup = buildButtons(m.isGroup)

  conn.tebakjkt[id] = [
    await conn.sendMessage(
  m.chat,
  { image: json.img, caption },
  { quoted: m, reply_markup }
),
    json,
    poin,
    setTimeout(() => {
      if (conn.tebakjkt[id]) {
        conn.reply(m.chat, `⏱ Waktu habis!\nJawaban: *${json.jawaban}*`)
        delete conn.tebakjkt[id]
      }
    }, timeout)
  ]
}

handler.command = /^tebakjkt$/i
handler.tags = ['game']
handler.help = ['tebakjkt']
handler.group = true
handler.limit = false

module.exports = handler
