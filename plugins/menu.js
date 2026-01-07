/*
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const SELF_FILE = path.basename(__filename);
const MENU_IMAGE = "https://lann.pw/get-upload?id=uploader-api-1:1752838394888.jpg";

const LABEL = {
  main: "MAIN",
  tools: "TOOLS",
  downloader: "DOWNLOAD",
  fun: "FUN",
  group: "GROUP",
  owner: "OWNER",
  admin: "ADMIN",
  premium: "PREMIUM",
  info: "INFO",
  advanced: "ADVANCED",
};

const TEMPLATE = {
  header: "— %category —",
  body: "• %cmd %islimit %ispremium",
  footer: "\n",
};

let MAP = {};
let TOTAL = 0;
const PAGE_SIZE = 24;

const clock = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const nowInfo = () => {
  const m = moment.tz("Asia/Jakarta").locale("id");
  const date = m.format("D MMMM YYYY");
  const time = m.format("HH.mm") + " WIB";
  const hour = m.hour();
  const greet = hour < 11 ? "Pagi" : hour < 15 ? "Siang" : hour < 19 ? "Sore" : "Malam";
  return { date, time, greet };
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const seed = (s) => {
  let n = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
  return () => (n = (1103515245 * n + 12345) >>> 0) / 0xffffffff;
};

const shuffleDet = (arr, s) => {
  const rnd = seed(s);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function loadPlugins() {
  const dir = __dirname;
  const mapSet = new Map();
  let total = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js") || file === SELF_FILE) continue;
    const abs = path.join(dir, file);
    try {
      delete require.cache[require.resolve(abs)];
      const mod = require(abs);
      if (!Array.isArray(mod?.help) || !Array.isArray(mod?.tags)) continue;
      for (const tag of mod.tags) {
        if (!mapSet.has(tag)) mapSet.set(tag, new Set());
        const set = mapSet.get(tag);
        for (const cmd of mod.help) {
          if (!set.has(cmd)) {
            set.add(cmd);
            total++;
          }
        }
      }
    } catch (e) {
      console.log("Load error:", file, "-", e.message);
    }
  }
  const out = {};
  for (const [tag, set] of mapSet.entries()) out[tag] = Array.from(set).sort();
  MAP = out;
  TOTAL = total;
}

function mainMenuText(m, up) {
  const { date, time, greet } = nowInfo();
  const bot = global.botname || "FilnBotz";
  const name = m.name || "teman";
  let t = `*${bot}*\n\n`;
  t += `Halo, ${name}. Selamat ${greet}! 👋\n`;
  t += `Uptime: ${up}\nTanggal: ${date}\nWaktu: ${time}\n\n`;
  t += `\nStatistik:\n`;
  t += `• Pengguna: ${Object.keys(global.db?.data?.users || {}).length}\n`;
  t += `• Perintah: ${TOTAL}\n`;
  t += `\nPilih kategori di tombol bawah.`;
  return t;
}

function catButtons(sessionId, mName) {
  const keys = shuffleDet(Object.keys(MAP), mName + sessionId);
  const rows = chunk(
    keys.map((k) => {
      const label = LABEL[k] || k.toUpperCase();
      return {
        text: label,
        callback_data: `menu_cat_${k}_${sessionId}`,
      };
    }),
    3
  );
  rows.push([
    { text: "Profil", callback_data: `menu_profile_${sessionId}` },
    { text: "Tentang Bot", callback_data: `menu_info_${sessionId}` },
  ]);
  return rows;
}

function buildCommandButtons(catKey, sessionId, page = 1) {
  const cmds = MAP[catKey] || [];
  const totalPages = Math.max(1, Math.ceil(cmds.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * PAGE_SIZE;
  const slice = cmds.slice(start, start + PAGE_SIZE);
  const rows = slice.map((cmd) => ([
    { text: cmd, callback_data: `menu_cmd_${catKey}::${cmd}::${p}_${sessionId}` }
  ]));
  const nav = [];
  if (p > 1) nav.push({ text: "⬅️", callback_data: `menu_cat_${catKey}_${p-1}_${sessionId}` });
  nav.push({ text: `Hal ${p}/${totalPages}`, callback_data: `menu_main_${sessionId}` });
  if (p < totalPages) nav.push({ text: "➡️", callback_data: `menu_cat_${catKey}_${p+1}_${sessionId}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sessionId}` }]);
  return rows;
}

async function sendMain(conn, chat, name, sid, quote) {
  const up = clock(process.uptime() * 1000);
  const text = mainMenuText({ name }, up);
  const buttons = catButtons(sid, name || "");
  const sent = await conn.sendButt(chat, { text, photo: MENU_IMAGE }, buttons, quote || null);
  const newId = sent?.message_id || sent?.message?.message_id || null;
  global.menuSessions[sid] = global.menuSessions[sid] || {};
  global.menuSessions[sid].lastBotMsgId = newId;
  return sent;
}

async function sendCat(conn, m, key, sessionId, page = 1) {
  const label = LABEL[key] || key.toUpperCase();
  const list = MAP[key] || [];
  let txt = TEMPLATE.header.replace("%category", label) + "\n";
  txt += `Total: ${list.length} cmd\nPilih salah satu di tombol.`;
  const quoted =
    global.menuSessions?.[sessionId]?.userMessageId
      ? { message_id: global.menuSessions[sessionId].userMessageId }
      : null;
  const buttons = buildCommandButtons(key, sessionId, page);
  const sent = await conn.sendButt(m.chat, { text: txt, photo: MENU_IMAGE }, buttons, quoted);
  const newId = sent?.message_id || sent?.message?.message_id || null;
  global.menuSessions[sessionId] = global.menuSessions[sessionId] || {};
  global.menuSessions[sessionId].lastBotMsgId = newId;
  return sent;
}

const handler = async (m, { conn, args }) => {
  const sid =
    typeof m.sender === "number"
      ? String(m.sender)
      : String(m.sender || "").replace("@s.whatsapp.net", "");
  global.menuSessions = global.menuSessions || {};
  global.menuSessions[sid] = { userMessageId: m.id, chatId: m.chat, lastBotMsgId: null };

  if (args && args[0]) {
    const input = String(args[0]).toLowerCase();
    const found = Object.keys(MAP).find((k) => k.toLowerCase() === input);
    if (found) return sendCat(conn, m, found, sid, 1);
    return conn.sendMessage(
      m.chat,
      { text: `Kategori "${args[0]}" nggak ketemu. Coba /menu ya.`, parse_mode: "Markdown" },
      { quoted: { message_id: m.id } }
    );
  }

  const sent = await conn.sendButt(
    m.chat,
    { text: mainMenuText(m, clock(process.uptime() * 1000)), photo: MENU_IMAGE },
    catButtons(sid, m.name || ""),
    { message_id: m.id }
  );
  const newId = sent?.message_id || sent?.message?.message_id || null;
  global.menuSessions[sid].lastBotMsgId = newId;
};

handler.callback = async (ctx) => {
  try {
    const data = ctx?.callbackQuery?.data || ctx?.data;
    if (!data || !data.startsWith("menu_")) return false;

    const chat = ctx.callbackQuery?.message?.chat?.id;
    const from = ctx.callbackQuery?.from?.id;
    const msgId = ctx.callbackQuery?.message?.message_id;

    const parts = data.split("_");
    const action = parts[1];
    const sid = parts[parts.length - 1];

    if (String(from) !== String(sid)) {
      await ctx.conn.telegram.answerCbQuery(ctx.callbackQuery.id, "Buat yang nanya aja ya.", { show_alert: true });
      return true;
    }

    const cqid = ctx.callbackQuery?.id || ctx.update?.callback_query?.id;
    if (cqid) {
      await ctx.conn.telegram.answerCbQuery(cqid, "Sebentar…");
    }
    if (msgId) await ctx.conn.telegram.deleteMessage(chat, msgId).catch(() => {});

    if (action === "main") {
      const sess = global.menuSessions?.[sid];
      const userMsgId = sess?.userMessageId ? { message_id: sess.userMessageId } : null;
      await sendMain(ctx.conn, chat, ctx.callbackQuery.from?.first_name || "User", sid, userMsgId);
      return true;
    }

    if (action === "cat") {
      const catKey = parts[2];
      let page = 1;
      if (parts.length === 5) page = parseInt(parts[3], 10) || 1;
      await sendCat(ctx.conn, { chat, sender: from, id: msgId }, catKey, sid, page);
      return true;
    }

    if (action === "cmd") {
      const payload = data.replace("menu_cmd_", "");
      const [catCmd] = payload.split(":::");
      const [catKey, cmd, pageStr] = catCmd.split("::");
      const [pageNum] = (pageStr || "1_").split("_");
      const page = parseInt(pageNum, 10) || 1;
      const txt = `Perintah dipilih: /${cmd}\n\nContoh pakai:\n/${cmd}`;
      const sent = await ctx.conn.sendButt(
        chat,
        { text: txt, photo: MENU_IMAGE },
        [
          [{ text: "⬅️ Kembali ke kategori", callback_data: `menu_cat_${catKey}_${page}_${sid}` }],
          [{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sid}` }],
        ],
        null
      );
      const newId = sent?.message_id || sent?.message?.message_id || null;
      global.menuSessions[sid] = global.menuSessions[sid] || {};
      global.menuSessions[sid].lastBotMsgId = newId;
      return true;
    }

    if (action === "profile") {
      const u = (global.db?.data?.users || {})[sid] || {};
      const txt = `Profil Kamu
• Nama: ${ctx.callbackQuery.from?.first_name || "User"}
• Nomor: ${sid}
• Premium: ${u.premium ? "Ya" : "Tidak"}
• Limit: ${u.limit || 0}
• Level: ${u.level || 0}
• XP: ${u.exp || 0}
• Terdaftar: ${u.registered ? "Ya" : "Tidak"}`;
      const sess = global.menuSessions?.[sid];
      const userMsgId = sess?.userMessageId ? { message_id: sess.userMessageId } : null;
      const sent = await ctx.conn.sendButt(
        chat,
        { text: txt, photo: MENU_IMAGE },
        [[{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sid}` }]],
        userMsgId
      );
      const newId = sent?.message_id || sent?.message?.message_id || null;
      global.menuSessions[sid] = global.menuSessions[sid] || {};
      global.menuSessions[sid].lastBotMsgId = newId;
      return true;
    }

    if (action === "info") {
      const txt = `Tentang Bot
• Nama: ${global.botname || "FilnBotz"}
• Owner: ${global.ownername || "Filn"}
• Versi: 3.0.0
• Runtime: ${clock(process.uptime() * 1000)}
• Platform: ${process.platform}
• Node: ${process.version}
• Memori: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Pengguna: ${Object.keys(global.db?.data?.users || {}).length}
• Total Perintah: ${TOTAL}`;
      const sess = global.menuSessions?.[sid];
      const userMsgId = sess?.userMessageId ? { message_id: sess.userMessageId } : null;
      const sent = await ctx.conn.sendButt(
        chat,
        { text: txt, photo: MENU_IMAGE },
        [[{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sid}` }]],
        userMsgId
      );
      const newId = sent?.message_id || sent?.message?.message_id || null;
      global.menuSessions[sid] = global.menuSessions[sid] || {};
      global.menuSessions[sid].lastBotMsgId = newId;
      return true;
    }

    return true;
  } catch (e) {
    console.log("Callback error:", e);
    try {
      await ctx.conn.telegram.answerCbQuery(ctx.callbackQuery.id, "Lagi error, coba lagi ya.", { show_alert: true });
    } catch {}
    return true;
  }
};

loadPlugins();

handler.help = handler.command = ["menu", "help", "start"];
handler.tags = ["main"];
module.exports = handler;
*/



const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const crypto = require("crypto");

const SELF_FILE = path.basename(__filename);
const MENU_IMAGE = "https://lann.pw/get-upload?id=uploader-api-1:1752838394888.jpg";

const LABEL = {
  main: "MAIN",
  tools: "TOOLS",
  downloader: "DOWNLOAD",
  fun: "FUN",
  group: "GROUP",
  owner: "OWNER",
  admin: "ADMIN",
  premium: "PREMIUM",
  info: "INFO",
  advanced: "ADVANCED",
};

const TEMPLATE = {
  header: "— %category —",
  body: "• %cmd %islimit %ispremium",
  footer: "\n",
};

let MAP = {};
let TOTAL = 0;
const PAGE_SIZE = 24;

const clock = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const nowInfo = () => {
  const m = moment.tz("Asia/Jakarta").locale("id");
  const date = m.format("D MMMM YYYY");
  const time = m.format("HH.mm") + " WIB";
  const hour = m.hour();
  const greet = hour < 11 ? "Pagi" : hour < 15 ? "Siang" : hour < 19 ? "Sore" : "Malam";
  return { date, time, greet };
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const seed = (s) => {
  let n = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
  return () => (n = (1103515245 * n + 12345) >>> 0) / 0xffffffff;
};

const shuffleDet = (arr, s) => {
  const rnd = seed(s);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function loadPlugins() {
  const dir = __dirname;
  const mapSet = new Map();
  let total = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js") || file === SELF_FILE) continue;
    const abs = path.join(dir, file);
    try {
      delete require.cache[require.resolve(abs)];
      const mod = require(abs);
      if (!Array.isArray(mod?.help) || !Array.isArray(mod?.tags)) continue;
      for (const tag of mod.tags) {
        if (!mapSet.has(tag)) mapSet.set(tag, new Set());
        const set = mapSet.get(tag);
        for (const cmd of mod.help) {
          if (!set.has(cmd)) {
            set.add(cmd);
            total++;
          }
        }
      }
    } catch (e) {
      console.log("Load error:", file, "-", e.message);
    }
  }
  const out = {};
  for (const [tag, set] of mapSet.entries()) out[tag] = Array.from(set).sort();
  MAP = out;
  TOTAL = total;
}

function mainMenuText(m, up) {
  const { date, time, greet } = nowInfo();
  const bot = global.botname || "FilnBotz";
  const name = m.name || "teman";
  let t = `*${bot}*\n\n`;
  t += `Halo, ${name}. Selamat ${greet}! 👋\n`;
  t += `Uptime: ${up}\nTanggal: ${date}\nWaktu: ${time}\n\n`;
  t += `\nStatistik:\n`;
  t += `• Pengguna: ${Object.keys(global.db?.data?.users || {}).length}\n`;
  t += `• Perintah: ${TOTAL}\n`;
  t += `\nPilih kategori di tombol bawah.`;
  return t;
}

function catButtons(sessionId, mName) {
  const keys = shuffleDet(Object.keys(MAP), mName + sessionId);
  const rows = chunk(
    keys.map((k) => ({
      text: LABEL[k] || k.toUpperCase(),
      callback_data: `menu_cat_${k}_${sessionId}`,
    })),
    3
  );
  rows.push([
    { text: "Profil", callback_data: `menu_profile_${sessionId}` },
    { text: "Tentang Bot", callback_data: `menu_info_${sessionId}` },
  ]);
  return rows;
}

function buildCommandButtons(catKey, sessionId, page = 1) {
  const cmds = MAP[catKey] || [];
  const totalPages = Math.max(1, Math.ceil(cmds.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * PAGE_SIZE;
  const slice = cmds.slice(start, start + PAGE_SIZE);

  let columnCount = 2;
  if (slice.length > 4 && slice.length <= 9) columnCount = 3;
  else if (slice.length > 9) columnCount = 4;

  const buttons = slice.map((cmd) => {
    const encoded = Buffer.from(cmd).toString("base64").slice(0, 32);
    const cb = `menu_cmd_${catKey}_${p}_${sessionId}_${encoded}`;
    return { text: cmd, callback_data: cb };
  });

  const rows = chunk(buttons, columnCount);

  const nav = [];
  if (p > 1) nav.push({ text: "⬅️", callback_data: `menu_cat_${catKey}_${p - 1}_${sessionId}` });
  nav.push({ text: `Hal ${p}/${totalPages}`, callback_data: `menu_main_${sessionId}` });
  if (p < totalPages) nav.push({ text: "➡️", callback_data: `menu_cat_${catKey}_${p + 1}_${sessionId}` });
  if (nav.length) rows.push(nav);

  rows.push([{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sessionId}` }]);
  return rows;
}

async function sendMain(conn, chat, name, sid, quote) {
  const up = clock(process.uptime() * 1000);
  const text = mainMenuText({ name }, up);
  const buttons = catButtons(sid, name || "");
  const sent = await conn.sendButt(chat, { text, photo: MENU_IMAGE }, buttons, quote || null);
  const newId = sent?.message_id || sent?.message?.message_id || null;
  global.menuSessions[sid] = global.menuSessions[sid] || {};
  global.menuSessions[sid].lastBotMsgId = newId;
  return sent;
}

async function sendCat(conn, m, key, sessionId, page = 1) {
  const label = LABEL[key] || key.toUpperCase();
  const list = MAP[key] || [];
  let txt = TEMPLATE.header.replace("%category", label) + "\n";
  txt += `Total: ${list.length} cmd\nPilih salah satu di tombol.`;
  const quoted =
    global.menuSessions?.[sessionId]?.userMessageId
      ? { message_id: global.menuSessions[sessionId].userMessageId }
      : null;
  const buttons = buildCommandButtons(key, sessionId, page);
  const sent = await conn.sendButt(m.chat, { text: txt, photo: MENU_IMAGE }, buttons, quoted);
  const newId = sent?.message_id || sent?.message?.message_id || null;
  global.menuSessions[sessionId] = global.menuSessions[sessionId] || {};
  global.menuSessions[sessionId].lastBotMsgId = newId;
  return sent;
}

const handler = async (m, { conn, args }) => {
  const sid =
    typeof m.sender === "number"
      ? String(m.sender)
      : String(m.sender || "").replace("@s.whatsapp.net", "");
  global.menuSessions = global.menuSessions || {};
  global.menuSessions[sid] = { userMessageId: m.id, chatId: m.chat, lastBotMsgId: null };

  if (Array.isArray(args) && args.length > 0 && args[0].trim() !== "") {
    const input = String(args[0]).toLowerCase();
    const found = Object.keys(MAP).find((k) => k.toLowerCase() === input);
    if (found) return sendCat(conn, m, found, sid, 1);
    await conn.sendMessage(
      m.chat,
      { text: `Kategori "${args[0]}" nggak ketemu. Coba /menu tanpa tambahan teks ya.`, parse_mode: "Markdown" },
      { quoted: { message_id: m.id } }
    );
    return;
  }

  const sent = await conn.sendButt(
    m.chat,
    { text: mainMenuText(m, clock(process.uptime() * 1000)), photo: MENU_IMAGE },
    catButtons(sid, m.name || ""),
    { message_id: m.id }
  );
  const newId = sent?.message_id || sent?.message?.message_id || null;
  global.menuSessions[sid].lastBotMsgId = newId;
};

handler.callback = async (ctx) => {
  try {
    const data = ctx?.callbackQuery?.data || ctx?.data;
    if (!data || !data.startsWith("menu_")) return false;

    const chat = ctx.callbackQuery?.message?.chat?.id;
    const from = ctx.callbackQuery?.from;
    const msgId = ctx.callbackQuery?.message?.message_id;

    const parts = data.split("_");
    const action = parts[1];
    const sid = parts[parts.length - 1];

    const cqid = ctx.callbackQuery?.id || ctx.update?.callback_query?.id;
    if (cqid) await ctx.conn.telegram.answerCbQuery(cqid, "Sebentar…");

    if (!data.includes("menu_cmd_")) {
      if (msgId) await ctx.conn.telegram.deleteMessage(chat, msgId).catch(() => {});
    }

    if (action === "main") {
      const sess = global.menuSessions?.[sid];
      const userMsgId = sess?.userMessageId ? { message_id: sess.userMessageId } : null;
      await sendMain(ctx.conn, chat, from?.first_name || "User", sid, userMsgId);
      return true;
    }

    if (action === "cat") {
      const catKey = parts[2];
      let page = 1;
      if (parts.length === 5) page = parseInt(parts[3], 10) || 1;
      await sendCat(ctx.conn, { chat, sender: from.id, id: msgId }, catKey, sid, page);
      return true;
    }

    if (action === "cmd") {
      const encoded = parts[parts.length - 1];
      const cmd = Buffer.from(encoded, "base64").toString();
      const fakeMessage = {
        chat: { id: chat },
        text: `/${cmd}`,
        from: ctx.callbackQuery.from,
        message_id: Date.now(),
      };
      if (typeof ctx.conn.handleUpdate === "function") {
        await ctx.conn.handleUpdate({ message: fakeMessage });
      } else {
        await ctx.conn.sendMessage(chat, { text: `/${cmd}`, parse_mode: "Markdown" });
      }
      return true;
    }

    if (action === "profile") {
      const u = (global.db?.data?.users || {})[sid] || {};
      const txt = `Profil Kamu
• Nama: ${from?.first_name || "User"}
• Nomor: ${from.id}
• Premium: ${u.premium ? "Ya" : "Tidak"}
• Limit: ${u.limit || 0}
• Level: ${u.level || 0}
• XP: ${u.exp || 0}
• Terdaftar: ${u.registered ? "Ya" : "Tidak"}`;
      await ctx.conn.sendButt(chat, { text: txt, photo: MENU_IMAGE }, [
        [{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sid}` }],
      ]);
      return true;
    }

    if (action === "info") {
      const txt = `Tentang Bot
• Nama: ${global.botname || "FilnBotz"}
• Owner: ${global.ownername || "Filn"}
• Versi: 3.0.0
• Runtime: ${clock(process.uptime() * 1000)}
• Platform: ${process.platform}
• Node: ${process.version}
• Memori: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Pengguna: ${Object.keys(global.db?.data?.users || {}).length}
• Total Perintah: ${TOTAL}`;
      await ctx.conn.sendButt(chat, { text: txt, photo: MENU_IMAGE }, [
        [{ text: "⬅️ Kembali ke Menu Utama", callback_data: `menu_main_${sid}` }],
      ]);
      return true;
    }

    return true;
  } catch (e) {
    console.error("[MENU CALLBACK ERROR]", e);
    try {
      await ctx.conn.telegram.answerCbQuery(ctx.callbackQuery.id, "Lagi error, coba lagi ya.", { show_alert: true });
    } catch {}
    return true;
  }
};

loadPlugins();
handler.help = handler.command = ["menu", "help", "start"];
handler.tags = ["main"];
module.exports = handler;