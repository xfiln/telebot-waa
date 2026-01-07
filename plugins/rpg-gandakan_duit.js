let handler = async (m, { conn, args, usedPrefix, command }) => {
  const user = global.db.data.users[m.sender] ||= {}
  user.money ||= 0
  user.money ||= 0
  user.lastGandakan ||= 0

  const cd = 10 * 60 * 1000
  const now = Date.now()
  const diff = now - user.lastGandakan
  if (diff < cd) {
    const sisa = cd - diff
    return conn.reply(m.chat, `⏳ Cooldown: ${Math.ceil(sisa / 1000)} detik`, m)
  }

  let amount = parseInt(args[0])
  if (!amount || amount <= 0) {
    return conn.reply(m.chat, `Contoh:\n${usedPrefix + command} 5000`, m)
  }

  if (user.money < amount) {
    return conn.reply(m.chat, `❌ Saldo bank kamu kurang.\n🏦 Bank: ${user.money}`, m)
  }

  user.lastGandakan = now

  const successRate = 55
  const bonusMin = 20
  const bonusMax = 80
  const penaltyMin = 10
  const penaltyMax = 40

  const roll = Math.floor(Math.random() * 100) + 1

  if (roll <= successRate) {
    const bonusPct = Math.floor(Math.random() * (bonusMax - bonusMin + 1)) + bonusMin
    const bonus = Math.floor(amount * bonusPct / 100)

    user.money += bonus

    return conn.reply(
      m.chat,
      `✅ *GAGAL TIDAK TERJADI* 😼\n` +
      `✨ Penggandaan berhasil!\n\n` +
      `📥 Modal: ${amount}\n` +
      `📈 Bonus: +${bonus} (${bonusPct}%)\n` +
      `🏦 Bank sekarang: ${user.money}`,
      m
    )
  } else {
    const penPct = Math.floor(Math.random() * (penaltyMax - penaltyMin + 1)) + penaltyMin
    const loss = Math.floor(amount * penPct / 100)

    user.money = Math.max(0, user.money - loss)

    return conn.reply(
      m.chat,
      `💥 *GAGAL!* Sistem bank nge-detect anomali.\n\n` +
      `📥 Modal: ${amount}\n` +
      `📉 Denda: -${loss} (${penPct}%)\n` +
      `🏦 Bank sekarang: ${user.money}`,
      m
    )
  }
}

handler.help = ["gandakan <jumlah>"]
handler.tags = ["rpg"]
handler.command = /^(gandakan)$/i
handler.limit = true

module.exports = handler
