const fs = require("fs")
const path = require("path")
const os = require("os")
const axios = require("axios")
const FormData = require("form-data")
const crypto = require("crypto")
const { fromBuffer } = require("file-type")

const {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} = require("@google/genai")

const ai = new GoogleGenAI({ apiKey: geminiKey })

async function uploadTop4Top(filePath) {
  const f = new FormData()
  f.append("file_0_", fs.createReadStream(filePath), path.basename(filePath))
  f.append("submitr", "[ رفع الملفات ]")

  const html = await axios
    .post("https://top4top.io/index.php", f, {
      headers: {
        ...f.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
        Accept: "text/html",
      },
    })
    .then((x) => x.data)

  const m =
    html.match(/value="(https:\/\/[a-z]\.top4top\.io\/p_[^"]+)"/) ||
    html.match(/https:\/\/[a-z]\.top4top\.io\/p_[^"]+/)

  if (!m) throw new Error("Top4Top gagal")
  return m[1] || m[0]
}

async function uploadUguu(filePath) {
  const form = new FormData()
  form.append("files[]", fs.createReadStream(filePath))

  const { data } = await axios.post("https://uguu.se/upload.php", form, {
    headers: form.getHeaders(),
  })

  if (!data.files?.[0]?.url) throw new Error("Uguu gagal")
  return data.files[0].url
}

async function videy(filePath) {
  const form = new FormData()
  form.append("file", fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: "video/mp4",
  })

  const r = await axios.post(
    "https://videy.co/api/upload?visitorId=" + crypto.randomUUID(),
    form,
    {
      headers: {
        ...form.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
        origin: "https://videy.co",
        referer: "https://videy.co/",
        accept: "application/json",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  )

  if (!r.data?.link) throw new Error("Videy gagal")
  return r.data.link
}

async function detect18PlusByGemini(filePath, mimeType) {
  if (!geminiKey) return "SAFE"

  const f = await ai.files.upload({
    file: filePath,
    config: { mimeType },
  })

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      createPartFromUri(f.uri, f.mimeType),
      `Return ONLY one word:
SAFE
SUGGESTIVE
EXPLICIT`,
    ]),
    generationConfig: { temperature: 0 },
  })

  return (res.text || "").trim()
}

module.exports = async (buffer) => {
  const ft = await fromBuffer(buffer)
  if (!ft) throw new Error("File type tidak dikenali")

  const temp = path.join(os.tmpdir(), `up_${Date.now()}.${ft.ext}`)
  fs.writeFileSync(temp, buffer)

  try {
    const label = await detect18PlusByGemini(temp, ft.mime)
    const is18 = label === "SUGGESTIVE" || label === "EXPLICIT"

    if (is18 && ft.mime.startsWith("video/")) {
      if (ft.mime !== "video/mp4") throw new Error("Videy hanya support video/mp4")
      return await videy(temp)
    }

    try {
      return Math.random() < 0.5
        ? await uploadUguu(temp)
        : await uploadTop4Top(temp)
    } catch {
      return Math.random() < 0.5
        ? await uploadTop4Top(temp)
        : await uploadUguu(temp)
    }
  } finally {
    fs.unlink(temp, () => {})
  }
}