let handler = async (m, { conn }) => {
  await conn.telegram.callApi("setChatMenuButton", {
    menu_button: { type: "default" }
  })

  m.reply("✅ Default menu button bot sudah dibalikin ke default.")
}

handler.help = ["delappglobal"]
handler.tags = ["tools"]
handler.command = /^(delappglobal|hapusappglobal)$/i

module.exports = handler
