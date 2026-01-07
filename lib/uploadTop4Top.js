const axios = require("axios");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");

module.exports = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error("Buffer tidak valid atau kosong");
  }

  const fileTypeResult = await fromBuffer(buffer).catch(() => null);
  const ext = fileTypeResult?.ext || "bin";
  const mime = fileTypeResult?.mime || "application/octet-stream";

  const form = new FormData();
  form.append("file_0_", buffer, {
    filename: `file.${ext}`,
    contentType: mime,
  });
  form.append("submitr", "[ رفع الملفات ]");

  const html = await axios
    .post("https://top4top.io/index.php", form, {
      headers: {
        ...form.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
        Accept: "text/html",
      },
    })
    .then((res) => res.data)
    .catch((err) => {
      console.error("Top4Top error:", err?.response?.status, err?.message);
      return null;
    });

  if (!html) throw new Error("Top4Top tidak merespon atau error");

  const match = (re) => {
    const m = html.match(re);
    return m ? m[0] : null;
  };

  const url = match(/https?:\/\/[a-z0-9.-]+\.top4top\.io\/p_[^"' <\n]+/i);
  const deleteUrl = match(/https?:\/\/(?:www\.)?top4top\.io\/del[^"' <\n]+/i);

  if (!url) {
    console.log("Top4Top HTML snippet:", html.slice(0, 500));
    throw new Error("Gagal mendapatkan URL dari Top4Top");
  }

  return { url, deleteUrl };
};