const uploadFile = require("../lib/uploadFile")
const uploadImage = require("../lib/uploadImage")

function getMime(q) {
  return (
    q?.mimetype ||
    q?.msg?.mimetype ||
    q?.message?.mimetype ||
    q?.mediaType ||
    q?.type ||
    ""
  )
}

let handler = async (m) => {
  let q = m.quoted || m
  let mime = getMime(q)

  if (!mime) throw "Tidak ada media yang ditemukan (reply foto/video)"

  let media = await q.download()
  if (!media) throw "Gagal mengunduh media"

  let fileSizeLimit = 50 * 1024 * 1024
  if (media.length > fileSizeLimit) throw "Ukuran media tidak boleh melebihi 50MB"

  let isImage = /^image\//.test(mime)
  let isVideo = /^video\//.test(mime)

  if (!isImage && !isVideo) throw `Media tidak didukung: ${mime}`

  let link = await (isImage ? uploadImage : uploadFile)(media)

  m.reply(
    `${link}\n${media.length} Byte(s)\n${isImage ? "(Tidak Ada Tanggal Kedaluwarsa)" : "(No Expired)"}`
  )
}

handler.help = ["tourl <reply image/video>"]
handler.tags = ["tools"]
handler.command = /^(upload|tourl)$/i

module.exports = handler