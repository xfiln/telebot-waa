const chalk = require("chalk")
const fs = require("fs")

function safeString(x) {
  if (x === null || x === undefined) return ""
  return typeof x === "string" ? x : String(x)
}

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x)
}

function pickText(obj) {
  if (!isObj(obj)) return ""
  if (typeof obj.text === "string") return obj.text
  if (typeof obj.caption === "string") return obj.caption
  if (isObj(obj.content) && typeof obj.content.text === "string") return obj.content.text
  if (isObj(obj.content) && typeof obj.content.caption === "string") return obj.content.caption
  return ""
}

function pickFlags(obj) {
  const flags = []
  if (!isObj(obj)) return flags

  const c = isObj(obj.content) ? obj.content : obj

  if (c.image || c.photo) flags.push("IMG")
  if (c.video) flags.push("VID")
  if (c.document || c.file) flags.push("DOC")
  if (c.audio || c.voice) flags.push("AUD")
  if (c.sticker) flags.push("STK")

  const mt = safeString(obj.mtype || obj.type || "")
  if (/photo|image/i.test(mt) && !flags.includes("IMG")) flags.push("IMG")
  if (/video/i.test(mt) && !flags.includes("VID")) flags.push("VID")
  if (/document|file/i.test(mt) && !flags.includes("DOC")) flags.push("DOC")
  if (/audio|voice/i.test(mt) && !flags.includes("AUD")) flags.push("AUD")
  if (/sticker/i.test(mt) && !flags.includes("STK")) flags.push("STK")

  return flags
}

async function print(a, b, c, d) {
  try {
    let chatId = "-"
    let sender = "-"
    let direction = "IN"
    let text = ""
    let flags = []

    if (isObj(a) && (a.content || a.chat || a.jid || a.to || a.from)) {
      const payload = a
      const outgoing = !!b || !!c
      direction = outgoing ? "OUT" : "IN"

      const content = isObj(payload.content) ? payload.content : {}
      chatId = payload.chat || payload.jid || payload.to || payload.from || "-"
      sender = payload.sender || payload.from || (outgoing ? "Bot" : "User")
      text = pickText(payload) || pickText(content) || ""
      flags = pickFlags(payload)
    } else if (isObj(a) && (a.text != null || a.msgs || a.chat || a.sender)) {
      const m = a
      direction = d ? "OUT" : "IN"
      chatId = m.chat || m.chatId || m.jid || "-"
      sender = m.sender || m.userId || (d ? "Bot" : "User")
      text = pickText(m) || ""
      flags = pickFlags(m)
    } else {
      console.log(chalk.gray("[PRINT]"), a)
      return true
    }

    const head =
      chalk.gray(`[${direction}]`) +
      " " +
      chalk.cyan(safeString(chatId)) +
      " " +
      chalk.green(safeString(sender)) +
      (flags.length ? chalk.yellow(` (${flags.join(",")})`) : "")

    const body = text ? safeString(text).slice(0, 3000) : "(no text)"
    console.log("\n" + head + "\n" + body + "\n")
    return true
  } catch (e) {
    try {
      console.log(chalk.red("[PRINT ERROR]"), e?.message || e)
    } catch {}
    return false
  }
}

module.exports = print

const file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("Update 'lib/print.js'"))
  delete require.cache[file]
  require(file)
})