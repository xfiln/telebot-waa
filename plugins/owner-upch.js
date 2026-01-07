let handler = async (m, { conn, text }) => {
    const CHANNEL_ID = idchannel

    if (!CHANNEL_ID) return m.reply("❌ Channel ID tidak dikonfigurasi.")

    try {
        let sourceChat = null
        let sourceMsgId = null

        console.log("DEBUG Full m object keys:", Object.keys(m))
        console.log("DEBUG m.id:", m.id)
        console.log("DEBUG m.mtype:", m.mtype)
        console.log("DEBUG m.mediaType:", m.mediaType)
        console.log("DEBUG m.mimetype:", m.mimetype)
        console.log("DEBUG m.text:", m.text)
        console.log("DEBUG m.quoted:", m.quoted?.message_id)
        console.log("DEBUG m.msg keys:", m.msg ? Object.keys(m.msg) : "m.msg undefined")
        console.log("DEBUG m.msgs length:", Array.isArray(m.msgs) ? m.msgs.length : "no msgs array")

        // robust detection: quoted message, m.msg, m.msgs array, or current message (m.id)
        let msgObj = null
        if (m.quoted && m.quoted.message_id) {
            sourceChat = m.chat
            sourceMsgId = m.quoted.message_id
            msgObj = m.quoted
            console.log("DEBUG: Using quoted message")
        } else if (m.msg && Object.keys(m.msg).length) {
            sourceChat = m.chat
            sourceMsgId = m.msg.message_id || m.msg.id || m.id
            msgObj = m.msg
            console.log("DEBUG: Using m.msg")
        } else if (Array.isArray(m.msgs) && m.msgs.length) {
            msgObj = m.msgs[0]
            sourceChat = m.chat
            sourceMsgId = msgObj.message_id || msgObj.id
            console.log("DEBUG: Using m.msgs[0]")
        } else if (m.id) {
            // message itself may contain media (sent with caption)
            msgObj = m
            sourceChat = m.chat
            sourceMsgId = m.id
            console.log("DEBUG: Using m.id as source (message contains media)")
        } else {
            console.log("DEBUG: No media message detected")
        }

        console.log("DEBUG sourceChat:", sourceChat)
        console.log("DEBUG sourceMsgId:", sourceMsgId)

        if (sourceMsgId) {
            console.log("DEBUG: Forwarding message")
            await conn.telegram.forwardMessage(
                CHANNEL_ID,
                sourceChat,
                sourceMsgId
            )

            if (text) {
                console.log("DEBUG: Sending additional text:", text)
                await conn.telegram.sendMessage(CHANNEL_ID, text)
            }

            return m.reply("Media berhasil dikirim ke channel.")
        }

        if (text) {
            await conn.telegram.sendMessage(CHANNEL_ID, text)
            return m.reply("Pesan telah dikirim ke channel.")
        }

        return m.reply("Reply media atau isi teks untuk dikirim ke channel.")
    } catch (err) {
        console.error(err)
        return m.reply("❌ Gagal mengirim ke channel.")
    }
}

handler.command = /^ch$/i
handler.owner = true

module.exports = handler
