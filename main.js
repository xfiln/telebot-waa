// const { Telegraf } = require("telegraf")
// const fs = require("fs")
// const path = require("path")
// const syntaxError = require("syntax-error")
// const child_process = require("child_process")
// require("./config")
// const chalk = require("chalk")
// const { getMimeType } = require("./lib/getMime")
// const { EventEmitter } = require("events")

// EventEmitter.defaultMaxListeners = 0
// try { process.setMaxListeners(0) } catch {}

// function pickTelegramToken() {
//   const candidates = [
//     process.env.BOT_TOKEN,
//     process.env.TELEGRAM_TOKEN,
//     global.telegramToken,
//     global.botToken,
//     global.token,
//   ].filter(Boolean)

//   for (const t of candidates) {
//     const s = String(t).trim()
//     if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(s)) return s
//   }
//   return String(candidates[0] || "").trim()
// }

// function pickGithubToken() {
//   const candidates = [
//     process.env.GITHUB_TOKEN,
//     process.env.GH_TOKEN,
//     global.githubToken,
//     global.ghToken,
//     global.token,
//   ].filter(Boolean)

//   for (const t of candidates) {
//     const s = String(t).trim()
//     if (/^(ghp_|github_pat_)/i.test(s)) return s
//   }
//   return ""
// }

// const BOT_TOKEN_RAW = pickTelegramToken()
// const conn = new Telegraf(BOT_TOKEN_RAW)

// const BOT_USERNAME = process.env.BOT_USERNAME || global.botnames?.replace(/^@/, "") || "Filnz_bot"

// global.stripAtSuffix = (s) =>
//   String(s || "").replace(new RegExp(`@${BOT_USERNAME}$`, "i"), "")

// global.atifyCommands = (handler) => {
//   if (!handler || !handler.command) return handler
//   const list = Array.isArray(handler.command) ? handler.command : [handler.command]
//   const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
//   const toRegex = (c) =>
//     c instanceof RegExp
//       ? c
//       : new RegExp(`^${esc(c)}(?:@${BOT_USERNAME.replace(/_/g, "[_]*")})?$`, "i")
//   handler.command = list.map(toRegex)
//   return handler
// }

// global.BOT_USERNAME = BOT_USERNAME
// console.log(`[✓] BOT_USERNAME set to @${BOT_USERNAME}`)

// global.API = (name, pathUrl = "/", query = {}, apikeyqueryname) =>
//   (name in global.APIs ? global.APIs[name] : name) +
//   pathUrl +
//   (query || apikeyqueryname
//     ? "?" +
//       new URLSearchParams(
//         Object.entries({
//           ...query,
//           ...(apikeyqueryname
//             ? {
//                 [apikeyqueryname]:
//                   global.APIKeys[name in global.APIs ? global.APIs[name] : name],
//               }
//             : {}),
//         }),
//       )
//     : "")

// global.timestamp = { start: new Date() }

// function waktuWIB() {
//   const now = new Date()
//   const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
//   const options = {
//     weekday: "short",
//     year: "numeric",
//     month: "short",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     timeZone: "Asia/Jakarta",
//     timeZoneName: "longOffset",
//   }
//   const formatted = wibTime.toLocaleString("en-US", options)
//   return `[${formatted.replace(/GMT\+7/, "GMT+0700")} (Western Indonesia Time - WIB)]`
// }

// conn.logger = {
//   info: (msg) =>
//     console.log(
//       `${chalk.green.bold("INFO")} ${chalk.white.bold(waktuWIB())}: ${chalk.cyan(msg)}`,
//     ),
//   warn: (msg) =>
//     console.log(
//       `${chalk.hex("#FF8800").bold("WARNING")} ${chalk.white.bold(waktuWIB())}: ${chalk.yellow(msg)}`,
//     ),
//   error: (msg) =>
//     console.log(
//       `${chalk.red.bold("ERROR")} ${chalk.white.bold(waktuWIB())}: ${chalk.red(msg)}`,
//     ),
// }

// require("./lib/simple")(conn)

// const DB_FILE = path.join(__dirname, "database.json")

// global.db = {
//   data: null,
//   READ: false,
// }

// function ensureDbShape() {
//   if (!global.db.data || typeof global.db.data !== "object") global.db.data = {}
//   const base = global.db.data
//   if (!base.users || typeof base.users !== "object") base.users = {}
//   if (!base.chats || typeof base.chats !== "object") base.chats = {}
//   if (!base.stats || typeof base.stats !== "object") base.stats = {}
//   if (!base.msgs || typeof base.msgs !== "object") base.msgs = {}
//   if (!base.sticker || typeof base.sticker !== "object") base.sticker = {}
// }

// global.loadDatabase = async () => {
//   if (global.db.READ) return global.db.data
//   if (global.db.data !== null) return global.db.data

//   global.db.READ = true
//   try {
//     console.log(chalk.cyan("🗂  DB file:"), DB_FILE)

//     if (fs.existsSync(DB_FILE)) {
//       try {
//         const raw = fs.readFileSync(DB_FILE, "utf8").trim()
//         global.db.data = raw.length > 0 ? JSON.parse(raw) : null
//       } catch (e) {
//         console.log(chalk.red("Gagal parse database.json, reset baru:"), e.message)
//         global.db.data = null
//       }
//     } else {
//       global.db.data = null
//     }

//     ensureDbShape()
//     console.log(
//       chalk.green(
//         `✅ Database loaded. users: ${
//           Object.keys(global.db.data.users).length
//         }, chats: ${Object.keys(global.db.data.chats).length}`,
//       ),
//     )
//   } finally {
//     global.db.READ = false
//   }

//   return global.db.data
// }

// async function saveDatabase() {
//   try {
//     if (!global.db.data) return
//     ensureDbShape()
//     fs.writeFileSync(DB_FILE, JSON.stringify(global.db.data, null, 2))
//   } catch (e) {
//     console.log(chalk.red("Save database error:"), e)
//   }
// }

// global.saveDatabase = saveDatabase

// ;(async () => {
//   await global.loadDatabase()
//   setInterval(saveDatabase, 30000)
// })()

// global.File = class File extends Blob {
//   constructor(chunks, name, opts = {}) {
//     super(chunks, opts)
//     this.name = name
//     this.lastModified = opts.lastModified || Date.now()
//   }
// }

// global.cleartmp = () => {
//   const tmpDir = path.join(__dirname, "tmp")
//   if (fs.existsSync(tmpDir)) {
//     try {
//       const files = fs.readdirSync(tmpDir)
//       let deletedCount = 0
//       files.forEach((file) => {
//         try {
//           const filePath = path.join(tmpDir, file)
//           const stat = fs.statSync(filePath)
//           if (stat.isFile()) {
//             fs.unlinkSync(filePath)
//             deletedCount++
//           }
//         } catch (err) {
//           conn.logger.warn(`Failed to delete file ${file}: ${err.message}`)
//         }
//       })
//       if (deletedCount > 0) conn.logger.info(`Cleared ${deletedCount} temporary files from tmp directory`)
//       else conn.logger.info("No temporary files to clear")
//     } catch (err) {
//       conn.logger.error(`Error clearing tmp directory: ${err.message}`)
//     }
//   } else {
//     try {
//       fs.mkdirSync(tmpDir, { recursive: true })
//       conn.logger.info("Created tmp directory")
//     } catch (err) {
//       conn.logger.error(`Error creating tmp directory: ${err.message}`)
//     }
//   }
// }

// global.plugins = {}
// const pluginsDir = path.join(__dirname, "plugins")

// function loadPlugins() {
//   if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir)
//   const files = fs.readdirSync(pluginsDir).filter((file) => file.endsWith(".js"))
//   for (const file of files) {
//     try {
//       delete require.cache[require.resolve(path.join(pluginsDir, file))]
//       const plugin = require(path.join(pluginsDir, file))
//       if (plugin && typeof global.atifyCommands === "function") global.atifyCommands(plugin)
//       global.plugins[file] = plugin
//     } catch (e) {
//       console.log(`Error loading plugin ${file}:`, e)
//     }
//   }
// }

// loadPlugins()

// global.reload = (event, filePath) => {
//   if (/\.js$/.test(filePath)) {
//     const fullFilePath = path.join(pluginsDir, filePath)

//     try { fs.unwatchFile(fullFilePath) } catch {}

//     if (fullFilePath in require.cache) {
//       delete require.cache[fullFilePath]
//       if (fs.existsSync(fullFilePath)) conn.logger.info(`Re-requiring plugin '${filePath}'`)
//       else {
//         conn.logger.warn(`Deleted plugin '${filePath}'`)
//         return delete global.plugins[filePath]
//       }
//     } else {
//       conn.logger.info(`Requiring new plugin '${filePath}'`)
//     }

//     const errorCheck = syntaxError(fs.readFileSync(fullFilePath), filePath)
//     if (errorCheck) conn.logger.error(`Syntax error while loading '${filePath}':\n${errorCheck}`)
//     else {
//       try {
//         global.plugins[filePath] = require(fullFilePath)
//       } catch (error) {
//         conn.logger.error(error)
//       } finally {
//         global.plugins = Object.fromEntries(
//           Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)),
//         )
//       }
//     }
//   }
// }

// Object.freeze(global.reload)
// fs.watch(path.join(__dirname, "plugins"), global.reload)

// global.reloadHandler = () => require("./handler")

// function collectMentionsSync(msg) {
//   const text = msg.text || msg.caption || ""
//   const entities = [...(msg.entities || []), ...(msg.caption_entities || [])]
//   const result = { ids: [], usernames: [] }

//   for (const e of entities) {
//     if (e.type === "text_mention" && e.user && e.user.id) result.ids.push(e.user.id)
//     else if (e.type === "mention") {
//       const usernameRaw = text.substring(e.offset, e.offset + e.length)
//       const username = usernameRaw.replace(/^@/, "")
//       if (username) result.usernames.push(username)
//     }
//   }
//   return result
// }
// global.collectMentionsSync = collectMentionsSync

// function smsg(ctx) {
//   if (!ctx.message && !ctx.callback_query) return null

//   const m = ctx.message || ctx.callback_query.message
//   const M = {}

//   if (ctx.chat.type === "channel") {
//     return null
//   }

//   M.text = m.text || m.caption || ""
//   M.msgs = m
//   M.msg = M.mimetype || M.mediaType || undefined
//   M.mtype = Object.keys(m)[1] || Object.keys(m)[0]
//   M.id = m.message_id
//   M.chat = ctx.chat.id
//   M.sender = ctx.from.id
//   M.fromMe = ctx.from.is_bot
//   M.name = ctx.from.first_name || ctx.from.username || "Unknown"
//   M.firstname = ctx.from.first_name || ""
//   M.lastname = ctx.from.last_name || ""
//   M.pushname = `${ctx.from.first_name} ${ctx.from.last_name}` || ctx.from.username || "Unknown"
//   M.pushName = ctx.from.username || "Unknown" || `${ctx.from.first_name} ${ctx.from.last_name}`
//   M.usertag = ctx.from.username || ""
//   M.isBot = ctx.from.is_bot
//   M.isBaileys = !!(m.from && m.from.is_bot)
//   M.isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup"

//   if (M.isGroup) {
//     M.groupName = ctx.chat.title || "Unknown Group"
//   }

//   M.mentionedJid = []
//   M.mentionedUsernames = []
//   if (ctx.callback_query) {
//     M.callbackQuery = ctx.callback_query
//     M.data = ctx.callback_query.data
//   }

//   {
//     const { ids = [], usernames = [] } = collectMentionsSync(m)
//     M.mentionedAny = M.mentionedAny || []
//     const anyMentions = (ids.length ? ids : usernames)
//     M.mentionedAny.push(...anyMentions)
//   }

//   const ctxCopy = JSON.parse(JSON.stringify(ctx, (() => {
//     const seen = new WeakSet()
//     return (key, value) => {
//       if (key === "token") return "[HIDDEN]"
//       if (typeof value === "object" && value !== null) {
//         if (seen.has(value)) return
//         seen.add(value)
//       }
//       return value
//     }
//   })()))
//   M.fakeObj = ctxCopy

//   M.mimetype = (() => {
//     if (m.photo) return "image/jpeg"
//     if (m.document) return m.document.mime_type || null
//     if (m.video) return m.video.mime_type || null
//     if (m.audio) return m.audio.mime_type || null
//     if (m.sticker) return m.sticker.is_video ? "image/webm" : "image/webp"
//     if (m.voice) return m.voice.mime_type || null
//     if (m.animation) return m.animation.mime_type || null
//     return null
//   })()

//   M.mediaType = M.mimetype

//   M.reply = async (text, options = {}) => {
//     return await conn.reply(M.chat, text, { message_id: M.id }, options)
//   }

//   M.copy = () => M

//   M.forward = async (jid) => {
//     return await conn.telegram.forwardMessage(jid, M.chat, M.id)
//   }

//   M.delete = async () => {
//     return await conn.telegram.deleteMessage(M.chat, M.id)
//   }

//   if (m.reply_to_message) {
//     const quotedCtxCopy = JSON.parse(JSON.stringify(ctx, (() => {
//       const seen = new WeakSet()
//       return (key, value) => {
//         if (key === "token") return "[HIDDEN]"
//         if (typeof value === "object" && value !== null) {
//           if (seen.has(value)) return
//           seen.add(value)
//         }
//         return value
//       }
//     })()))

//     if (M.mimetype) {
//       M.msg.mimetype = M.mimetype
//       M.msg.mediaType = M.mediaType
//     }

//     M.quoted = {
//       text: m.reply_to_message.text || m.reply_to_message.caption || "",
//       msgs: m,
//       msg: m.reply_to_message,
//       mtype: Object.keys(m.reply_to_message)[1] || Object.keys(m.reply_to_message)[0],
//       id: m.reply_to_message.message_id,
//       chat: ctx.chat.id,
//       sender: m.reply_to_message.from.id,
//       fromMe: m.reply_to_message.from.is_bot,
//       isBaileys: !!m.reply_to_message.from?.is_bot,
//       name: m.reply_to_message.from.first_name || m.reply_to_message.from.username || "Unknown",
//       pushname: m.reply_to_message.from.first_name || m.reply_to_message.from.username || "Unknown",
//       pushName: m.reply_to_message.from.username || "Unknown" || `${m.reply_to_message.from.first_name} ${m.reply_to_message.from.last_name}`,
//       firstname: m.reply_to_message.from.first_name || "",
//       lastname: m.reply_to_message.from.last_name || "",
//       usertag: m.reply_to_message.from.username || "",
//       isBot: m.reply_to_message.from.is_bot,
//       isGroup: ctx.chat.type === "group" || ctx.chat.type === "supergroup",
//       message_id: m.reply_to_message.message_id,
//       mentionedJid: [],
//       mentionedUsernames: [],
//       fakeObj: quotedCtxCopy,
//       isAnimated: Boolean(
//         m.reply_to_message?.sticker?.is_video ||
//         m.reply_to_message?.sticker?.is_animated ||
//         m.reply_to_message?.animation
//       ),
//       mimetype: (() => {
//         if (m.reply_to_message.photo) return "image/jpeg"
//         if (m.reply_to_message.document) return m.reply_to_message.document.mime_type || null
//         if (m.reply_to_message.video) return m.reply_to_message.video.mime_type || null
//         if (m.reply_to_message.audio) return m.reply_to_message.audio.mime_type || null
//         if (m.reply_to_message.sticker) return m.reply_to_message.sticker.is_video ? "image/webm" : "image/webp"
//         if (m.reply_to_message.voice) return m.reply_to_message.voice.mime_type || null
//         if (m.reply_to_message.animation) return m.reply_to_message.animation.mime_type || null
//         return null
//       })(),
//       mediaType: (() => {
//         if (m.reply_to_message.photo) return "image/jpeg"
//         if (m.reply_to_message.document) return m.reply_to_message.document.mime_type || null
//         if (m.reply_to_message.video) return m.reply_to_message.video.mime_type || null
//         if (m.reply_to_message.audio) return m.reply_to_message.audio.mime_type || null
//         if (m.reply_to_message.sticker) return m.reply_to_message.sticker.is_video ? "image/webm" : "image/webp"
//         if (m.reply_to_message.voice) return m.reply_to_message.voice.mime_type || null
//         if (m.reply_to_message.animation) return m.reply_to_message.animation.mime_type || null
//         return null
//       })(),
//       reply: async (text, options = {}) => {
//         return await conn.reply(M.chat, text, { message_id: m.reply_to_message.message_id }, options)
//       },
//       copy: () => M.quoted,
//       forward: async (jid) => {
//         return await conn.telegram.forwardMessage(jid, M.chat, m.reply_to_message.message_id)
//       },
//       delete: async () => {
//         return await conn.telegram.deleteMessage(M.chat, m.reply_to_message.message_id)
//       },
//       download: async () => {
//         if (m.reply_to_message.photo) {
//           const fileId = m.reply_to_message.photo[m.reply_to_message.photo.length - 1].file_id
//           const file = await conn.telegram.getFile(fileId)
//           return await downloadFile(file.file_path)
//         } else if (m.reply_to_message.document) {
//           const file = await conn.telegram.getFile(m.reply_to_message.document.file_id)
//           return await downloadFile(file.file_path)
//         } else if (m.reply_to_message.video) {
//           const file = await conn.telegram.getFile(m.reply_to_message.video.file_id)
//           return await downloadFile(file.file_path)
//         } else if (m.reply_to_message.audio) {
//           const file = await conn.telegram.getFile(m.reply_to_message.audio.file_id)
//           return await downloadFile(file.file_path)
//         }
//         return "Invalid media type or no media found"
//       },
//     }

//     if (M.quoted && M.quoted.mimetype && M.quoted.msg) {
//       M.quoted.msg.mimetype = M.quoted.mimetype
//       M.quoted.msg.mediaType = M.quoted.mediaType
//     }

//     M.quoted.mentionedJid = M.quoted.mentionedJid || []
//     M.quoted.mentionedUsernames = M.quoted.mentionedUsernames || []

//     const q = collectMentionsSync(m.reply_to_message)
//     M.quoted.mentionedJid.push(...q.usernames)
//     M.quoted.mentionedUsernames.push(...q.usernames)
//   }

//   M.download = async () => {
//     if (m.photo) {
//       const fileId = m.photo[m.photo.length - 1].file_id
//       const file = await conn.telegram.getFile(fileId)
//       return await downloadFile(file.file_path)
//     } else if (m.document) {
//       const file = await conn.telegram.getFile(m.document.file_id)
//       return await downloadFile(file.file_path)
//     } else if (m.video) {
//       const file = await conn.telegram.getFile(m.video.file_id)
//       return await downloadFile(file.file_path)
//     } else if (m.audio) {
//       const file = await conn.telegram.getFile(m.audio.file_id)
//       return await downloadFile(file.file_path)
//     }
//     return null
//   }

//   return M
// }

// async function downloadFile(filePath) {
//   const https = require("https")
//   const http = require("http")

//   return new Promise((resolve, reject) => {
//     const url = `https://api.telegram.org/file/bot${BOT_TOKEN_RAW}/${filePath}`
//     const protocol = url.startsWith("https:") ? https : http

//     protocol
//       .get(url, (res) => {
//         const chunks = []
//         res.on("data", (chunk) => chunks.push(chunk))
//         res.on("end", () => resolve(Buffer.concat(chunks)))
//         res.on("error", reject)
//       })
//       .on("error", reject)
//   })
// }

// const REPO_URL = "https://github.com/paulszch/tele-waa"
// const REPO_BRANCH = "v1"
// const REPO_LOCAL_PATH = "/var/www/beta_tele"
// const GITHUB_TOKEN = pickGithubToken()
// const REPO_CACHE_FILE = path.join(__dirname, "repo_cache.json")

// const GIT_SSH_KEY = process.env.GIT_SSH_KEY || "/root/.ssh/beta_tele"
// const GIT_ENV = {
//   ...process.env,
//   GIT_TERMINAL_PROMPT: "0",
//   GIT_SSH_COMMAND: `ssh -i ${GIT_SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
// }

// function runGit(args, cwd) {
//   return new Promise((resolve) => {
//     const p = child_process.spawn("git", args, { cwd, env: GIT_ENV })
//     let out = ""
//     let err = ""
//     p.stdout.on("data", (d) => (out += d.toString()))
//     p.stderr.on("data", (d) => (err += d.toString()))
//     p.on("close", (code) => resolve({ code, out, err }))
//   })
// }

// function repoLoadCache() {
//   if (!fs.existsSync(REPO_CACHE_FILE)) return {}
//   try { return JSON.parse(fs.readFileSync(REPO_CACHE_FILE, "utf8")) } catch { return {} }
// }
// function repoSaveCache(obj) {
//   try { fs.writeFileSync(REPO_CACHE_FILE, JSON.stringify(obj, null, 2)) } catch {}
// }
// function normalizeRepoUrl(repoUrl) {
//   let s = String(repoUrl || "").trim()
//   s = s.replace(/#.*$/, "")
//   s = s.replace(/\?.*$/, "")
//   s = s.replace(/\/+$/, "")
//   return s
// }
// function repoToApiCommitsUrl(repoUrl, branch) {
//   const clean = normalizeRepoUrl(repoUrl)
//   const m = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i)
//   if (!m) throw new Error("Invalid GitHub repo URL: " + clean)
//   const owner = m[1]
//   const repo = m[2].replace(/\.git$/i, "")
//   return `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch || "main")}&per_page=1`
// }
// async function fetchJson(url, headers = {}) {
//   if (typeof fetch === "function") {
//     const res = await fetch(url, { headers })
//     const text = await res.text()
//     let json = null
//     try { json = JSON.parse(text) } catch {}
//     return { ok: res.ok, status: res.status, json, text }
//   }
//   const https = require("https")
//   return await new Promise((resolve) => {
//     const req = https.request(url, { method: "GET", headers }, (res) => {
//       const chunks = []
//       res.on("data", (d) => chunks.push(d))
//       res.on("end", () => {
//         const text = Buffer.concat(chunks).toString("utf8")
//         let json = null
//         try { json = JSON.parse(text) } catch {}
//         resolve({
//           ok: res.statusCode >= 200 && res.statusCode < 300,
//           status: res.statusCode,
//           json,
//           text,
//         })
//       })
//     })
//     req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: e.message }))
//     req.end()
//   })
// }

// function getOwners() {
//   if (Array.isArray(global.ownerid) && global.ownerid.length) return global.ownerid.map(String)
//   if (global.premid) return [String(global.premid)]
//   return []
// }

// async function ensureOriginSSH() {
//   try {
//     if (!REPO_LOCAL_PATH || !fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) return
//     const r = await runGit(["remote", "get-url", "origin"], REPO_LOCAL_PATH)
//     const cur = String(r.out || "").trim()
//     if (!cur) return

//     const m = cur.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i)
//     if (!m) return
//     const owner = m[1]
//     const repo = m[2].replace(/\.git$/i, "")
//     const sshUrl = `git@github.com:${owner}/${repo}.git`
//     await runGit(["remote", "set-url", "origin", sshUrl], REPO_LOCAL_PATH)
//   } catch {}
// }

// async function checkRepoUpdate() {
//   try {
//     const owners = getOwners()
//     if (!owners.length) return

//     const url = normalizeRepoUrl(REPO_URL)
//     const branch = REPO_BRANCH || "main"
//     const apiUrl = repoToApiCommitsUrl(url, branch)

//     const headers = {
//       "User-Agent": "FilnBotz-RepoWatcher",
//       Accept: "application/vnd.github+json",
//     }
//     if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`

//     const { ok, status, json } = await fetchJson(apiUrl, headers)
//     if (!ok || !json) {
//       conn.logger.warn(`[GITHUB] fetch failed ${status} for ${url} (${branch})`)
//       return
//     }

//     const latest = Array.isArray(json) ? json[0] : null
//     const latestSha = latest?.sha
//     if (!latestSha) return

//     const cache = repoLoadCache()
//     const key = `${url}#${branch}`
//     const last = cache[key]?.lastCommit || null

//     if (last && last === latestSha) {
//       cache[key] = { ...cache[key], lastChecked: Date.now() }
//       repoSaveCache(cache)
//       return
//     }

//     cache[key] = { lastCommit: latestSha, lastChecked: Date.now(), lastNotified: Date.now() }
//     repoSaveCache(cache)

//     const msgText = latest?.commit?.message || "-"
//     const authorName = latest?.commit?.author?.name || "-"
//     const authorDate = latest?.commit?.author?.date || null
//     const htmlUrl = latest?.html_url || url

//     const notif = [
//       "Update Repository Terdeteksi",
//       `Repo: ${url}`,
//       `Branch: ${branch}`,
//       `Commit: ${String(latestSha).slice(0, 7)}`,
//       `Author: ${authorName}`,
//       authorDate ? `Time: ${new Date(authorDate).toLocaleString("id-ID")}` : "",
//       "",
//       "Pesan commit:",
//       String(msgText).slice(0, 1500),
//     ].filter(Boolean).join("\n")

//     for (const oid of owners) {
//       await conn.sendButt(
//         oid,
//         notif,
//         [
//           [
//             { text: "Lihat di GitHub", url: htmlUrl },
//             { text: "Pull Sekarang", callback_data: "pull_repo_tele_waa" },
//           ],
//         ],
//         null,
//         {},
//       )
//     }

//     conn.logger.info(`[GITHUB] update detected: ${url} (${branch})`)
//   } catch (e) {
//     conn.logger.error("Repo check error: " + e.message)
//   }
// }

// async function handleRepoCallback(ctx) {
//   try {
//     const data = ctx.callbackQuery?.data || ""
//     if (data !== "pull_repo_tele_waa") return false

//     const owners = getOwners()
//     const fromId = String(ctx.from?.id || "")
//     if (!owners.includes(fromId)) {
//       try {
//         await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Hanya owner yang bisa.", { show_alert: true })
//       } catch {}
//       return true
//     }

//     if (!REPO_LOCAL_PATH || !fs.existsSync(REPO_LOCAL_PATH)) {
//       try {
//         await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Folder repo tidak ada.", { show_alert: true })
//       } catch {}
//       const chatId = ctx.callbackQuery.message.chat.id
//       const replyTo = ctx.callbackQuery.message.message_id
//       await ctx.telegram.sendMessage(chatId, `❌ Folder repo tidak ditemukan:\n${REPO_LOCAL_PATH}`, {
//         reply_to_message_id: replyTo,
//       })
//       return true
//     }

//     if (!fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) {
//       try {
//         await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Bukan folder git.", { show_alert: true })
//       } catch {}
//       const chatId = ctx.callbackQuery.message.chat.id
//       const replyTo = ctx.callbackQuery.message.message_id
//       await ctx.telegram.sendMessage(chatId, `❌ Folder ini tidak punya .git:\n${REPO_LOCAL_PATH}`, {
//         reply_to_message_id: replyTo,
//       })
//       return true
//     }

//     try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Pulling...", { show_alert: false }) } catch {}

//     await ensureOriginSSH()

//     const chatId = ctx.callbackQuery.message.chat.id
//     const replyTo = ctx.callbackQuery.message.message_id

//     child_process.exec(
//       `git fetch --all --prune && git checkout ${REPO_BRANCH} && (git stash push -m "auto-stash before pull" --include-untracked || true) && git pull`,
//       { cwd: REPO_LOCAL_PATH, timeout: 120000, env: GIT_ENV },
//       async (err, stdout, stderr) => {
//         if (err) {
//           const out = (stderr || err.message || "").toString().slice(0, 3500)
//           await ctx.telegram.sendMessage(chatId, `❌ Gagal git pull\n\n${out}`, {
//             reply_to_message_id: replyTo,
//           })
//           return
//         }
//         const out = (stdout || "").toString().slice(0, 3500)
//         await ctx.telegram.sendMessage(chatId, `✅ Berhasil update\n\n${out}`, {
//           reply_to_message_id: replyTo,
//         })
//       },
//     )

//     return true
//   } catch (e) {
//     conn.logger.error("Repo callback error: " + e.message)
//     try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Error", { show_alert: true }) } catch {}
//     return true
//   }
// }

// function parsePorcelain(statusText) {
//   const lines = String(statusText || "").split("\n").map((x) => x.trimEnd()).filter(Boolean)
//   const trackedChanged = []
//   const untrackedNew = []
//   const deleted = []

//   for (const line of lines) {
//     if (line.startsWith("?? ")) {
//       untrackedNew.push(line.slice(3).trim())
//       continue
//     }
//     const code = line.slice(0, 2)
//     const rest = line.slice(2).trim()
//     if (code.includes("D")) deleted.push(rest)
//     else trackedChanged.push(rest)
//   }

//   return { trackedChanged, untrackedNew, deleted, raw: lines.join("\n") }
// }

// const LOCAL_WATCH_INTERVAL_MS = 60 * 1000
// const LOCAL_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000
// global.__localSyncState = global.__localSyncState || { lastSig: null, lastNotifiedAt: 0 }
// global.__pendingLocalPush = global.__pendingLocalPush || new Map()

// async function getLocalChangesInfo() {
//   try {
//     if (!REPO_LOCAL_PATH || !fs.existsSync(REPO_LOCAL_PATH)) {
//       return { ok: false, err: `Folder tidak ada: ${REPO_LOCAL_PATH}` }
//     }
//     if (!fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) {
//       return { ok: false, err: `Bukan folder git: ${REPO_LOCAL_PATH}` }
//     }

//     const st = await runGit(["status", "--porcelain"], REPO_LOCAL_PATH)
//     if (st.code !== 0) return { ok: false, err: st.err || st.out || "git status gagal" }

//     const parsed = parsePorcelain(st.out)
//     const dirty = parsed.trackedChanged.length || parsed.untrackedNew.length || parsed.deleted.length

//     const diff = await runGit(["diff", "--stat"], REPO_LOCAL_PATH)
//     const diffStat = String(diff.out || "").trim()

//     const sig = `${parsed.raw}||${diffStat}`

//     return { ok: true, dirty, sig, diffStat, ...parsed }
//   } catch (e) {
//     return { ok: false, err: e.message }
//   }
// }

// function buildLocalPreviewText(info) {
//   const showList = (arr) => {
//     const items = (arr || []).slice(0, 25)
//     if (!items.length) return "• -"
//     return items.map((x) => `• ${x}`).join("\n")
//   }

//   return [
//     "Perubahan Lokal Terdeteksi",
//     `Path: ${REPO_LOCAL_PATH}`,
//     `Branch: ${REPO_BRANCH}`,
//     "",
//     `Timpa (tracked berubah): ${info.trackedChanged.length}`,
//     `Write (file baru): ${info.untrackedNew.length}`,
//     `Deleted: ${info.deleted.length}`,
//     "",
//     "Ringkasan perubahan:",
//     info.diffStat ? info.diffStat : "• -",
//     "",
//     "Contoh file (max 25):",
//     showList([...(info.trackedChanged || []), ...(info.untrackedNew || []), ...(info.deleted || [])]),
//   ].join("\n")
// }

// async function notifyOwnersLocalChanges(info) {
//   const owners = getOwners()
//   if (!owners.length) return

//   const token = Math.random().toString(36).slice(2, 10)
//   const commitMsg = `sync(beta_tele): ${new Date().toLocaleString("id-ID")}`

//   global.__pendingLocalPush.set(token, { createdAt: Date.now(), commitMsg })

//   const msg = buildLocalPreviewText(info)

//   for (const oid of owners) {
//     await conn.sendButt(
//       oid,
//       msg,
//       [
//         [
//           { text: "Detail", callback_data: `localsync_detail:${token}` },
//           { text: "Push Sekarang", callback_data: `localsync_push:${token}` },
//         ],
//       ],
//       null,
//       {},
//     )
//   }
// }

// async function checkLocalChangesAndNotify() {
//   const info = await getLocalChangesInfo()
//   if (!info.ok) return
//   if (!info.dirty) return

//   const now = Date.now()
//   const st = global.__localSyncState

//   if (st.lastSig === info.sig && now - st.lastNotifiedAt < LOCAL_NOTIFY_COOLDOWN_MS) return

//   st.lastSig = info.sig
//   st.lastNotifiedAt = now

//   await notifyOwnersLocalChanges(info)
// }

// async function doLocalCommitPush(commitMsg) {
//   if (!fs.existsSync(GIT_SSH_KEY)) {
//     return { ok: false, text: `SSH key tidak ditemukan: ${GIT_SSH_KEY}` }
//   }

//   await ensureOriginSSH()

//   const add = await runGit(["add", "-A"], REPO_LOCAL_PATH)
//   if (add.code !== 0) return { ok: false, text: add.err || "git add gagal" }

//   const commit = await runGit(["commit", "-m", commitMsg], REPO_LOCAL_PATH)
//   const combined = (commit.out + "\n" + commit.err).toLowerCase()
//   if (commit.code !== 0 && !combined.includes("nothing to commit")) {
//     return { ok: false, text: commit.err || commit.out || "git commit gagal" }
//   }

//   const push = await runGit(["push", "origin", REPO_BRANCH], REPO_LOCAL_PATH)
//   if (push.code !== 0) return { ok: false, text: push.err || push.out || "git push gagal" }

//   return { ok: true, text: (commit.out || "") + "\n" + (push.out || "") }
// }

// async function handleLocalSyncCallback(ctx) {
//   const data = String(ctx.callbackQuery?.data || "")
//   if (!data.startsWith("localsync_")) return false

//   const owners = getOwners()
//   const fromId = String(ctx.from?.id || "")
//   if (!owners.includes(fromId)) {
//     try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Owner only.", { show_alert: true }) } catch {}
//     return true
//   }

//   const [action, token] = data.split(":")
//   const pending = global.__pendingLocalPush.get(token)
//   if (!pending) {
//     try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Expired.", { show_alert: true }) } catch {}
//     return true
//   }

//   if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
//     global.__pendingLocalPush.delete(token)
//     try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Expired.", { show_alert: true }) } catch {}
//     return true
//   }

//   const chatId = ctx.callbackQuery.message.chat.id
//   const replyTo = ctx.callbackQuery.message.message_id

//   if (action === "localsync_detail") {
//     const info = await getLocalChangesInfo()
//     if (!info.ok) {
//       await ctx.telegram.sendMessage(chatId, `❌ ${info.err}`, { reply_to_message_id: replyTo })
//       return true
//     }
//     const detail = [
//       "Detail Perubahan Lokal",
//       "",
//       "status --porcelain:",
//       info.raw ? info.raw.slice(0, 3500) : "-",
//       "",
//       "diff --stat:",
//       info.diffStat ? info.diffStat.slice(0, 3500) : "-",
//     ].join("\n")
//     await ctx.telegram.sendMessage(chatId, detail, { reply_to_message_id: replyTo })
//     return true
//   }

//   if (action === "localsync_push") {
//     try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Pushing...", { show_alert: false }) } catch {}

//     const res = await doLocalCommitPush(pending.commitMsg)
//     global.__pendingLocalPush.delete(token)

//     if (!res.ok) {
//       const out = String(res.text || "failed").slice(0, 3500)
//       await ctx.telegram.sendMessage(chatId, `❌ Push gagal\n\n${out}`, { reply_to_message_id: replyTo })
//       return true
//     }

//     const out = String(res.text || "ok").slice(0, 3500)
//     await ctx.telegram.sendMessage(chatId, `✅ Push sukses\n\n${out}`, { reply_to_message_id: replyTo })
//     return true
//   }

//   return true
// }

// /* SNIFER UPDATE: biar kelihatan message punya field apa aja (hapus kalau udah beres) */
// conn.use(async (ctx, next) => {
//   try {
//     if (ctx.update?.message) {
//       const keys = Object.keys(ctx.update.message)
//       if (keys.includes("web_app_data")) {
//         console.log("[MINIAPP] RAW KEYS:", keys)
//         console.log("[MINIAPP] RAW:", ctx.update.message.web_app_data)
//       }
//     }
//   } catch {}
//   return next()
// })

// /* RECEIVER WEB APP DATA (ini inti) */
// conn.on("message", async (ctx) => {
//   try {
//     const wad = ctx.update?.message?.web_app_data?.data
//     if (!wad) return

//     console.log("[MINIAPP] web_app_data:", wad)

//     let parsed
//     try { parsed = JSON.parse(wad) } catch {}

//     const text = parsed
//       ? `✅ Data dari Mini App:\n${JSON.stringify(parsed, null, 2)}`
//       : `✅ Data dari Mini App:\n${wad}`

//     await ctx.reply(text)
//   } catch (e) {
//     console.error("[MINIAPP] error:", e)
//     try { await ctx.reply("❌ Gagal baca data Mini App") } catch {}
//   }
// })

// conn.use(async (ctx, next) => {
//   try {
//     if (ctx.message || ctx.callback_query) {
//       const m = smsg(ctx)
//       if (m) await require("./handler").handler.call(conn, m)
//     } else if (ctx.myChatMember) {
//       await require("./handler").participantsUpdate.call(conn, ctx)
//     } else if (ctx.chatMember) {
//       await require("./handler").participantsUpdate.call(conn, ctx)
//     }
//     return next()
//   } catch (e) {
//     console.error("Middleware error:", e)
//   }
// })

// conn.on("new_chat_members", async (ctx) => {
//   try {
//     await require("./handler").participantsUpdate.call(conn, ctx)
//   } catch (e) {
//     console.error("Error handling new_chat_members:", e)
//   }
// })

// conn.on("left_chat_member", async (ctx) => {
//   try {
//     await require("./handler").participantsUpdate.call(conn, ctx)
//   } catch (e) {
//     console.error("Error handling left_chat_member:", e)
//   }
// })

// conn.on("callback_query", async (ctx) => {
//   try {
//     const handledLocal = await handleLocalSyncCallback(ctx)
//     if (handledLocal) return

//     const handledRepo = await handleRepoCallback(ctx)
//     if (handledRepo) return

//     const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 300000))

//     for (const pluginName in global.plugins) {
//       const plugin = global.plugins[pluginName]
//       if (plugin && typeof plugin.callback === "function") {
//         try {
//           const enrichedCtx = {
//             ...ctx,
//             conn,
//             data: ctx.callbackQuery?.data,
//             callbackQuery: ctx.callbackQuery,
//             answerCbQuery: (text, opt = {}) =>
//               ctx.telegram.answerCbQuery(ctx.callbackQuery.id, text, opt),
//           }

//           const result = await Promise.race([plugin.callback(enrichedCtx), timeoutPromise])
//           if (result === true) break
//         } catch {}
//       }
//     }
//   } catch (err) {
//     try {
//       await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Error", { show_alert: true })
//     } catch {}
//   }
// })

// async function checkMediaSupport() {
//   const checks = await Promise.all(
//     [
//       child_process.spawn("ffmpeg"),
//       child_process.spawn("ffprobe"),
//       child_process.spawn("convert"),
//       child_process.spawn("magick"),
//       child_process.spawn("gm"),
//     ].map((spawn) => {
//       return Promise.race([
//         new Promise((resolve) => spawn.on("close", (exitCode) => resolve(exitCode !== 127))),
//         new Promise((resolve) => spawn.on("error", () => resolve(false))),
//       ])
//     }),
//   )

//   const [ffmpeg, ffprobe, convert, magick, gm] = checks
//   global.support = { ffmpeg, ffprobe, convert, magick, gm }

//   if (!global.support.ffmpeg) conn.logger.warn("Please install FFMPEG (sudo apt install ffmpeg)")
//   if (!global.support.magick) conn.logger.warn("Please install ImageMagick (sudo apt install imagemagick)")
// }

// async function launchBot() {
//   let retryCount = 0
//   const maxRetries = 5
//   const retryDelay = 5000

//   while (retryCount < maxRetries) {
//     try {
//       await conn.launch()
//       conn.logger.info("Bot launched successfully")
//       break
//     } catch (err) {
//       retryCount++
//       conn.logger.error(`Bot launch attempt ${retryCount} failed: ${err.message}`)

//       if (err.code === "ETIMEDOUT" || err.code === "ENOTFOUND" || err.code === "ECONNRESET") {
//         if (retryCount < maxRetries) {
//           conn.logger.info(`Retrying in ${retryDelay / 1000} seconds...`)
//           await new Promise((resolve) => setTimeout(resolve, retryDelay))
//         } else {
//           conn.logger.error("Max retries reached. Check your internet connection and bot token.")
//         }
//       } else {
//         throw err
//       }
//     }
//   }
// }

// ensureOriginSSH().catch(() => {})

// const REPO_WATCH_INTERVAL_MS = 60 * 1000
// checkRepoUpdate().catch(() => {})
// setInterval(() => checkRepoUpdate().catch(() => {}), REPO_WATCH_INTERVAL_MS)

// checkLocalChangesAndNotify().catch(() => {})
// setInterval(() => checkLocalChangesAndNotify().catch(() => {}), LOCAL_WATCH_INTERVAL_MS)

// checkMediaSupport()
//   .then(() => conn.logger.info("Quick Test Done"))
//   .then(() => launchBot())
//   .catch(console.error)

// process.once("SIGINT", async () => {
//   conn.logger.warn("SIGINT received, saving database...")
//   try { await global.saveDatabase() } catch {}
//   await conn.stop("SIGINT")
//   process.exit(0)
// })

// process.once("SIGTERM", async () => {
//   conn.logger.warn("SIGTERM received, saving database...")
//   try { await global.saveDatabase() } catch {}
//   await conn.stop("SIGTERM")
//   process.exit(0)
// })



const { Telegraf } = require("telegraf")
const fs = require("fs")
const path = require("path")
const syntaxError = require("syntax-error")
const child_process = require("child_process")
require("./config")
const chalk = require("chalk")
const { getMimeType } = require("./lib/getMime")
const { EventEmitter } = require("events")

EventEmitter.defaultMaxListeners = 0
try { process.setMaxListeners(0) } catch {}

function pickTelegramToken() {
  const candidates = [
    process.env.BOT_TOKEN,
    process.env.TELEGRAM_TOKEN,
    global.telegramToken,
    global.botToken,
    global.token,
  ].filter(Boolean)

  for (const t of candidates) {
    const s = String(t).trim()
    if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(s)) return s
  }
  return String(candidates[0] || "").trim()
}

function pickGithubToken() {
  const candidates = [
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
    global.githubToken,
    global.ghToken,
    global.token,
  ].filter(Boolean)

  for (const t of candidates) {
    const s = String(t).trim()
    if (/^(ghp_|github_pat_)/i.test(s)) return s
  }
  return ""
}

const conn = new Telegraf(pickTelegramToken())
const BOT_USERNAME = process.env.BOT_USERNAME || global.botnames?.replace(/^@/, "") || "Filnz_bot"

global.stripAtSuffix = (s) =>
  String(s || "").replace(new RegExp(`@${BOT_USERNAME}$`, "i"), "")

global.atifyCommands = (handler) => {
  if (!handler || !handler.command) return handler
  const list = Array.isArray(handler.command) ? handler.command : [handler.command]
  const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const toRegex = (c) =>
    c instanceof RegExp
      ? c
      : new RegExp(`^${esc(c)}(?:@${BOT_USERNAME.replace(/_/g, "[_]*")})?$`, "i")
  handler.command = list.map(toRegex)
  return handler
}

global.BOT_USERNAME = BOT_USERNAME
console.log(`[✓] BOT_USERNAME set to @${BOT_USERNAME}`)

global.API = (name, pathUrl = "/", query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  pathUrl +
  (query || apikeyqueryname
    ? "?" +
      new URLSearchParams(
        Object.entries({
          ...query,
          ...(apikeyqueryname
            ? {
                [apikeyqueryname]:
                  global.APIKeys[name in global.APIs ? global.APIs[name] : name],
              }
            : {}),
        }),
      )
    : "")

global.timestamp = { start: new Date() }

function waktuWIB() {
  const now = new Date()
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "longOffset",
  }
  const formatted = wibTime.toLocaleString("en-US", options)
  return `[${formatted.replace(/GMT\+7/, "GMT+0700")} (Western Indonesia Time - WIB)]`
}

conn.logger = {
  info: (msg) =>
    console.log(
      `${chalk.green.bold("INFO")} ${chalk.white.bold(waktuWIB())}: ${chalk.cyan(msg)}`,
    ),
  warn: (msg) =>
    console.log(
      `${chalk.hex("#FF8800").bold("WARNING")} ${chalk.white.bold(waktuWIB())}: ${chalk.yellow(msg)}`,
    ),
  error: (msg) =>
    console.log(
      `${chalk.red.bold("ERROR")} ${chalk.white.bold(waktuWIB())}: ${chalk.red(msg)}`,
    ),
}

require("./lib/simple")(conn)

const DB_FILE = path.join(__dirname, "database.json")

global.db = {
  data: null,
  READ: false,
}

function ensureDbShape() {
  if (!global.db.data || typeof global.db.data !== "object") global.db.data = {}
  const base = global.db.data
  if (!base.users || typeof base.users !== "object") base.users = {}
  if (!base.chats || typeof base.chats !== "object") base.chats = {}
  if (!base.stats || typeof base.stats !== "object") base.stats = {}
  if (!base.msgs || typeof base.msgs !== "object") base.msgs = {}
  if (!base.sticker || typeof base.sticker !== "object") base.sticker = {}
}

global.loadDatabase = async () => {
  if (global.db.READ) return global.db.data
  if (global.db.data !== null) return global.db.data

  global.db.READ = true
  try {
    console.log(chalk.cyan("🗂  DB file:"), DB_FILE)

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf8").trim()
        global.db.data = raw.length > 0 ? JSON.parse(raw) : null
      } catch (e) {
        console.log(chalk.red("Gagal parse database.json, reset baru:"), e.message)
        global.db.data = null
      }
    } else {
      global.db.data = null
    }

    ensureDbShape()
    console.log(
      chalk.green(
        `✅ Database loaded. users: ${
          Object.keys(global.db.data.users).length
        }, chats: ${Object.keys(global.db.data.chats).length}`,
      ),
    )
  } finally {
    global.db.READ = false
  }

  return global.db.data
}

async function saveDatabase() {
  try {
    if (!global.db.data) return
    ensureDbShape()
    fs.writeFileSync(DB_FILE, JSON.stringify(global.db.data, null, 2))
  } catch (e) {
    console.log(chalk.red("Save database error:"), e)
  }
}

global.saveDatabase = saveDatabase

;(async () => {
  await global.loadDatabase()
  setInterval(saveDatabase, 30000)
})()

global.File = class File extends Blob {
  constructor(chunks, name, opts = {}) {
    super(chunks, opts)
    this.name = name
    this.lastModified = opts.lastModified || Date.now()
  }
}

global.cleartmp = () => {
  const tmpDir = path.join(__dirname, "tmp")
  if (fs.existsSync(tmpDir)) {
    try {
      const files = fs.readdirSync(tmpDir)
      let deletedCount = 0
      files.forEach((file) => {
        try {
          const filePath = path.join(tmpDir, file)
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        } catch (err) {
          conn.logger.warn(`Failed to delete file ${file}: ${err.message}`)
        }
      })
      if (deletedCount > 0) conn.logger.info(`Cleared ${deletedCount} temporary files from tmp directory`)
      else conn.logger.info("No temporary files to clear")
    } catch (err) {
      conn.logger.error(`Error clearing tmp directory: ${err.message}`)
    }
  } else {
    try {
      fs.mkdirSync(tmpDir, { recursive: true })
      conn.logger.info("Created tmp directory")
    } catch (err) {
      conn.logger.error(`Error creating tmp directory: ${err.message}`)
    }
  }
}

global.plugins = {}
const pluginsDir = path.join(__dirname, "plugins")

function loadPlugins() {
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir)
  const files = fs.readdirSync(pluginsDir).filter((file) => file.endsWith(".js"))
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(pluginsDir, file))]
      const plugin = require(path.join(pluginsDir, file))
      if (plugin && typeof global.atifyCommands === "function") global.atifyCommands(plugin)
      global.plugins[file] = plugin
    } catch (e) {
      console.log(`Error loading plugin ${file}:`, e)
    }
  }
}

loadPlugins()

global.reload = (event, filePath) => {
  if (/\.js$/.test(filePath)) {
    const fullFilePath = path.join(pluginsDir, filePath)

    try { fs.unwatchFile(fullFilePath) } catch {}

    if (fullFilePath in require.cache) {
      delete require.cache[fullFilePath]
      if (fs.existsSync(fullFilePath)) conn.logger.info(`Re-requiring plugin '${filePath}'`)
      else {
        conn.logger.warn(`Deleted plugin '${filePath}'`)
        return delete global.plugins[filePath]
      }
    } else {
      conn.logger.info(`Requiring new plugin '${filePath}'`)
    }

    const errorCheck = syntaxError(fs.readFileSync(fullFilePath), filePath)
    if (errorCheck) conn.logger.error(`Syntax error while loading '${filePath}':\n${errorCheck}`)
    else {
      try {
        global.plugins[filePath] = require(fullFilePath)
      } catch (error) {
        conn.logger.error(error)
      } finally {
        global.plugins = Object.fromEntries(
          Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)),
        )
      }
    }
  }
}

Object.freeze(global.reload)
fs.watch(path.join(__dirname, "plugins"), global.reload)

global.reloadHandler = () => require("./handler")

function collectMentionsSync(msg) {
  const text = msg.text || msg.caption || ""
  const entities = [...(msg.entities || []), ...(msg.caption_entities || [])]
  const result = { ids: [], usernames: [] }

  for (const e of entities) {
    if (e.type === "text_mention" && e.user && e.user.id) result.ids.push(e.user.id)
    else if (e.type === "mention") {
      const usernameRaw = text.substring(e.offset, e.offset + e.length)
      const username = usernameRaw.replace(/^@/, "")
      if (username) result.usernames.push(username)
    }
  }
  return result
}
global.collectMentionsSync = collectMentionsSync

// function smsg(ctx) {
//   if (!ctx.message && !ctx.callback_query) return null
//   const m = ctx.message || ctx.callback_query.message
//   const M = {}
// 
//   if (ctx.chat.type === "channel") return null
// 
//   M.text = m.text || m.caption || ""
//   M.msgs = m
//   M.mtype = Object.keys(m)[1] || Object.keys(m)[0]
//   M.id = m.message_id
//   M.chat = ctx.chat.id
//   M.sender = ctx.from.id
//   M.fromMe = ctx.from.is_bot
//   M.name = ctx.from.first_name || ctx.from.username || "Unknown"
//   M.firstname = ctx.from.first_name || ""
//   M.lastname = ctx.from.last_name || ""
//   M.pushname = `${ctx.from.first_name} ${ctx.from.last_name}` || ctx.from.username || "Unknown"
//   M.pushName = ctx.from.username || "Unknown"
//   M.usertag = ctx.from.username || ""
//   M.isBot = ctx.from.is_bot
//   M.isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup"
//   if (M.isGroup) M.groupName = ctx.chat.title || "Unknown Group"
// 
//   if (ctx.callback_query) {
//     M.callbackQuery = ctx.callback_query
//     M.data = ctx.callback_query.data
//   }
// 
//   const ctxCopy = JSON.parse(
//     JSON.stringify(
//       ctx,
//       (() => {
//         const seen = new WeakSet()
//         return (key, value) => {
//           if (key === "token") return "[HIDDEN]"
//           if (typeof value === "object" && value !== null) {
//             if (seen.has(value)) return
//             seen.add(value)
//           }
//           return value
//         }
//       })(),
//     ),
//   )
//   M.fakeObj = ctxCopy
// 
//   M.reply = async (text, options = {}) => {
//     return await conn.reply(M.chat, text, { message_id: M.id }, options)
//   }
// 
//   return M
// }


function smsg(ctx) {
  if (!ctx.message && !ctx.callback_query) return null
// 
  const m = ctx.message || ctx.callback_query.message
  const M = {}
// 
  if (ctx.chat.type === "channel") {
    return null
  }
// 
  M.text = m.text || m.caption || ""
  M.msgs = m
  M.msg = M.mimetype || M.mediaType || undefined
  M.mtype = Object.keys(m)[1] || Object.keys(m)[0]
  M.id = m.message_id
  M.chat = ctx.chat.id
  M.sender = ctx.from.id
  M.fromMe = ctx.from.is_bot
  M.name = ctx.from.first_name || ctx.from.username || "Unknown"
  M.firstname = ctx.from.first_name || ""
  M.lastname = ctx.from.last_name || ""
  M.pushname = `${ctx.from.first_name} ${ctx.from.last_name}` || ctx.from.username || "Unknown"
  M.pushName = ctx.from.username || "Unknown" || `${ctx.from.first_name} ${ctx.from.last_name}`
  M.usertag = ctx.from.username || ""
  M.isBot = ctx.from.is_bot
  M.isBaileys = !!(m.from && m.from.is_bot)
  M.isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup"
// 
  if (M.isGroup) {
    M.groupName = ctx.chat.title || "Unknown Group"
  }
// 
  M.mentionedJid = []
  M.mentionedUsernames = []
  if (ctx.callback_query) {
    M.callbackQuery = ctx.callback_query
    M.data = ctx.callback_query.data
  }
// 
  {
    const { ids = [], usernames = [] } = collectMentionsSync(m)
    M.mentionedAny = M.mentionedAny || []
    const anyMentions = (ids.length ? ids : usernames)
    M.mentionedAny.push(...anyMentions)
  }
// 
  const ctxCopy = JSON.parse(JSON.stringify(ctx, (() => {
    const seen = new WeakSet()
    return (key, value) => {
      if (key === "token") return "[HIDDEN]"
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return
        seen.add(value)
      }
      return value
    }
  })()))
  M.fakeObj = ctxCopy
// 
  M.mimetype = (() => {
    if (m.photo) return "image/jpeg"
    if (m.document) return m.document.mime_type || null
    if (m.video) return m.video.mime_type || null
    if (m.audio) return m.audio.mime_type || null
    if (m.sticker) return m.sticker.is_video ? "image/webm" : "image/webp"
    if (m.voice) return m.voice.mime_type || null
    if (m.animation) return m.animation.mime_type || null
    return null
  })()
// 
  M.mediaType = M.mimetype
// 
  M.reply = async (text, options = {}) => {
    return await conn.reply(M.chat, text, { message_id: M.id }, options)
  }
// 
  M.copy = () => M
// 
  M.forward = async (jid) => {
    return await conn.telegram.forwardMessage(jid, M.chat, M.id)
  }
// 
  M.delete = async () => {
    return await conn.telegram.deleteMessage(M.chat, M.id)
  }
// 
  if (m.reply_to_message) {
    const quotedCtxCopy = JSON.parse(JSON.stringify(ctx, (() => {
      const seen = new WeakSet()
      return (key, value) => {
        if (key === "token") return "[HIDDEN]"
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return
          seen.add(value)
        }
        return value
      }
    })()))
// 
    if (M.mimetype) {
      M.msg.mimetype = M.mimetype
      M.msg.mediaType = M.mediaType
    }
// 
    M.quoted = {
      text: m.reply_to_message.text || m.reply_to_message.caption || "",
      msgs: m,
      msg: m.reply_to_message,
      mtype: Object.keys(m.reply_to_message)[1] || Object.keys(m.reply_to_message)[0],
      id: m.reply_to_message.message_id,
      chat: ctx.chat.id,
      sender: m.reply_to_message.from.id,
      fromMe: m.reply_to_message.from.is_bot,
      isBaileys: !!m.reply_to_message.from?.is_bot,
      name: m.reply_to_message.from.first_name || m.reply_to_message.from.username || "Unknown",
      pushname: m.reply_to_message.from.first_name || m.reply_to_message.from.username || "Unknown",
      pushName: m.reply_to_message.from.username || "Unknown" || `${m.reply_to_message.from.first_name} ${m.reply_to_message.from.last_name}`,
      firstname: m.reply_to_message.from.first_name || "",
      lastname: m.reply_to_message.from.last_name || "",
      usertag: m.reply_to_message.from.username || "",
      isBot: m.reply_to_message.from.is_bot,
      isGroup: ctx.chat.type === "group" || ctx.chat.type === "supergroup",
      message_id: m.reply_to_message.message_id,
      mentionedJid: [],
      mentionedUsernames: [],
      fakeObj: quotedCtxCopy,
      isAnimated: Boolean(
        m.reply_to_message?.sticker?.is_video ||
        m.reply_to_message?.sticker?.is_animated ||
        m.reply_to_message?.animation
      ),
      mimetype: (() => {
        if (m.reply_to_message.photo) return "image/jpeg"
        if (m.reply_to_message.document) return m.reply_to_message.document.mime_type || null
        if (m.reply_to_message.video) return m.reply_to_message.video.mime_type || null
        if (m.reply_to_message.audio) return m.reply_to_message.audio.mime_type || null
        if (m.reply_to_message.sticker) return m.reply_to_message.sticker.is_video ? "image/webm" : "image/webp"
        if (m.reply_to_message.voice) return m.reply_to_message.voice.mime_type || null
        if (m.reply_to_message.animation) return m.reply_to_message.animation.mime_type || null
        return null
      })(),
      mediaType: (() => {
        if (m.reply_to_message.photo) return "image/jpeg"
        if (m.reply_to_message.document) return m.reply_to_message.document.mime_type || null
        if (m.reply_to_message.video) return m.reply_to_message.video.mime_type || null
        if (m.reply_to_message.audio) return m.reply_to_message.audio.mime_type || null
        if (m.reply_to_message.sticker) return m.reply_to_message.sticker.is_video ? "image/webm" : "image/webp"
        if (m.reply_to_message.voice) return m.reply_to_message.voice.mime_type || null
        if (m.reply_to_message.animation) return m.reply_to_message.animation.mime_type || null
        return null
      })(),
      reply: async (text, options = {}) => {
        return await conn.reply(M.chat, text, { message_id: m.reply_to_message.message_id }, options)
      },
      copy: () => M.quoted,
      forward: async (jid) => {
        return await conn.telegram.forwardMessage(jid, M.chat, m.reply_to_message.message_id)
      },
      delete: async () => {
        return await conn.telegram.deleteMessage(M.chat, m.reply_to_message.message_id)
      },
      download: async () => {
        if (m.reply_to_message.photo) {
          const fileId = m.reply_to_message.photo[m.reply_to_message.photo.length - 1].file_id
          const file = await conn.telegram.getFile(fileId)
          return await downloadFile(file.file_path)
        } else if (m.reply_to_message.document) {
          const file = await conn.telegram.getFile(m.reply_to_message.document.file_id)
          return await downloadFile(file.file_path)
        } else if (m.reply_to_message.video) {
          const file = await conn.telegram.getFile(m.reply_to_message.video.file_id)
          return await downloadFile(file.file_path)
        } else if (m.reply_to_message.audio) {
          const file = await conn.telegram.getFile(m.reply_to_message.audio.file_id)
          return await downloadFile(file.file_path)
        }
        return "Invalid media type or no media found"
      },
    }
// 
    if (M.quoted && M.quoted.mimetype && M.quoted.msg) {
      M.quoted.msg.mimetype = M.quoted.mimetype
      M.quoted.msg.mediaType = M.quoted.mediaType
    }
// 
    M.quoted.mentionedJid = M.quoted.mentionedJid || []
    M.quoted.mentionedUsernames = M.quoted.mentionedUsernames || []
// 
    const q = collectMentionsSync(m.reply_to_message)
    M.quoted.mentionedJid.push(...q.usernames)
    M.quoted.mentionedUsernames.push(...q.usernames)
  }
// 
  M.download = async () => {
    if (m.photo) {
      const fileId = m.photo[m.photo.length - 1].file_id
      const file = await conn.telegram.getFile(fileId)
      return await downloadFile(file.file_path)
    } else if (m.document) {
      const file = await conn.telegram.getFile(m.document.file_id)
      return await downloadFile(file.file_path)
    } else if (m.video) {
      const file = await conn.telegram.getFile(m.video.file_id)
      return await downloadFile(file.file_path)
    } else if (m.audio) {
      const file = await conn.telegram.getFile(m.audio.file_id)
      return await downloadFile(file.file_path)
    }
    return null
  }
// 
  return M
}

async function downloadFile(filePath) {
  const https = require("https")
  const http = require("http")

  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/file/bot${global.token}/${filePath}`
    const protocol = url.startsWith("https:") ? https : http

    protocol
      .get(url, (res) => {
        const chunks = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.on("end", () => resolve(Buffer.concat(chunks)))
        res.on("error", reject)
      })
      .on("error", reject)
  })
}

const REPO_URL = "https://github.com/xfiln/telebot-waa"
const REPO_BRANCH = "paull"
const REPO_LOCAL_PATH = "/var/www/beta_tele"
const GITHUB_TOKEN = pickGithubToken()
const REPO_CACHE_FILE = path.join(__dirname, "repo_cache.json")

const GIT_SSH_KEY = process.env.GIT_SSH_KEY || "/root/.ssh/beta_tele"
const GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_SSH_COMMAND: `ssh -i ${GIT_SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
}

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const p = child_process.spawn("git", args, { cwd, env: GIT_ENV })
    let out = ""
    let err = ""
    p.stdout.on("data", (d) => (out += d.toString()))
    p.stderr.on("data", (d) => (err += d.toString()))
    p.on("close", (code) => resolve({ code, out, err }))
  })
}

function repoLoadCache() {
  if (!fs.existsSync(REPO_CACHE_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(REPO_CACHE_FILE, "utf8")) } catch { return {} }
}
function repoSaveCache(obj) {
  try { fs.writeFileSync(REPO_CACHE_FILE, JSON.stringify(obj, null, 2)) } catch {}
}
function normalizeRepoUrl(repoUrl) {
  let s = String(repoUrl || "").trim()
  s = s.replace(/#.*$/, "")
  s = s.replace(/\?.*$/, "")
  s = s.replace(/\/+$/, "")
  return s
}
function repoToApiCommitsUrl(repoUrl, branch) {
  const clean = normalizeRepoUrl(repoUrl)
  const m = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i)
  if (!m) throw new Error("Invalid GitHub repo URL: " + clean)
  const owner = m[1]
  const repo = m[2].replace(/\.git$/i, "")
  return `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch || "main")}&per_page=1`
}
async function fetchJson(url, headers = {}) {
  if (typeof fetch === "function") {
    const res = await fetch(url, { headers })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { ok: res.ok, status: res.status, json, text }
  }
  const https = require("https")
  return await new Promise((resolve) => {
    const req = https.request(url, { method: "GET", headers }, (res) => {
      const chunks = []
      res.on("data", (d) => chunks.push(d))
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8")
        let json = null
        try { json = JSON.parse(text) } catch {}
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json,
          text,
        })
      })
    })
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: e.message }))
    req.end()
  })
}

function getOwners() {
  if (Array.isArray(global.ownerid) && global.ownerid.length) return global.ownerid.map(String)
  if (global.premid) return [String(global.premid)]
  return []
}

async function ensureOriginSSH() {
  try {
    if (!REPO_LOCAL_PATH || !fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) return
    const r = await runGit(["remote", "get-url", "origin"], REPO_LOCAL_PATH)
    const cur = String(r.out || "").trim()
    if (!cur) return

    const m = cur.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i)
    if (!m) return
    const owner = m[1]
    const repo = m[2].replace(/\.git$/i, "")
    const sshUrl = `git@github.com:${owner}/${repo}.git`
    await runGit(["remote", "set-url", "origin", sshUrl], REPO_LOCAL_PATH)
  } catch {}
}

async function checkRepoUpdate() {
  try {
    const owners = getOwners()
    if (!owners.length) return

    const url = normalizeRepoUrl(REPO_URL)
    const branch = REPO_BRANCH || "main"
    const apiUrl = repoToApiCommitsUrl(url, branch)

    const headers = {
      "User-Agent": "FilnBotz-RepoWatcher",
      Accept: "application/vnd.github+json",
    }
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`

    const { ok, status, json } = await fetchJson(apiUrl, headers)
    if (!ok || !json) {
      conn.logger.warn(`[GITHUB] fetch failed ${status} for ${url} (${branch})`)
      return
    }

    const latest = Array.isArray(json) ? json[0] : null
    const latestSha = latest?.sha
    if (!latestSha) return

    const cache = repoLoadCache()
    const key = `${url}#${branch}`
    const last = cache[key]?.lastCommit || null

    if (last && last === latestSha) {
      cache[key] = { ...cache[key], lastChecked: Date.now() }
      repoSaveCache(cache)
      return
    }

    cache[key] = { lastCommit: latestSha, lastChecked: Date.now(), lastNotified: Date.now() }
    repoSaveCache(cache)

    const msgText = latest?.commit?.message || "-"
    const authorName = latest?.commit?.author?.name || "-"
    const authorDate = latest?.commit?.author?.date || null
    const htmlUrl = latest?.html_url || url

    const notif = [
      "Update Repository Terdeteksi",
      `Repo: ${url}`,
      `Branch: ${branch}`,
      `Commit: ${String(latestSha).slice(0, 7)}`,
      `Author: ${authorName}`,
      authorDate ? `Time: ${new Date(authorDate).toLocaleString("id-ID")}` : "",
      "",
      "Pesan commit:",
      String(msgText).slice(0, 1500),
    ].filter(Boolean).join("\n")

    for (const oid of owners) {
      await conn.sendButt(
        oid,
        notif,
        [
          [
            { text: "Lihat di GitHub", url: htmlUrl },
            { text: "Pull Sekarang", callback_data: "pull_repo_tele_waa" },
          ],
        ],
        null,
        {},
      )
    }

    conn.logger.info(`[GITHUB] update detected: ${url} (${branch})`)
  } catch (e) {
    conn.logger.error("Repo check error: " + e.message)
  }
}

async function handleRepoCallback(ctx) {
  try {
    const data = ctx.callbackQuery?.data || ""
    if (data !== "pull_repo_tele_waa") return false

    const owners = getOwners()
    const fromId = String(ctx.from?.id || "")
    if (!owners.includes(fromId)) {
      try {
        await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Hanya owner yang bisa.", { show_alert: true })
      } catch {}
      return true
    }

    if (!REPO_LOCAL_PATH || !fs.existsSync(REPO_LOCAL_PATH)) {
      try {
        await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Folder repo tidak ada.", { show_alert: true })
      } catch {}
      const chatId = ctx.callbackQuery.message.chat.id
      const replyTo = ctx.callbackQuery.message.message_id
      await ctx.telegram.sendMessage(chatId, `❌ Folder repo tidak ditemukan:\n${REPO_LOCAL_PATH}`, {
        reply_to_message_id: replyTo,
      })
      return true
    }

    if (!fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) {
      try {
        await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Bukan folder git.", { show_alert: true })
      } catch {}
      const chatId = ctx.callbackQuery.message.chat.id
      const replyTo = ctx.callbackQuery.message.message_id
      await ctx.telegram.sendMessage(chatId, `❌ Folder ini tidak punya .git:\n${REPO_LOCAL_PATH}`, {
        reply_to_message_id: replyTo,
      })
      return true
    }

    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Pulling...", { show_alert: false }) } catch {}

    await ensureOriginSSH()

    const chatId = ctx.callbackQuery.message.chat.id
    const replyTo = ctx.callbackQuery.message.message_id

    child_process.exec(
      `git fetch --all --prune && git checkout ${REPO_BRANCH} && (git stash push -m "auto-stash before pull" --include-untracked || true) && git pull`,
      { cwd: REPO_LOCAL_PATH, timeout: 120000, env: GIT_ENV },
      async (err, stdout, stderr) => {
        if (err) {
          const out = (stderr || err.message || "").toString().slice(0, 3500)
          await ctx.telegram.sendMessage(chatId, `❌ Gagal git pull\n\n${out}`, {
            reply_to_message_id: replyTo,
          })
          return
        }
        const out = (stdout || "").toString().slice(0, 3500)
        await ctx.telegram.sendMessage(chatId, `✅ Berhasil update\n\n${out}`, {
          reply_to_message_id: replyTo,
        })
      },
    )

    return true
  } catch (e) {
    conn.logger.error("Repo callback error: " + e.message)
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Error", { show_alert: true }) } catch {}
    return true
  }
}

function parsePorcelain(statusText) {
  const lines = String(statusText || "").split("\n").map((x) => x.trimEnd()).filter(Boolean)
  const trackedChanged = []
  const untrackedNew = []
  const deleted = []

  for (const line of lines) {
    if (line.startsWith("?? ")) {
      untrackedNew.push(line.slice(3).trim())
      continue
    }
    const code = line.slice(0, 2)
    const rest = line.slice(2).trim()
    if (code.includes("D")) deleted.push(rest)
    else trackedChanged.push(rest)
  }

  return { trackedChanged, untrackedNew, deleted, raw: lines.join("\n") }
}

const LOCAL_WATCH_INTERVAL_MS = 60 * 1000
const LOCAL_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000
global.__localSyncState = global.__localSyncState || { lastSig: null, lastNotifiedAt: 0 }
global.__pendingLocalPush = global.__pendingLocalPush || new Map()

async function getLocalChangesInfo() {
  try {
    if (!REPO_LOCAL_PATH || !fs.existsSync(REPO_LOCAL_PATH)) {
      return { ok: false, err: `Folder tidak ada: ${REPO_LOCAL_PATH}` }
    }
    if (!fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) {
      return { ok: false, err: `Bukan folder git: ${REPO_LOCAL_PATH}` }
    }

    const st = await runGit(["status", "--porcelain"], REPO_LOCAL_PATH)
    if (st.code !== 0) return { ok: false, err: st.err || st.out || "git status gagal" }

    const parsed = parsePorcelain(st.out)
    const dirty = parsed.trackedChanged.length || parsed.untrackedNew.length || parsed.deleted.length

    const diff = await runGit(["diff", "--stat"], REPO_LOCAL_PATH)
    const diffStat = String(diff.out || "").trim()

    const sig = `${parsed.raw}||${diffStat}`

    return { ok: true, dirty, sig, diffStat, ...parsed }
  } catch (e) {
    return { ok: false, err: e.message }
  }
}

function buildLocalPreviewText(info) {
  const showList = (arr) => {
    const items = (arr || []).slice(0, 25)
    if (!items.length) return "• -"
    return items.map((x) => `• ${x}`).join("\n")
  }

  return [
    "Perubahan Lokal Terdeteksi",
    `Path: ${REPO_LOCAL_PATH}`,
    `Branch: ${REPO_BRANCH}`,
    "",
    `Timpa (tracked berubah): ${info.trackedChanged.length}`,
    `Write (file baru): ${info.untrackedNew.length}`,
    `Deleted: ${info.deleted.length}`,
    "",
    "Ringkasan perubahan:",
    info.diffStat ? info.diffStat : "• -",
    "",
    "Contoh file (max 25):",
    showList([...(info.trackedChanged || []), ...(info.untrackedNew || []), ...(info.deleted || [])]),
  ].join("\n")
}

async function notifyOwnersLocalChanges(info) {
  const owners = getOwners()
  if (!owners.length) return

  const token = Math.random().toString(36).slice(2, 10)
  const commitMsg = `sync(beta_tele): ${new Date().toLocaleString("id-ID")}`

  global.__pendingLocalPush.set(token, { createdAt: Date.now(), commitMsg })

  const msg = buildLocalPreviewText(info)

  for (const oid of owners) {
    await conn.sendButt(
      oid,
      msg,
      [
        [
          { text: "Detail", callback_data: `localsync_detail:${token}` },
          { text: "Push Sekarang", callback_data: `localsync_push:${token}` },
        ],
      ],
      null,
      {},
    )
  }
}

async function checkLocalChangesAndNotify() {
  const info = await getLocalChangesInfo()
  if (!info.ok) return
  if (!info.dirty) return

  const now = Date.now()
  const st = global.__localSyncState

  if (st.lastSig === info.sig && now - st.lastNotifiedAt < LOCAL_NOTIFY_COOLDOWN_MS) return

  st.lastSig = info.sig
  st.lastNotifiedAt = now

  await notifyOwnersLocalChanges(info)
}

async function doLocalCommitPush(commitMsg) {
  if (!fs.existsSync(GIT_SSH_KEY)) {
    return { ok: false, text: `SSH key tidak ditemukan: ${GIT_SSH_KEY}` }
  }

  await ensureOriginSSH()

  const add = await runGit(["add", "-A"], REPO_LOCAL_PATH)
  if (add.code !== 0) return { ok: false, text: add.err || "git add gagal" }

  const commit = await runGit(["commit", "-m", commitMsg], REPO_LOCAL_PATH)
  const combined = (commit.out + "\n" + commit.err).toLowerCase()
  if (commit.code !== 0 && !combined.includes("nothing to commit")) {
    return { ok: false, text: commit.err || commit.out || "git commit gagal" }
  }

  const push = await runGit(["push", "origin", REPO_BRANCH], REPO_LOCAL_PATH)
  if (push.code !== 0) return { ok: false, text: push.err || push.out || "git push gagal" }

  return { ok: true, text: (commit.out || "") + "\n" + (push.out || "") }
}

async function handleLocalSyncCallback(ctx) {
  const data = String(ctx.callbackQuery?.data || "")
  if (!data.startsWith("localsync_")) return false

  const owners = getOwners()
  const fromId = String(ctx.from?.id || "")
  if (!owners.includes(fromId)) {
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Owner only.", { show_alert: true }) } catch {}
    return true
  }

  const [action, token] = data.split(":")
  const pending = global.__pendingLocalPush.get(token)
  if (!pending) {
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Expired.", { show_alert: true }) } catch {}
    return true
  }

  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    global.__pendingLocalPush.delete(token)
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Expired.", { show_alert: true }) } catch {}
    return true
  }

  const chatId = ctx.callbackQuery.message.chat.id
  const replyTo = ctx.callbackQuery.message.message_id

  if (action === "localsync_detail") {
    const info = await getLocalChangesInfo()
    if (!info.ok) {
      await ctx.telegram.sendMessage(chatId, `❌ ${info.err}`, { reply_to_message_id: replyTo })
      return true
    }
    const detail = [
      "Detail Perubahan Lokal",
      "",
      "status --porcelain:",
      info.raw ? info.raw.slice(0, 3500) : "-",
      "",
      "diff --stat:",
      info.diffStat ? info.diffStat.slice(0, 3500) : "-",
    ].join("\n")
    await ctx.telegram.sendMessage(chatId, detail, { reply_to_message_id: replyTo })
    return true
  }

  if (action === "localsync_push") {
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Pushing...", { show_alert: false }) } catch {}

    const res = await doLocalCommitPush(pending.commitMsg)
    global.__pendingLocalPush.delete(token)

    if (!res.ok) {
      const out = String(res.text || "failed").slice(0, 3500)
      await ctx.telegram.sendMessage(chatId, `❌ Push gagal\n\n${out}`, { reply_to_message_id: replyTo })
      return true
    }

    const out = String(res.text || "ok").slice(0, 3500)
    await ctx.telegram.sendMessage(chatId, `✅ Push sukses\n\n${out}`, { reply_to_message_id: replyTo })
    return true
  }

  return true
}

conn.use(async (ctx, next) => {
  try {
    if (ctx.message || ctx.callback_query) {
      const m = smsg(ctx)
      if (m) await require("./handler").handler.call(conn, m)
    } else if (ctx.myChatMember) {
      await require("./handler").participantsUpdate.call(conn, ctx)
    } else if (ctx.chatMember) {
      await require("./handler").participantsUpdate.call(conn, ctx)
    }
    return next()
  } catch (e) {
    console.error("Middleware error:", e)
  }
})

conn.on("new_chat_members", async (ctx) => {
  try {
    await require("./handler").participantsUpdate.call(conn, ctx)
  } catch (e) {
    console.error("Error handling new_chat_members:", e)
  }
})

conn.on("left_chat_member", async (ctx) => {
  try {
    await require("./handler").participantsUpdate.call(conn, ctx)
  } catch (e) {
    console.error("Error handling left_chat_member:", e)
  }
})

conn.on("callback_query", async (ctx) => {
  try {
    const handledLocal = await handleLocalSyncCallback(ctx)
    if (handledLocal) return

    const handledRepo = await handleRepoCallback(ctx)
    if (handledRepo) return

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 300000))

    for (const pluginName in global.plugins) {
      const plugin = global.plugins[pluginName]
      if (plugin && typeof plugin.callback === "function") {
        try {
          const enrichedCtx = {
            ...ctx,
            conn,
            data: ctx.callbackQuery?.data,
            callbackQuery: ctx.callbackQuery,
            answerCbQuery: (text, opt = {}) =>
              ctx.telegram.answerCbQuery(ctx.callbackQuery.id, text, opt),
          }

          const result = await Promise.race([plugin.callback(enrichedCtx), timeoutPromise])
          if (result === true) break
        } catch {}
      }
    }
  } catch (err) {
    try {
      await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Error", { show_alert: true })
    } catch {}
  }
})

async function checkMediaSupport() {
  const checks = await Promise.all(
    [
      child_process.spawn("ffmpeg"),
      child_process.spawn("ffprobe"),
      child_process.spawn("convert"),
      child_process.spawn("magick"),
      child_process.spawn("gm"),
    ].map((spawn) => {
      return Promise.race([
        new Promise((resolve) => spawn.on("close", (exitCode) => resolve(exitCode !== 127))),
        new Promise((resolve) => spawn.on("error", () => resolve(false))),
      ])
    }),
  )

  const [ffmpeg, ffprobe, convert, magick, gm] = checks
  global.support = { ffmpeg, ffprobe, convert, magick, gm }

  if (!global.support.ffmpeg) conn.logger.warn("Please install FFMPEG (sudo apt install ffmpeg)")
  if (!global.support.magick) conn.logger.warn("Please install ImageMagick (sudo apt install imagemagick)")
}

async function launchBot() {
  let retryCount = 0
  const maxRetries = 5
  const retryDelay = 5000

  while (retryCount < maxRetries) {
    try {
      await conn.launch()
      conn.logger.info("Bot launched successfully")
      break
    } catch (err) {
      retryCount++
      conn.logger.error(`Bot launch attempt ${retryCount} failed: ${err.message}`)

      if (err.code === "ETIMEDOUT" || err.code === "ENOTFOUND" || err.code === "ECONNRESET") {
        if (retryCount < maxRetries) {
          conn.logger.info(`Retrying in ${retryDelay / 1000} seconds...`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        } else {
          conn.logger.error("Max retries reached. Check your internet connection and bot token.")
        }
      } else {
        throw err
      }
    }
  }
}

ensureOriginSSH().catch(() => {})

const REPO_WATCH_INTERVAL_MS = 60 * 1000
checkRepoUpdate().catch(() => {})
setInterval(() => checkRepoUpdate().catch(() => {}), REPO_WATCH_INTERVAL_MS)

checkLocalChangesAndNotify().catch(() => {})
setInterval(() => checkLocalChangesAndNotify().catch(() => {}), LOCAL_WATCH_INTERVAL_MS)

checkMediaSupport()
  .then(() => conn.logger.info("Quick Test Done"))
  .then(() => launchBot())
  .catch(console.error)

process.once("SIGINT", async () => {
  conn.logger.warn("SIGINT received, saving database...")
  try { await global.saveDatabase() } catch {}
  await conn.stop("SIGINT")
  process.exit(0)
})

process.once("SIGTERM", async () => {
  conn.logger.warn("SIGTERM received, saving database...")
  try { await global.saveDatabase() } catch {}
  await conn.stop("SIGTERM")
  process.exit(0)
})





/*
const { 
    default: makeWASocket, 
    prepareWAMessageMedia, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    generateWAMessageFromContent, 
    generateWAMessageContent, 
    generateWAMessage,
    jidDecode, 
    proto, 
    delay,
    relayWAMessage, 
    getContentType, 
    getAggregateVotesInPollMessage, 
    downloadContentFromMessage, 
    fetchLatestWaWebVersion, 
    InteractiveMessage, 
    makeCacheableSignalKeyStore, 
    Browsers, 
    generateForwardMessageContent, 
    MessageRetryMap 
} = require("@adiwajshing/baileys");
const { Telegraf } = require("telegraf")
const cfonts = require('cfonts');
const pino = require('pino');
const path = require("path")
const FileType = require('file-type');
const readline = require("readline");
const fs = require('fs');
const crypto = require("crypto")
const colors = require('colors')
const chalk = require('chalk')
const {
    Boom 
} = require('@hapi/boom');
const syntaxError = require("syntax-error")
const child_process = require("child_process")
require("./config")
const { getMimeType } = require("./lib/getMime")
const { EventEmitter } = require("events")

EventEmitter.defaultMaxListeners = 0
try { process.setMaxListeners(0) } catch {}

function pickTelegramToken() {
  const candidates = [
    process.env.BOT_TOKEN,
    process.env.TELEGRAM_TOKEN,
    global.telegramToken,
    global.botToken,
    global.token,
  ].filter(Boolean)

  for (const t of candidates) {
    const s = String(t).trim()
    if (/^\d+:[A-Za-z0-9_-]{20,}$/.test(s)) return s
  }
  return String(candidates[0] || "").trim()
}

function pickGithubToken() {
  const candidates = [
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
    global.githubToken,
    global.ghToken,
    global.token,
  ].filter(Boolean)

  for (const t of candidates) {
    const s = String(t).trim()
    if (/^(ghp_|github_pat_)/i.test(s)) return s
  }
  return ""
}

const conn = new Telegraf(pickTelegramToken())
const BOT_USERNAME = process.env.BOT_USERNAME || global.botnames?.replace(/^@/, "") || "Filnz_bot"

global.stripAtSuffix = (s) =>
  String(s || "").replace(new RegExp(`@${BOT_USERNAME}$`, "i"), "")

global.atifyCommands = (handler) => {
  if (!handler || !handler.command) return handler
  const list = Array.isArray(handler.command) ? handler.command : [handler.command]
  const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const toRegex = (c) =>
    c instanceof RegExp
      ? c
      : new RegExp(`^${esc(c)}(?:@${BOT_USERNAME.replace(/_/g, "[_]*")})?$`, "i")
  handler.command = list.map(toRegex)
  return handler
}

global.BOT_USERNAME = BOT_USERNAME
console.log(`[✓] BOT_USERNAME set to @${BOT_USERNAME}`)

global.API = (name, pathUrl = "/", query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  pathUrl +
  (query || apikeyqueryname
    ? "?" +
      new URLSearchParams(
        Object.entries({
          ...query,
          ...(apikeyqueryname
            ? {
                [apikeyqueryname]:
                  global.APIKeys[name in global.APIs ? global.APIs[name] : name],
              }
            : {}),
        }),
      )
    : "")

global.timestamp = { start: new Date() }

function waktuWIB() {
  const now = new Date()
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "longOffset",
  }
  const formatted = wibTime.toLocaleString("en-US", options)
  return `[${formatted.replace(/GMT\+7/, "GMT+0700")} (Western Indonesia Time - WIB)]`
}

conn.logger = {
  info: (msg) =>
    console.log(
      `${chalk.green.bold("INFO")} ${chalk.white.bold(waktuWIB())}: ${chalk.cyan(msg)}`,
    ),
  warn: (msg) =>
    console.log(
      `${chalk.hex("#FF8800").bold("WARNING")} ${chalk.white.bold(waktuWIB())}: ${chalk.yellow(msg)}`,
    ),
  error: (msg) =>
    console.log(
      `${chalk.red.bold("ERROR")} ${chalk.white.bold(waktuWIB())}: ${chalk.red(msg)}`,
    ),
}

require("./lib/simple")(conn)

const DB_FILE = path.join(__dirname, "database.json")

global.db = {
  data: null,
  READ: false,
}

function ensureDbShape() {
  if (!global.db.data || typeof global.db.data !== "object") global.db.data = {}
  const base = global.db.data
  if (!base.users || typeof base.users !== "object") base.users = {}
  if (!base.chats || typeof base.chats !== "object") base.chats = {}
  if (!base.stats || typeof base.stats !== "object") base.stats = {}
  if (!base.msgs || typeof base.msgs !== "object") base.msgs = {}
  if (!base.sticker || typeof base.sticker !== "object") base.sticker = {}
}

global.loadDatabase = async () => {
  if (global.db.READ) return global.db.data
  if (global.db.data !== null) return global.db.data

  global.db.READ = true
  try {
    console.log(chalk.cyan("🗂  DB file:"), DB_FILE)

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf8").trim()
        global.db.data = raw.length > 0 ? JSON.parse(raw) : null
      } catch (e) {
        console.log(chalk.red("Gagal parse database.json, reset baru:"), e.message)
        global.db.data = null
      }
    } else {
      global.db.data = null
    }

    ensureDbShape()
    console.log(
      chalk.green(
        `✅ Database loaded. users: ${
          Object.keys(global.db.data.users).length
        }, chats: ${Object.keys(global.db.data.chats).length}`,
      ),
    )
  } finally {
    global.db.READ = false
  }

  return global.db.data
}

async function saveDatabase() {
  try {
    if (!global.db.data) return
    ensureDbShape()
    fs.writeFileSync(DB_FILE, JSON.stringify(global.db.data, null, 2))
  } catch (e) {
    console.log(chalk.red("Save database error:"), e)
  }
}

global.saveDatabase = saveDatabase

;(async () => {
  await global.loadDatabase()
  setInterval(saveDatabase, 30000)
})()

global.File = class File extends Blob {
  constructor(chunks, name, opts = {}) {
    super(chunks, opts)
    this.name = name
    this.lastModified = opts.lastModified || Date.now()
  }
}

global.cleartmp = () => {
  const tmpDir = path.join(__dirname, "tmp")
  if (fs.existsSync(tmpDir)) {
    try {
      const files = fs.readdirSync(tmpDir)
      let deletedCount = 0
      files.forEach((file) => {
        try {
          const filePath = path.join(tmpDir, file)
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        } catch (err) {
          conn.logger.warn(`Failed to delete file ${file}: ${err.message}`)
        }
      })
      if (deletedCount > 0) conn.logger.info(`Cleared ${deletedCount} temporary files from tmp directory`)
      else conn.logger.info("No temporary files to clear")
    } catch (err) {
      conn.logger.error(`Error clearing tmp directory: ${err.message}`)
    }
  } else {
    try {
      fs.mkdirSync(tmpDir, { recursive: true })
      conn.logger.info("Created tmp directory")
    } catch (err) {
      conn.logger.error(`Error creating tmp directory: ${err.message}`)
    }
  }
}

global.plugins = {}
const pluginsDir = path.join(__dirname, "plugins")

function loadPlugins() {
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir)
  const files = fs.readdirSync(pluginsDir).filter((file) => file.endsWith(".js"))
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(pluginsDir, file))]
      const plugin = require(path.join(pluginsDir, file))
      if (plugin && typeof global.atifyCommands === "function") global.atifyCommands(plugin)
      global.plugins[file] = plugin
    } catch (e) {
      console.log(`Error loading plugin ${file}:`, e)
    }
  }
}

loadPlugins()

global.reload = (event, filePath) => {
  if (/\.js$/.test(filePath)) {
    const fullFilePath = path.join(pluginsDir, filePath)

    try { fs.unwatchFile(fullFilePath) } catch {}

    if (fullFilePath in require.cache) {
      delete require.cache[fullFilePath]
      if (fs.existsSync(fullFilePath)) conn.logger.info(`Re-requiring plugin '${filePath}'`)
      else {
        conn.logger.warn(`Deleted plugin '${filePath}'`)
        return delete global.plugins[filePath]
      }
    } else {
      conn.logger.info(`Requiring new plugin '${filePath}'`)
    }

    const errorCheck = syntaxError(fs.readFileSync(fullFilePath), filePath)
    if (errorCheck) conn.logger.error(`Syntax error while loading '${filePath}':\n${errorCheck}`)
    else {
      try {
        global.plugins[filePath] = require(fullFilePath)
      } catch (error) {
        conn.logger.error(error)
      } finally {
        global.plugins = Object.fromEntries(
          Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)),
        )
      }
    }
  }
}

Object.freeze(global.reload)
fs.watch(path.join(__dirname, "plugins"), global.reload)

global.reloadHandler = () => require("./handler")

function collectMentionsSync(msg) {
  const text = msg.text || msg.caption || ""
  const entities = [...(msg.entities || []), ...(msg.caption_entities || [])]
  const result = { ids: [], usernames: [] }

  for (const e of entities) {
    if (e.type === "text_mention" && e.user && e.user.id) result.ids.push(e.user.id)
    else if (e.type === "mention") {
      const usernameRaw = text.substring(e.offset, e.offset + e.length)
      const username = usernameRaw.replace(/^@/, "")
      if (username) result.usernames.push(username)
    }
  }
  return result
}
global.collectMentionsSync = collectMentionsSync

function smsg(ctx) {
  if (!ctx.message && !ctx.callback_query) return null
  const m = ctx.message || ctx.callback_query.message
  const M = {}

  if (ctx.chat.type === "channel") return null

  M.text = m.text || m.caption || ""
  M.msgs = m
  M.mtype = Object.keys(m)[1] || Object.keys(m)[0]
  M.id = m.message_id
  M.chat = ctx.chat.id
  M.sender = ctx.from.id
  M.fromMe = ctx.from.is_bot
  M.name = ctx.from.first_name || ctx.from.username || "Unknown"
  M.firstname = ctx.from.first_name || ""
  M.lastname = ctx.from.last_name || ""
  M.pushname = `${ctx.from.first_name} ${ctx.from.last_name}` || ctx.from.username || "Unknown"
  M.pushName = ctx.from.username || "Unknown"
  M.usertag = ctx.from.username || ""
  M.isBot = ctx.from.is_bot
  M.isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup"
  if (M.isGroup) M.groupName = ctx.chat.title || "Unknown Group"

  if (ctx.callback_query) {
    M.callbackQuery = ctx.callback_query
    M.data = ctx.callback_query.data
  }

  const ctxCopy = JSON.parse(
    JSON.stringify(
      ctx,
      (() => {
        const seen = new WeakSet()
        return (key, value) => {
          if (key === "token") return "[HIDDEN]"
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return
            seen.add(value)
          }
          return value
        }
      })(),
    ),
  )
  M.fakeObj = ctxCopy

  M.reply = async (text, options = {}) => {
    return await conn.reply(M.chat, text, { message_id: M.id }, options)
  }

  return M
}

const REPO_URL = "https://github.com/paulszch/tele-waa"
const REPO_BRANCH = "v1"
const REPO_LOCAL_PATH = "/var/www/beta_tele"
const GITHUB_TOKEN = pickGithubToken()
const REPO_CACHE_FILE = path.join(__dirname, "repo_cache.json")

const GIT_SSH_KEY = process.env.GIT_SSH_KEY || "/root/.ssh/beta_tele"
const GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_SSH_COMMAND: `ssh -i ${GIT_SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
}

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const p = child_process.spawn("git", args, { cwd, env: GIT_ENV })
    let out = ""
    let err = ""
    p.stdout.on("data", (d) => (out += d.toString()))
    p.stderr.on("data", (d) => (err += d.toString()))
    p.on("close", (code) => resolve({ code, out, err }))
  })
}

function repoLoadCache() {
  if (!fs.existsSync(REPO_CACHE_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(REPO_CACHE_FILE, "utf8")) } catch { return {} }
}
function repoSaveCache(obj) {
  try { fs.writeFileSync(REPO_CACHE_FILE, JSON.stringify(obj, null, 2)) } catch {}
}
function normalizeRepoUrl(repoUrl) {
  let s = String(repoUrl || "").trim()
  s = s.replace(/#.*$/, "")
  s = s.replace(/\?.*$/, "")
  s = s.replace(/\/+$/, "")
  return s
}
function repoToApiCommitsUrl(repoUrl, branch) {
  const clean = normalizeRepoUrl(repoUrl)
  const m = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i)
  if (!m) throw new Error("Invalid GitHub repo URL: " + clean)
  const owner = m[1]
  const repo = m[2].replace(/\.git$/i, "")
  return `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch || "main")}&per_page=1`
}
async function fetchJson(url, headers = {}) {
  if (typeof fetch === "function") {
    const res = await fetch(url, { headers })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { ok: res.ok, status: res.status, json, text }
  }
  const https = require("https")
  return await new Promise((resolve) => {
    const req = https.request(url, { method: "GET", headers }, (res) => {
      const chunks = []
      res.on("data", (d) => chunks.push(d))
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8")
        let json = null
        try { json = JSON.parse(text) } catch {}
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json,
          text,
        })
      })
    })
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: e.message }))
    req.end()
  })
}

function getOwners() {
  if (Array.isArray(global.ownerid) && global.ownerid.length) return global.ownerid.map(String)
  if (global.premid) return [String(global.premid)]
  return []
}

async function ensureOriginSSH() {
  try {
    if (!REPO_LOCAL_PATH || !fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) return
    const r = await runGit(["remote", "get-url", "origin"], REPO_LOCAL_PATH)
    const cur = String(r.out || "").trim()
    if (!cur) return

    const m = cur.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i)
    if (!m) return
    const owner = m[1]
    const repo = m[2].replace(/\.git$/i, "")
    const sshUrl = `git@github.com:${owner}/${repo}.git`
    await runGit(["remote", "set-url", "origin", sshUrl], REPO_LOCAL_PATH)
  } catch {}
}

async function checkRepoUpdate() {
  try {
    const owners = getOwners()
    if (!owners.length) return

    const url = normalizeRepoUrl(REPO_URL)
    const branch = REPO_BRANCH || "main"
    const apiUrl = repoToApiCommitsUrl(url, branch)

    const headers = {
      "User-Agent": "FilnBotz-RepoWatcher",
      Accept: "application/vnd.github+json",
    }
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`

    const { ok, status, json } = await fetchJson(apiUrl, headers)
    if (!ok || !json) {
      conn.logger.warn(`[GITHUB] fetch failed ${status} for ${url} (${branch})`)
      return
    }

    const latest = Array.isArray(json) ? json[0] : null
    const latestSha = latest?.sha
    if (!latestSha) return

    const cache = repoLoadCache()
    const key = `${url}#${branch}`
    const last = cache[key]?.lastCommit || null

    if (last && last === latestSha) {
      cache[key] = { ...cache[key], lastChecked: Date.now() }
      repoSaveCache(cache)
      return
    }

    cache[key] = { lastCommit: latestSha, lastChecked: Date.now(), lastNotified: Date.now() }
    repoSaveCache(cache)

    const msgText = latest?.commit?.message || "-"
    const authorName = latest?.commit?.author?.name || "-"
    const authorDate = latest?.commit?.author?.date || null
    const htmlUrl = latest?.html_url || url

    const notif = [
      "Update Repository Terdeteksi",
      `Repo: ${url}`,
      `Branch: ${branch}`,
      `Commit: ${String(latestSha).slice(0, 7)}`,
      `Author: ${authorName}`,
      authorDate ? `Time: ${new Date(authorDate).toLocaleString("id-ID")}` : "",
      "",
      "Pesan commit:",
      String(msgText).slice(0, 1500),
    ].filter(Boolean).join("\n")

    for (const oid of owners) {
      await conn.sendButt(
        oid,
        notif,
        [
          [
            { text: "Lihat di GitHub", url: htmlUrl },
            { text: "Pull Sekarang", callback_data: "pull_repo_tele_waa" },
          ],
        ],
        null,
        {},
      )
    }

    conn.logger.info(`[GITHUB] update detected: ${url} (${branch})`)
  } catch (e) {
    conn.logger.error("Repo check error: " + e.message)
  }
}

async function handleRepoCallback(ctx) {
  try {
    const data = ctx.callbackQuery?.data || ""
    if (data !== "pull_repo_tele_waa") return false

    const owners = getOwners()
    const fromId = String(ctx.from?.id || "")
    if (!owners.includes(fromId)) {
      try {
        await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Hanya owner yang bisa.", { show_alert: true })
      } catch {}
      return true
    }

    if (!REPO_LOCAL_PATH || !fs.existsSync(REPO_LOCAL_PATH)) {
      try {
        await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Folder repo tidak ada.", { show_alert: true })
      } catch {}
      const chatId = ctx.callbackQuery.message.chat.id
      const replyTo = ctx.callbackQuery.message.message_id
      await ctx.telegram.sendMessage(chatId, `❌ Folder repo tidak ditemukan:\n${REPO_LOCAL_PATH}`, {
        reply_to_message_id: replyTo,
      })
      return true
    }

    if (!fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) {
      try {
        await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Bukan folder git.", { show_alert: true })
      } catch {}
      const chatId = ctx.callbackQuery.message.chat.id
      const replyTo = ctx.callbackQuery.message.message_id
      await ctx.telegram.sendMessage(chatId, `❌ Folder ini tidak punya .git:\n${REPO_LOCAL_PATH}`, {
        reply_to_message_id: replyTo,
      })
      return true
    }

    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Pulling...", { show_alert: false }) } catch {}

    await ensureOriginSSH()

    const chatId = ctx.callbackQuery.message.chat.id
    const replyTo = ctx.callbackQuery.message.message_id

    child_process.exec(
      `git fetch --all --prune && git checkout ${REPO_BRANCH} && (git stash push -m "auto-stash before pull" --include-untracked || true) && git pull`,
      { cwd: REPO_LOCAL_PATH, timeout: 120000, env: GIT_ENV },
      async (err, stdout, stderr) => {
        if (err) {
          const out = (stderr || err.message || "").toString().slice(0, 3500)
          await ctx.telegram.sendMessage(chatId, `❌ Gagal git pull\n\n${out}`, {
            reply_to_message_id: replyTo,
          })
          return
        }
        const out = (stdout || "").toString().slice(0, 3500)
        await ctx.telegram.sendMessage(chatId, `✅ Berhasil update\n\n${out}`, {
          reply_to_message_id: replyTo,
        })
      },
    )

    return true
  } catch (e) {
    conn.logger.error("Repo callback error: " + e.message)
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Error", { show_alert: true }) } catch {}
    return true
  }
}

function parsePorcelain(statusText) {
  const lines = String(statusText || "").split("\n").map((x) => x.trimEnd()).filter(Boolean)
  const trackedChanged = []
  const untrackedNew = []
  const deleted = []

  for (const line of lines) {
    if (line.startsWith("?? ")) {
      untrackedNew.push(line.slice(3).trim())
      continue
    }
    const code = line.slice(0, 2)
    const rest = line.slice(2).trim()
    if (code.includes("D")) deleted.push(rest)
    else trackedChanged.push(rest)
  }

  return { trackedChanged, untrackedNew, deleted, raw: lines.join("\n") }
}

const LOCAL_WATCH_INTERVAL_MS = 60 * 1000
const LOCAL_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000
global.__localSyncState = global.__localSyncState || { lastSig: null, lastNotifiedAt: 0 }
global.__pendingLocalPush = global.__pendingLocalPush || new Map()

async function getLocalChangesInfo() {
  try {
    if (!REPO_LOCAL_PATH || !fs.existsSync(REPO_LOCAL_PATH)) {
      return { ok: false, err: `Folder tidak ada: ${REPO_LOCAL_PATH}` }
    }
    if (!fs.existsSync(path.join(REPO_LOCAL_PATH, ".git"))) {
      return { ok: false, err: `Bukan folder git: ${REPO_LOCAL_PATH}` }
    }

    const st = await runGit(["status", "--porcelain"], REPO_LOCAL_PATH)
    if (st.code !== 0) return { ok: false, err: st.err || st.out || "git status gagal" }

    const parsed = parsePorcelain(st.out)
    const dirty = parsed.trackedChanged.length || parsed.untrackedNew.length || parsed.deleted.length

    const diff = await runGit(["diff", "--stat"], REPO_LOCAL_PATH)
    const diffStat = String(diff.out || "").trim()

    const sig = `${parsed.raw}||${diffStat}`

    return { ok: true, dirty, sig, diffStat, ...parsed }
  } catch (e) {
    return { ok: false, err: e.message }
  }
}

function buildLocalPreviewText(info) {
  const showList = (arr) => {
    const items = (arr || []).slice(0, 25)
    if (!items.length) return "• -"
    return items.map((x) => `• ${x}`).join("\n")
  }

  return [
    "Perubahan Lokal Terdeteksi",
    `Path: ${REPO_LOCAL_PATH}`,
    `Branch: ${REPO_BRANCH}`,
    "",
    `Timpa (tracked berubah): ${info.trackedChanged.length}`,
    `Write (file baru): ${info.untrackedNew.length}`,
    `Deleted: ${info.deleted.length}`,
    "",
    "Ringkasan perubahan:",
    info.diffStat ? info.diffStat : "• -",
    "",
    "Contoh file (max 25):",
    showList([...(info.trackedChanged || []), ...(info.untrackedNew || []), ...(info.deleted || [])]),
  ].join("\n")
}

async function notifyOwnersLocalChanges(info) {
  const owners = getOwners()
  if (!owners.length) return

  const token = Math.random().toString(36).slice(2, 10)
  const commitMsg = `sync(beta_tele): ${new Date().toLocaleString("id-ID")}`

  global.__pendingLocalPush.set(token, { createdAt: Date.now(), commitMsg })

  const msg = buildLocalPreviewText(info)

  for (const oid of owners) {
    await conn.sendButt(
      oid,
      msg,
      [
        [
          { text: "Detail", callback_data: `localsync_detail:${token}` },
          { text: "Push Sekarang", callback_data: `localsync_push:${token}` },
        ],
      ],
      null,
      {},
    )
  }
}

async function checkLocalChangesAndNotify() {
  const info = await getLocalChangesInfo()
  if (!info.ok) return
  if (!info.dirty) return

  const now = Date.now()
  const st = global.__localSyncState

  if (st.lastSig === info.sig && now - st.lastNotifiedAt < LOCAL_NOTIFY_COOLDOWN_MS) return

  st.lastSig = info.sig
  st.lastNotifiedAt = now

  await notifyOwnersLocalChanges(info)
}

async function doLocalCommitPush(commitMsg) {
  if (!fs.existsSync(GIT_SSH_KEY)) {
    return { ok: false, text: `SSH key tidak ditemukan: ${GIT_SSH_KEY}` }
  }

  await ensureOriginSSH()

  const add = await runGit(["add", "-A"], REPO_LOCAL_PATH)
  if (add.code !== 0) return { ok: false, text: add.err || "git add gagal" }

  const commit = await runGit(["commit", "-m", commitMsg], REPO_LOCAL_PATH)
  const combined = (commit.out + "\n" + commit.err).toLowerCase()
  if (commit.code !== 0 && !combined.includes("nothing to commit")) {
    return { ok: false, text: commit.err || commit.out || "git commit gagal" }
  }

  const push = await runGit(["push", "origin", REPO_BRANCH], REPO_LOCAL_PATH)
  if (push.code !== 0) return { ok: false, text: push.err || push.out || "git push gagal" }

  return { ok: true, text: (commit.out || "") + "\n" + (push.out || "") }
}

async function handleLocalSyncCallback(ctx) {
  const data = String(ctx.callbackQuery?.data || "")
  if (!data.startsWith("localsync_")) return false

  const owners = getOwners()
  const fromId = String(ctx.from?.id || "")
  if (!owners.includes(fromId)) {
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Owner only.", { show_alert: true }) } catch {}
    return true
  }

  const [action, token] = data.split(":")
  const pending = global.__pendingLocalPush.get(token)
  if (!pending) {
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Expired.", { show_alert: true }) } catch {}
    return true
  }

  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    global.__pendingLocalPush.delete(token)
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Expired.", { show_alert: true }) } catch {}
    return true
  }

  const chatId = ctx.callbackQuery.message.chat.id
  const replyTo = ctx.callbackQuery.message.message_id

  if (action === "localsync_detail") {
    const info = await getLocalChangesInfo()
    if (!info.ok) {
      await ctx.telegram.sendMessage(chatId, `❌ ${info.err}`, { reply_to_message_id: replyTo })
      return true
    }
    const detail = [
      "Detail Perubahan Lokal",
      "",
      "status --porcelain:",
      info.raw ? info.raw.slice(0, 3500) : "-",
      "",
      "diff --stat:",
      info.diffStat ? info.diffStat.slice(0, 3500) : "-",
    ].join("\n")
    await ctx.telegram.sendMessage(chatId, detail, { reply_to_message_id: replyTo })
    return true
  }

  if (action === "localsync_push") {
    try { await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "⏳ Pushing...", { show_alert: false }) } catch {}

    const res = await doLocalCommitPush(pending.commitMsg)
    global.__pendingLocalPush.delete(token)

    if (!res.ok) {
      const out = String(res.text || "failed").slice(0, 3500)
      await ctx.telegram.sendMessage(chatId, `❌ Push gagal\n\n${out}`, { reply_to_message_id: replyTo })
      return true
    }

    const out = String(res.text || "ok").slice(0, 3500)
    await ctx.telegram.sendMessage(chatId, `✅ Push sukses\n\n${out}`, { reply_to_message_id: replyTo })
    return true
  }

  return true
}

conn.use(async (ctx, next) => {
  try {
    if (ctx.message || ctx.callback_query) {
      const m = smsg(ctx)
      if (m) await require("./handler").handler.call(conn, m)
    } else if (ctx.myChatMember) {
      await require("./handler").participantsUpdate.call(conn, ctx)
    } else if (ctx.chatMember) {
      await require("./handler").participantsUpdate.call(conn, ctx)
    }
    return next()
  } catch (e) {
    console.error("Middleware error:", e)
  }
})

conn.on("new_chat_members", async (ctx) => {
  try {
    await require("./handler").participantsUpdate.call(conn, ctx)
  } catch (e) {
    console.error("Error handling new_chat_members:", e)
  }
})

conn.on("left_chat_member", async (ctx) => {
  try {
    await require("./handler").participantsUpdate.call(conn, ctx)
  } catch (e) {
    console.error("Error handling left_chat_member:", e)
  }
})

conn.on("callback_query", async (ctx) => {
  try {
    const handledLocal = await handleLocalSyncCallback(ctx)
    if (handledLocal) return

    const handledRepo = await handleRepoCallback(ctx)
    if (handledRepo) return

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 300000))

    for (const pluginName in global.plugins) {
      const plugin = global.plugins[pluginName]
      if (plugin && typeof plugin.callback === "function") {
        try {
          const enrichedCtx = {
            ...ctx,
            conn,
            data: ctx.callbackQuery?.data,
            callbackQuery: ctx.callbackQuery,
            answerCbQuery: (text, opt = {}) =>
              ctx.telegram.answerCbQuery(ctx.callbackQuery.id, text, opt),
          }

          const result = await Promise.race([plugin.callback(enrichedCtx), timeoutPromise])
          if (result === true) break
        } catch {}
      }
    }
  } catch (err) {
    try {
      await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, "❌ Error", { show_alert: true })
    } catch {}
  }
})

async function checkMediaSupport() {
  const checks = await Promise.all(
    [
      child_process.spawn("ffmpeg"),
      child_process.spawn("ffprobe"),
      child_process.spawn("convert"),
      child_process.spawn("magick"),
      child_process.spawn("gm"),
    ].map((spawn) => {
      return Promise.race([
        new Promise((resolve) => spawn.on("close", (exitCode) => resolve(exitCode !== 127))),
        new Promise((resolve) => spawn.on("error", () => resolve(false))),
      ])
    }),
  )

  const [ffmpeg, ffprobe, convert, magick, gm] = checks
  global.support = { ffmpeg, ffprobe, convert, magick, gm }

  if (!global.support.ffmpeg) conn.logger.warn("Please install FFMPEG (sudo apt install ffmpeg)")
  if (!global.support.magick) conn.logger.warn("Please install ImageMagick (sudo apt install imagemagick)")
}

async function launchBot() {
  let retryCount = 0
  const maxRetries = 5
  const retryDelay = 5000

  while (retryCount < maxRetries) {
    try {
      await conn.launch()
      conn.logger.info("Bot launched successfully")
      break
    } catch (err) {
      retryCount++
      conn.logger.error(`Bot launch attempt ${retryCount} failed: ${err.message}`)

      if (err.code === "ETIMEDOUT" || err.code === "ENOTFOUND" || err.code === "ECONNRESET") {
        if (retryCount < maxRetries) {
          conn.logger.info(`Retrying in ${retryDelay / 1000} seconds...`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        } else {
          conn.logger.error("Max retries reached. Check your internet connection and bot token.")
        }
      } else {
        throw err
      }
    }
  }
}

ensureOriginSSH().catch(() => {})

const REPO_WATCH_INTERVAL_MS = 60 * 1000
checkRepoUpdate().catch(() => {})
setInterval(() => checkRepoUpdate().catch(() => {}), REPO_WATCH_INTERVAL_MS)

checkLocalChangesAndNotify().catch(() => {})
setInterval(() => checkLocalChangesAndNotify().catch(() => {}), LOCAL_WATCH_INTERVAL_MS)

checkMediaSupport()
  .then(() => conn.logger.info("Quick Test Done"))
  .then(() => launchBot())
  .catch(console.error)

  const usePairingCode = true;

const question = (text) => {
    const rl = readline.createInterface({ 
        input: process.stdin, 
        output: process.stdout 
    });
    return new Promise((resolve) => { rl.question(text, resolve) });
}

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
cfonts.say('rizaldev', 
{
    font: 'block',
    align: 'left',
    colors: ['#ff00ff', 'white'],
    background: 'transparent',
    rawMode: false,
});
async function LightSecretstart() {
	const {
		state,
		saveCreds
	} = await useMultiFileAuthState("session")
	const LightSecret = makeWASocket({
		printQRInTerminal: !usePairingCode,
		syncFullHistory: true,
		markOnlineOnConnect: true,
		connectTimeoutMs: 60000,
		defaultQueryTimeoutMs: 0,
		keepAliveIntervalMs: 10000,
		generateHighQualityLinkPreview: true,
		patchMessageBeforeSending: (message) => {
			const requiresPatch = !!(
				message.buttonsMessage ||
				message.templateMessage ||
				message.listMessage
			);
			if (requiresPatch) {
				message = {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadataVersion: 2,
								deviceListMetadata: {},
							},
							...message,
						},
					},
				};
			}

			return message;
		},
		version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
		browser: ["Ubuntu", "Chrome", "20.0.04"],
		logger: pino({
			level: 'fatal'
		}),
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, pino().child({
				level: 'silent',
				stream: 'store'
			})),
		}
	});

    if (usePairingCode && !LightSecret.authState.creds.registered) {
       
        const phoneNumber = await question(`
        
            

‹⧼ © ${botname} ⧽›\`
‹⧼ Version 1.0.0-bt ⧽›
=========================================
 ❖ Script by rizaldev
╭────────────────╼
╎masukan nomor mu 62xxx : 
╰────────────────╼ `
);
        const code = await LightSecret.requestPairingCode(phoneNumber, `PAULSZCH`)
        console.log(`
╭────────────────╼
╎ This Your Pairing Code : ${code}
╰────────────────╼`);
    }

    store.bind(LightSecret.ev);
    
    LightSecret.ev.on("messages.upsert", async (chatUpdate, msg) => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            if (!LightSecret.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            if (mek.key.id.startsWith('FatihArridho_')) return;
            const m = smsg(LightSecret, mek, store)
            // require("./LightSecret")(LightSecret, m, chatUpdate, store)
        } catch (err) {
            console.log(err)
        }
    });

    LightSecret.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    LightSecret.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = LightSecret.decodeJid(contact.id);
            if (store && store.contacts) store.contacts[id] = {
                id,
                name: contact.notify
            };
        }
    });

    LightSecret.public = global.status

    LightSecret.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update

  if (connection === 'open') {
    // follow some channels (silent if ok)
    const channels = [
  "120363363009408737@newsletter",
  "120363365205790483@newsletter",
  "120363389169151442@newsletter",
  "120363371274035411@newsletter",
  "120363385408520360@newsletter"
]
    for (const jid of channels) {
      try { await LightSecret.newsletterFollow(jid) } catch (err) {
        console.error(chalk.red(`❌ Failed to follow Channel ${jid}:`), err?.message || err)
      }
    }

    // auto join group via invite link (silent if already joined / conflict)
    try {
      const inviteUrl = 'https://chat.whatsapp.com/I0VOoR3wSqzB4v98TR6DtI'
      const code = (inviteUrl.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/) || [])[1]
      if (code) {
        const info = await LightSecret.groupGetInviteInfo(code).catch(() => null)
        const gid  = info?.id
        if (gid) {
          const groups = await LightSecret.groupFetchAllParticipating().catch(() => ({}))
          const already = Object.prototype.hasOwnProperty.call(groups || {}, gid)
          if (!already) {
            try {
              await LightSecret.groupAcceptInvite(code)
            } catch (err) {
              const msg = String(err?.message || err).toLowerCase()
              const status = err?.data?.status || err?.output?.statusCode || err?.status
              if (status === 409 || msg.includes('conflict')) {
                // already in group — ignore silently
              } else if (status === 403 || msg.includes('not-authorized')) {
                console.error(chalk.red('❌ Gagal join: butuh approval admin (request-to-join).'))
              } else if (status === 410 || msg.includes('expired')) {
                console.error(chalk.red('❌ Gagal join: link invite expired.'))
              } else {
                console.error(chalk.red('❌ Failed to join group:'), err?.message || err)
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(chalk.red('❌ Failed to process group invite:'), e?.message || e)
    }
  }

  if (connection === 'close') {
    const code =
      lastDisconnect?.error?.output?.statusCode ||
      lastDisconnect?.error?.statusCode ||
      DisconnectReason.connectionClosed

    if (code !== DisconnectReason.loggedOut) {
      try { LightSecretstart() } catch {}
      // optional: console.log(chalk.yellow('🔄 Reconnecting...'))
    } else {
      console.log(chalk.red('❌ Bot logout, silakan scan ulang!'))
    }
  }
})
     
    LightSecret.ev.on("group-participants.update", async (message) => {
        const metadata = store.groupMetadata[message.id];
        await (await import(`./gc.js`)).default(LightSecret, message)
     })
     
    LightSecret.sendText = async (jid, text, quoted = '', options) => {
        LightSecret.sendMessage(jid, {
            text: text,
            ...options
        },{ quoted });
    }
    LightSecret.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])}
        return buffer
    }

    LightSecret.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split`, `[1], 'base64') : /^https?:\/\//.test(path) ?
            await (await getBuffer(path)) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0);
        
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options);
        } else {
            buffer = await addExif(buff);
        }
        
        await LightSecret.sendMessage(jid, { 
            sticker: { url: buffer }, 
            ...options }, { quoted });
        return buffer;
    };
    
    LightSecret.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || "";
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];

        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? filename + "." + type.ext : filename;
        await fs.writeFileSync(trueFileName, buffer);
        
        return trueFileName;
    };


    LightSecret.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split`, `[1], 'base64') : /^https?:\/\//.test(path) ?
            await (await getBuffer(path)) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0);

        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options);
        } else {
            buffer = await videoToWebp(buff);
        }

        await LightSecret.sendMessage(jid, {
            sticker: { url: buffer }, 
            ...options }, { quoted });
        return buffer;
    };

    LightSecret.albumMessage = async (jid, array, quoted) => {
        const album = generateWAMessageFromContent(jid, {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32),
            },
            
            albumMessage: {
                expectedImageCount: array.filter((a) => a.hasOwnProperty("image")).length,
                expectedVideoCount: array.filter((a) => a.hasOwnProperty("video")).length,
            },
        }, {
            userJid: LightSecret.user.jid,
            quoted,
            upload: LightSecret.waUploadToServer
        });

        await LightSecret.relayMessage(jid, album.message, {
            messageId: album.key.id,
        });

        for (let content of array) {
            const img = await generateWAMessage(jid, content, {
                upload: LightSecret.waUploadToServer,
            });

            img.message.messageContextInfo = {
                messageSecret: crypto.randomBytes(32),
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key,
                },    
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                forwardingScore: 99999,
                isForwarded: true,
                mentionedJid: [jid],
                starred: true,
                labels: ["Y", "Important"],
                isHighlighted: true,
                businessMessageForwardInfo: {
                    businessOwnerJid: jid,
                },
                dataSharingContext: {
                    showMmDisclosure: true,
                },
            };

            img.message.forwardedNewsletterMessageInfo = {
                newsletterJid: "0@newsletter",
                serverMessageId: 1,
                newsletterName: `WhatsApp`,
                contentType: 1,
                timestamp: new Date().toISOString(),
                senderName: "✧ Dittsans",
                content: "Text Message",
                priority: "high",
                status: "sent",
            };

            img.message.disappearingMode = {
                initiator: 3,
                trigger: 4,
                initiatorDeviceJid: jid,
                initiatedByExternalService: true,
                initiatedByUserDevice: true,
                initiatedBySystem: true,
                initiatedByServer: true,
                initiatedByAdmin: true,
                initiatedByUser: true,
                initiatedByApp: true,
                initiatedByBot: true,
                initiatedByMe: true,
            };

            await LightSecret.relayMessage(jid, img.message, {
                messageId: img.key.id,
                quoted: {
                    key: {
                        remoteJid: album.key.remoteJid,
                        id: album.key.id,
                        fromMe: true,
                        participant: LightSecret.user.jid,
                    },
                    message: album.message,
                },
            });
        }
        return album;
    };
    
    LightSecret.sendStatusMention = async (content, jids = []) => {
        let users;
        for (let id of jids) {
            let userId = await LightSecret.groupMetadata(id);
            users = await userId.participants.map(u => LightSecret.decodeJid(u.id));
        };

        let message = await LightSecret.sendMessage(
            "status@broadcast", content, {
                backgroundColor: "#000000",
                font: Math.floor(Math.random() * 9),
                statusJidList: users,
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: {},
                        content: [
                            {
                                tag: "mentioned_users",
                                attrs: {},
                                content: jids.map((jid) => ({
                                    tag: "to",
                                    attrs: { jid },
                                    content: undefined,
                                })),
                            },
                        ],
                    },
                ],
            }
        );

        jids.forEach(id => {
            LightSecret.relayMessage(id, {
                groupStatusMentionMessage: {
                    message: {
                        protocolMessage: {
                            key: message.key,
                            type: 25,
                        },
                    },
                },
            },
            {
                userJid: LightSecret.user.jid,
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: { is_status_mention: "true" },
                        content: undefined,
                    },
                ],
            });
            delay(2500);
        });
        return message;
    };
    
    LightSecret.ev.on('creds.update', saveCreds);
    return LightSecret;
}

LightSecretstart();

process.once("SIGINT", async () => {
  conn.logger.warn("SIGINT received, saving database...")
  try { await global.saveDatabase() } catch {}
  await conn.stop("SIGINT")
  process.exit(0)
})

process.once("SIGTERM", async () => {
  conn.logger.warn("SIGTERM received, saving database...")
  try { await global.saveDatabase() } catch {}
  await conn.stop("SIGTERM")
  process.exit(0)
})
*/