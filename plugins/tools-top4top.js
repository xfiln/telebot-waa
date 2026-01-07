const uploadTop4Top = require('../lib/uploadTop4Top');

let handler = async (m) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || '';
  if (!mime) throw 'Reply atau kirim media yang mau diupload ke Top4Top';
  let media = await q.download();
  if (!media) throw 'Gagal mengunduh media';
  let fileSizeLimit = 50 * 1024 * 1024;
  if (media.length > fileSizeLimit) {
    throw 'Ukuran media tidak boleh melebihi 50MB';
  }

  let { url, deleteUrl } = await uploadTop4Top(media);

  let text = `${url}
${media.length} Byte(s)
(Top4Top - Tidak Ada Tanggal Kedaluwarsa)`;

  if (deleteUrl) {
    text += `\nDelete: ${deleteUrl}`;
  }

  await m.reply(text);
};

handler.help = ['top4top <reply media>', 't4top <reply media>'];
handler.tags = ['tools'];
handler.command = /^(top4top|t4top)$/i;

module.exports = handler;