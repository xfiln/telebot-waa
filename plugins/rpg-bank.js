let handler = async (m, { conn, args, usedPrefix, command }) => {
  let target = (m.mentionedJid && m.mentionedJid[0]) || m.sender
  const user = global.db.data.users[target] ||= {}
  user.name ||= target
  user.exp ||= 0
  user.limit ||= 0
  user.money ||= 0
  user.bank ||= 0
  user.level ||= 1
  user.role ||= 'Player'
  
  let name = user.name
  let exp = user.exp
  let limit = user.limit
  let balance = user.money
  let atm = user.bank
  let level = user.level
  let role = user.role

  let capt = `乂  *🏦 B A N K - U S E R 🏦*  乂\n\n`
  capt += `  ◦  *👤 Nama* : ${name}\n`
  capt += `  ◦  *⭐ Role* : ${role}\n`
  capt += `  ◦  *✨ Exp* : ${exp}\n`
  capt += `  ◦  *📊 Limit* : ${limit}\n`
  capt += `  ◦  *💰 Saldo* : ${balance}\n`
  capt += `  ◦  *📈 Level* : ${level}\n`
  capt += `  ◦  *🏧 ATM* : ${atm}\n\n`
  capt += `${usedPrefix}atm <jumlah>* untuk menabung\n`
  capt += `${usedPrefix}pull <jumlah>* untuk menarik uang\n`

  return conn.reply(
      m.chat,
      capt,
      m
    )
}

handler.help = ['bank']
handler.tags = ['rpg']
handler.command = /^bank$/
handler.rpg = true

module.exports = handler
