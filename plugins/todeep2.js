const { deepNude } = require('../lib/deepnude.js');
const uploadImage = require('../lib/uploadImage.js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

let deepTemp = {};

const MAX_CONCURRENT = 2;
let activeJobs = 0;
const jobQueue = [];
const JOB_TIMEOUT_MS = 10 * 60 * 1000;

function enqueueJob(job) {
  jobQueue.push(job);
  runQueue();
}

function runQueue() {
  if (activeJobs >= MAX_CONCURRENT || jobQueue.length === 0) return;
  const job = jobQueue.shift();
  activeJobs++;
  processJob(job).finally(() => {
    activeJobs--;
    runQueue();
  });
}

async function processJob(job) {
  const { action, ownerKey, buffer, tmpPath, chatId, quoted, conn, ctx } = job;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try { conn.sendMessage(chatId, { text: '⚠️ Proses melebihi waktu (timeout). Coba lagi nanti.' }, { quoted }); } catch (e) {}
  }, JOB_TIMEOUT_MS);

  try {
    if (timedOut) return;
    let resultBuffer = null;
    let processInfo = '';

    if (action === 'nude') {
      const deep = await deepNude.create(tmpPath);
      if (!deep.success) throw new Error('DeepNude gagal');
      const deepImg = await axios.get(deep.result, { responseType: 'arraybuffer' });
      resultBuffer = Buffer.from(deepImg.data);
      processInfo = 'DeepNude';
    } else if (action === 'fake') {
      const form = new FormData();
      form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
      form.append('fn_name', 'cloth-change');
      form.append('request_from', '4');
      form.append('origin_from', '7cc7af6c758b6e74');

      const { data: uploadRes } = await axios.post('https://api.deepfakemaker.io/aitools/upload-img', form, { headers: { ...form.getHeaders(), origin: 'https://deepfakemaker.io', referer: 'https://deepfakemaker.io/' } });
      const imagePath = uploadRes.data.path;

      const createReq = { fn_name: 'cloth-change', call_type: 3, input: { source_image: imagePath, prompt: 'best quality, nude', cloth_type: 'full_outfits', request_from: 4, type: 1 }, request_from: 4, origin_from: '7cc7af6c758b6e74' };
      const { data: createRes } = await axios.post('https://api.deepfakemaker.io/aitools/of/create', createReq, { headers: { 'content-type': 'application/json', origin: 'https://deepfakemaker.io' } });
      const taskId = createRes.data.task_id;
      if (!taskId) throw new Error('Task ID tidak ditemukan');

      let resultUrl = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await axios.post('https://api.deepfakemaker.io/aitools/of/check-status', { task_id: taskId, fn_name: 'cloth-change', call_type: 3, request_from: 4, origin_from: '7cc7af6c758b6e74' });
        if (poll.data?.data?.status === 2 && poll.data?.data?.result_image) { resultUrl = 'https://res.deepfakemaker.io/' + poll.data.data.result_image; break; }
      }
      if (!resultUrl) throw new Error('DeepFake timeout');
      const deepImg = await axios.get(resultUrl, { responseType: 'arraybuffer' });
      resultBuffer = Buffer.from(deepImg.data);
      processInfo = 'DeepFake';
    }

    // Enhancement
    let enhanceSuccess = false;
    let enhanceMethod = 'none';
    let enhancedBuffer = resultBuffer;
    let enhancedUrl = null;

    try {
      const enhancedRes = await enhanceFromFile(resultBuffer);
      if (enhancedRes && enhancedRes.success) {
        enhancedBuffer = enhancedRes.buffer;
        enhancedUrl = enhancedRes.url;
        enhanceSuccess = true;
        enhanceMethod = 'supawork';
        processInfo += ' + Enhanced (Supawork)';
      }
    } catch (e) {}

    if (!enhanceSuccess) {
      try { const waifu2xResult = await waifu2xEnhance(resultBuffer); if (waifu2xResult) { enhancedBuffer = waifu2xResult; enhanceSuccess = true; enhanceMethod = 'waifu2x'; processInfo += ' + Enhanced (Waifu2x)'; } } catch (e) {}
    }

    if (!enhanceSuccess) {
      try {
        const tempPath = path.join(process.cwd(), 'temp_enh_' + Date.now() + '.jpg');
        await fs.promises.writeFile(tempPath, resultBuffer);
        const photoEnhancerResult = await enhanceFromFileAlternative(tempPath);
        if (photoEnhancerResult && photoEnhancerResult.success) {
          const enhancedResponse = await axios.get(photoEnhancerResult.url, { responseType: 'arraybuffer', timeout: 30000 });
          enhancedBuffer = Buffer.from(enhancedResponse.data);
          enhancedUrl = photoEnhancerResult.url;
          enhanceSuccess = true;
          enhanceMethod = 'photoenhancer';
          processInfo += ' + Enhanced (PhotoEnhancer)';
        }
        try { await fs.promises.unlink(tempPath); } catch (e) {}
      } catch (e) {}
    }

    let finalBuffer = enhanceSuccess ? enhancedBuffer : resultBuffer;
    let finalUrl = null;
    try { if (enhanceSuccess && enhancedUrl) finalUrl = enhancedUrl; else finalUrl = await uploadImage(finalBuffer); } catch (e) { finalUrl = null; }

    if (!timedOut) {
      if (finalUrl) await conn.sendMessage(chatId, { image: { url: finalUrl }, caption: `✅ *Selesai!*\n📊 Proses: ${processInfo}\n✨ Enhance: ${enhanceMethod}` }, { quoted });
      else await conn.sendMessage(chatId, { image: finalBuffer, caption: `✅ *Selesai!*\n📊 Proses: ${processInfo}\n✨ Enhance: ${enhanceMethod}` }, { quoted });
    }

  } catch (err) {
    try { await conn.sendMessage(chatId, { text: `❌ Gagal: ${err.message}` }, { quoted }); } catch (e) {}
  } finally {
    clearTimeout(timer);
    try { if (tmpPath) await fs.promises.unlink(tmpPath); } catch (e) {}
    delete deepTemp[ownerKey];
  }
}

async function handler(m, { conn, usedPrefix, command }) {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';
  if (!/^image/.test(mime) || /webp/.test(mime)) {
    return m.reply(`Reply gambar dengan *${usedPrefix + command}*`);
  }

  const chatId = m.chat;
  const senderId = m.sender;
  const ownerKey = senderId;

  if (deepTemp[ownerKey]) {
    await conn.sendMessage(chatId, { text: '⚠️ Sesi sebelumnya ditutup karena membuat sesi baru.' });
    delete deepTemp[ownerKey];
  }

  const loading = await conn.sendMessage(chatId, { text: '⏳ Sedang memproses gambar...' });
  let tmpPath;

  try {
    const img = await q.download();
    tmpPath = `./tmp_${Date.now()}.jpg`;
    await fs.promises.writeFile(tmpPath, img);

    deepTemp[ownerKey] = {
      buffer: img,
      tmpPath,
      chatId,
      quoted: m,
      loadingId: loading.message_id
    };

    console.log('[DEEP] Session created for:', ownerKey);

    await conn.sendButt(chatId, '🎭 Pilih metode pemrosesan:', [
      [
        { text: '🔞 DeepNude', callback_data: `deep_nude_${ownerKey}` },
        { text: '🎭 DeepFake', callback_data: `deep_fake_${ownerKey}` }
      ]
    ], m);

    if (loading.message_id) {
      await conn.telegram.deleteMessage(chatId, loading.message_id).catch(() => {});
    }

  } catch (e) {
    console.error('[DEEP ERROR]:', e);
    await conn.sendMessage(chatId, { text: `❌ Gagal: ${e.message}` });
    try { if (tmpPath) await fs.promises.unlink(tmpPath); } catch (e) {}
  }
}

handler.callback = async (ctx) => {
  const data = ctx?.callbackQuery?.data || ctx?.data;
  const conn = ctx.conn;
  
  console.log('[DEEP CALLBACK] Received:', data);
  
  if (!data || !data.startsWith('deep_')) {
    console.log('[DEEP CALLBACK] Not for this plugin, skipping');
    return false;
  }

  const parts = data.split('_');
  if (parts.length < 3) return false;
  
  const action = parts[1];
  const ownerKey = parts[2];
  
  console.log('[DEEP] Processing:', { action, ownerKey });

  const s = deepTemp[ownerKey];
  if (!s) {
    console.log('[DEEP] Session not found for:', ownerKey);
    console.log('[DEEP] Available sessions:', Object.keys(deepTemp));
    
    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery('⚠️ Sesi tidak ditemukan atau sudah berakhir.', { show_alert: true });
    } else if (ctx.callbackQuery && conn.telegram) {
      await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '⚠️ Sesi tidak ditemukan atau sudah berakhir.', { show_alert: true });
    }
    return true;
  }

  const { buffer, tmpPath, chatId, quoted } = s;

  if (ctx.answerCbQuery) {
    await ctx.answerCbQuery('⏳ Memproses... Mohon tunggu.');
  } else if (ctx.callbackQuery && conn.telegram) {
    await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '⏳ Memproses... Mohon tunggu.');
  }

  try {
    await conn.sendMessage(chatId, { text: '⏳ Job diterima: memproses di background. Saya akan mengirim hasil setelah selesai.' }, { quoted });

    enqueueJob({ action, ownerKey, buffer, tmpPath, chatId, quoted, conn, ctx });
    return true;

  } catch (e) {
    console.error('[DEEP ERROR QUEUE]:', e);
    try { await conn.sendMessage(chatId, { text: `❌ Gagal memulai proses: ${e.message}` }, { quoted }); } catch (e) {}
    try { if (tmpPath) await fs.promises.unlink(tmpPath); } catch (e) {}
    delete deepTemp[ownerKey];
    return true;
  }
};

handler.help = ['todeep'];
handler.tags = ['tools'];
handler.command = ['todeep'];
handler.premium = true
handler.limit = true;

module.exports = handler;

async function enhanceFromFile(imageBuffer) {
  try {
    const { v4: uuidv4 } = require('uuid');
    
    const scale = 4;
    
    const scales = [1, 4, 8, 16];
    if (!scales.includes(scale) || isNaN(scale)) {
      throw new Error(`Available scale options: ${scales.join(', ')}.`);
    }
    
    const identity = uuidv4();
    const inst = axios.create({
      baseURL: 'https://supawork.ai/supawork/headshot/api',
      headers: {
        authorization: 'null',
        origin: 'https://supawork.ai/',
        referer: 'https://supawork.ai/ai-photo-enhancer',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
        'x-auth-challenge': '',
        'x-identity-id': identity
      }
    });
    
    const { data: up } = await inst.get('/sys/oss/token', {
      params: {
        f_suffix: 'jpg',
        get_num: 1,
        unsafe: 1
      }
    });
    
    const img = up?.data?.[0];
    if (!img) throw new Error('Upload url not found.');
    
    await axios.put(img.put, imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    const { data: cf } = await axios.post('https://api.nekolabs.web.id/tools/bypass/cf-turnstile', {
      url: 'https://supawork.ai/ai-photo-enhancer',
      siteKey: '0x4AAAAAACBjrLhJyEE6mq1c'
    });
    
    if (!cf?.result) throw new Error('Failed to get cf token.');
    
    const { data: t } = await inst.get('/sys/challenge/token', {
      headers: {
        'x-auth-challenge': cf.result
      }
    });
    
    if (!t?.data?.challenge_token) throw new Error('Failed to get token.');
    
    const { data: task } = await inst.post('/media/image/generator', {
      aigc_app_code: 'image_enhancer',
      model_code: 'supawork-ai',
      image_urls: [img.get],
      extra_params: {
        scale: parseInt(scale)
      },
      currency_type: 'silver',
      identity_id: identity
    }, {
      headers: {
        'x-auth-challenge': t.data.challenge_token
      }
    });
    
    if (!task?.data?.creation_id) throw new Error('Failed to create task.');
    
    const creationId = task.data.creation_id;
    
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      const { data } = await inst.get('/media/aigc/result/list/v1', {
        params: {
          page_no: 1,
          page_size: 10,
          identity_id: identity
        }
      });
      
      const list = data?.data?.list?.[0]?.list?.[0];
      
      if (list && list.status === 1 && list.url) {
        console.log('[ENHANCE] Image enhanced successfully:', list.url);
        
        const enhancedResponse = await axios.get(list.url, { 
          responseType: 'arraybuffer',
          timeout: 30000 
        });
        
        return {
          success: true,
          buffer: Buffer.from(enhancedResponse.data),
          url: list.url
        };
      }
      
      if (list && list.status === 2) {
        throw new Error('Enhancement failed');
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Enhancement timeout');
    
  } catch (error) {
    console.error('[ENHANCE ERROR]:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function waifu2xEnhance(imageBuffer, options = {}) {
  try {
    const { style = 'artwork', noice = 'medium', upscaling = '1.6x' } = options;
    
    const conf = {
      style: {
        artwork: 'art',
        scans: 'art_scan',
        photo: 'photo'
      },
      noice: {
        none: '-1',
        low: '0',
        medium: '1',
        high: '2',
        highest: '3'
      },
      upscaling: {
        none: '-1',
        '1.6x': '1',
        '2x': '2'
      }
    };
    
    if (!Buffer.isBuffer(imageBuffer)) throw new Error('Image must be a buffer.');
    if (!conf.style[style]) throw new Error(`Available styles: ${Object.keys(conf.style).join(', ')}.`);
    if (!conf.noice[noice]) throw new Error(`Available noices: ${Object.keys(conf.noice).join(', ')}.`);
    if (!conf.upscaling[upscaling]) throw new Error(`Available upscaling options: ${Object.keys(conf.upscaling).join(', ')}.`);
    
    const { data: cf } = await axios.post('https://api.nekolabs.web.id/tools/bypass/cf-turnstile', {
      url: 'https://www.waifu2x.net/',
      siteKey: '0x4AAAAAABqlY7DKXMzoS81U'
    }, {
      timeout: 30000
    });
    
    if (!cf?.result) throw new Error('Failed to get Cloudflare token');
    
    const form = new FormData();
    form.append('recap', '');
    form.append('turnstile', cf.result);
    form.append('url', '');
    form.append('file', imageBuffer, `${Date.now()}_enhanced.jpg`);
    form.append('style', conf.style[style]);
    form.append('noice', conf.noice[noice]);
    form.append('scale', conf.upscaling[upscaling]);
    form.append('format', '0');
    form.append('cf-turnstile-response', '');
    
    const { data } = await axios.post('https://www.waifu2x.net/api', form, {
      headers: {
        ...form.getHeaders(),
        origin: 'https://www.waifu2x.net',
        referer: 'https://www.waifu2x.net/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 60000
    });
    
    return Buffer.from(data);
    
  } catch (error) {
    console.error('[WAIFU2X ERROR]:', error.message);
    throw error;
  }
}

async function enhanceFromFileAlternative(imagePath) {
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('enable_quality_check', 'true');
    form.append('output_format', 'jpg');
    
    const res = await axios.post('https://photoenhancer.pro/api/fast-enhancer', form, {
      headers: {
        ...form.getHeaders(),
        'origin': 'https://photoenhancer.pro',
        'referer': 'https://photoenhancer.pro/upload?tool=enhance&mode=fast',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000
    });
    
    if (res.data?.success && res.data?.url) {
      return { 
        success: true, 
        url: `https://photoenhancer.pro${res.data.url}` 
      };
    }
    return { success: false, error: 'No URL returned' };
  } catch (e) {
    console.error('[ENHANCE ALT ERROR]:', e.message);
    return { success: false, error: e.message };
  }
}