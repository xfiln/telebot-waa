let handler = async (m, { conn }) => {
  // const url = "https://xfiln.github.io/yihaaa/"
  const url = "https://game.filn.xyz/"

  await conn.telegram.callApi("setChatMenuButton", {
    chat_id: m.chat,
    menu_button: {
      type: "web_app",
      text: "Mini App",
      web_app: { url },
    },
  })

  m.reply("✅ Menu Button Mini App sudah diset. Cek tombol di bawah chat.")
}

handler.help = ["setapp"]
handler.tags = ["tools"]
handler.command = /^(setapp|setminiapp)$/i

module.exports = handler