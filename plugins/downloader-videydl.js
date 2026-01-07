const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ------ Helpers yang bikin aman lintas platform (Telegraf/WA) ------
function getMessageId(msg) {
  return msg?.message_id
      ?? msg?.id
      ?? msg?.key?.id
      ?? msg?.message?.message_id
      ?? msg?.message?.id
      ?? msg?.message?.key?.id
      ?? null;
}

function getChatId(obj) {
  return obj?.chat?.id ?? obj?.chat ?? obj?.message?.chat?.id ?? null;
}

async function safeDelete(conn, chat, msgOrId) {
  const chatId = getChatId({ chat });
  const id = typeof msgOrId === 'string' || typeof msgOrId === 'number' ? msgOrId : getMessageId(msgOrId);
  if (!chatId || !id) return false;
  try {
    await conn.deleteMessage(chatId, id);
    return true;
  } catch (e) {
    return false;
  }
}

async function safeEditOrReply(conn, m, loadingMsg, text) {
  try {
    const chatId = getChatId(m);
    const msgId = getMessageId(loadingMsg);
    if (chatId && msgId && conn.editMessage) {
      await conn.editMessage(chatId, { message_id: msgId }, { text });
      return;
    }
  } catch {}
  try { await m.reply(text); } catch {}
}

// ----------------- Session store per chat -----------------
let videySessions = {};

// ----------------- Utils download & media -----------------
async function downloadVidey(id) {
  const ext = id.length === 9 && id[8] === '2' ? '.mov' : '.mp4';
  const videoUrl = `https://cdn.videy.co/${id}${ext}`;
  const filename = `${id}${ext}`;
  const filepath = path.join(__dirname, '../tmp', filename);

  try {
    const res = await axios.get(videoUrl, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return { filepath, filename, ext };
  } catch (err) {
    throw new Error('Failed to download video: ' + err.message);
  }
}

async function getVideoDuration(inputPath) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim());
  } catch {
    return null;
  }
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
}

async function createPreview(inputPath, outputPath) {
  try {
    const command = `ffmpeg -i "${inputPath}" -t 5 -c:v libx264 -c:a aac -preset fast "${outputPath}" -y`;
    await execAsync(command);
    return true;
  } catch {
    return false;
  }
}

// ----------------- Handler utama -----------------
let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0] || !args[0].includes('id=')) {
    return m.reply(`Usage: ${usedPrefix + command} https://videy.co/v/?id=VIDEO_ID`);
  }

  const idMatch = args[0].match(/id=([a-zA-Z0-9]+)/);
  if (!idMatch) return m.reply('❌ Invalid video ID');

  const id = idMatch[1];
  const loadingMsg = await m.reply(`📥 Downloading video...\nID: ${id}`);

  try {
    const { filepath, filename, ext } = await downloadVidey(id);
    const duration = await getVideoDuration(filepath);
    const durationFormatted = formatDuration(duration);

    const previewPath = path.join(__dirname, '../tmp', `preview_${filename}`);
    const previewCreated = await createPreview(filepath, previewPath);

    const originalMessageId = getMessageId(m);

    const buttons = [[
      { text: '📹 Download Full', callback_data: `videydl_full_${id}` },
      { text: 'ℹ️ Info', callback_data: `videydl_info_${id}` }
    ]];

    const caption = `🎬 *Video Preview*\n📱 ID: ${id}\n⏰ Duration: ${durationFormatted}`;

    const quotedParam = originalMessageId ? { message_id: originalMessageId } : {};

    const mediaParam = previewCreated && fs.existsSync(previewPath)
      ? { video: { source: fs.createReadStream(previewPath) }, supports_streaming: true }
      : { video: { source: fs.createReadStream(filepath) } };

    const sentMessage = await conn.sendButt(
      getChatId(m),
      caption,
      buttons,
      quotedParam,
      mediaParam
    );

    videySessions[id] = {
      filepath,
      filename,
      ext,
      duration: durationFormatted,
      originalMessageId,
      currentMessageId: getMessageId(sentMessage)
    };

    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);

    await safeDelete(conn, m.chat, loadingMsg);

  } catch (err) {
    console.error('[VIDEYDL ERROR]:', err);
    await safeEditOrReply(conn, m, loadingMsg, `❌ Error: ${err.message}`);
  }
};

// ----------------- Callback Handler -----------------
handler.callback = async (ctx) => {
  // PERBAIKAN: Ambil data dengan aman sesuai struktur main.js
  const data = ctx?.callbackQuery?.data || ctx?.data;
  const conn = ctx.conn;
  
  console.log('[VIDEYDL CALLBACK] Received:', data);
  
  // Filter hanya callback untuk videydl_
  if (!data || !data.startsWith('videydl_')) {
    console.log('[VIDEYDL CALLBACK] Not for this plugin, skipping');
    return false; // Bukan untuk plugin ini
  }

  const parts = data.split('_');
  if (parts.length < 3) return false;
  
  const action = parts[1];
  const id = parts[2];
  const session = videySessions[id];
  
  if (!session) {
    console.log('[VIDEYDL] Session not found for:', id);
    // PERBAIKAN: Gunakan answerCbQuery yang aman
    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery('❌ Session expired', { show_alert: true });
    } else if (ctx.callbackQuery && conn.telegram) {
      await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Session expired', { show_alert: true });
    }
    return true;
  }

  try {
    // Answer callback untuk hilangkan loading
    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery(action === 'info' ? 'ℹ️ Getting info...' : '📤 Sending video...');
    } else if (ctx.callbackQuery && conn.telegram) {
      await conn.telegram.answerCbQuery(ctx.callbackQuery.id, action === 'info' ? 'ℹ️ Getting info...' : '📤 Sending video...');
    }

    const fileSizeMB = (() => {
      try { return fs.statSync(session.filepath).size / (1024 * 1024); }
      catch { return 0; }
    })();

    const quotedParam = session.originalMessageId ? { message_id: session.originalMessageId } : {};
    const chatId = ctx?.callbackQuery?.message?.chat?.id || ctx?.message?.chat?.id;

    if (action === 'full') {
      await conn.sendButt(
        chatId,
        `🎬 *Full Video*\n📱 ID: ${id}\n⏰ ${session.duration}\n📦 ${fileSizeMB.toFixed(2)} MB`,
        [],
        quotedParam,
        {
          video: { source: fs.createReadStream(session.filepath) },
          supports_streaming: true
        }
      );

      // cleanup file + session setelah kirim
      setTimeout(() => {
        try {
          if (fs.existsSync(session.filepath)) fs.unlinkSync(session.filepath);
        } catch (e) {
          console.error('Cleanup file error:', e);
        } finally {
          delete videySessions[id];
        }
      }, 30_000);

    } else if (action === 'info') {
      const buttons = [[{ text: '📹 Download Full', callback_data: `videydl_full_${id}` }]];
      await conn.sendButt(
        chatId,
        `📋 *Video Info*\n\n🆔 ID: ${id}\n📁 Format: ${session.ext.slice(1).toUpperCase()}\n⏰ Duration: ${session.duration}\n📦 Size: ${fileSizeMB.toFixed(2)} MB\n🔗 URL: https://cdn.videy.co/${id}${session.ext}`,
        buttons,
        quotedParam
      );
    }
    
    console.log('[VIDEYDL] Process completed successfully!');
    return true; // Berhasil handle
    
  } catch (err) {
    console.error('[VIDEYDL ERROR]:', err);
    try {
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery('❌ Operation failed', { show_alert: true });
      } else if (ctx.callbackQuery && conn.telegram) {
        await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Operation failed', { show_alert: true });
      }
    } catch {}
    return true; // Tetap return true karena ini untuk plugin ini
  }
};

handler.help = ['videydl <url>'];
handler.tags = ['downloader'];
handler.command = /^videydl$/i;

module.exports = handler;