const fetch = require('node-fetch');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const uploadImage = require('../lib/uploadImage.js');

async function handler(m, { conn, usedPrefix, command }) {
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';
    
    if (!/^image/.test(mime) || /webp/.test(mime)) {
      return m.reply(`Kirim gambar dengan caption *${usedPrefix + command}* atau tag gambar yang sudah dikirim.`);
    }

    const loadingMsg = await m.reply('⏳ Sedang meningkatkan kualitas gambar...');
    
    try {
      const img = await q.download();
      
      const tmpPath = path.join(__dirname, `../tmp/enhance_${Date.now()}.jpg`);
      fs.writeFileSync(tmpPath, img);
      
      console.log('[REMINI] Starting enhancement process...');
      
      let result = null;
      let method = '';
      
      try {
        console.log('[REMINI] Trying PhotoEnhancer.pro...');
        result = await enhanceFromFile(tmpPath);
        if (result.success) {
          method = 'PhotoEnhancer.pro';
          console.log('[REMINI] PhotoEnhancer.pro success!');
        }
      } catch (e) {
        console.log('[REMINI] PhotoEnhancer.pro failed:', e.message);
      }
      
      if (!result || !result.success) {
        try {
          console.log('[REMINI] Trying BetaBotz API...');
          const uploadedUrl = await uploadImage(img);
          
          if (uploadedUrl && typeof uploadedUrl === 'string') {
            const apiKey = global.lann || 'free';
            const apiUrl = `https://api.betabotz.eu.org/api/tools/remini?url=${encodeURIComponent(uploadedUrl)}&apikey=${apiKey}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.status && data.url) {
              result = { success: true, url: data.url };
              method = 'BetaBotz API';
              console.log('[REMINI] BetaBotz API success!');
            }
          }
        } catch (e) {
          console.log('[REMINI] BetaBotz API failed:', e.message);
        }
      }
      
      if (!result || !result.success) {
        try {
          console.log('[REMINI] Trying Replicate AI...');
          result = await enhanceWithReplicate(tmpPath);
          if (result.success) {
            method = 'Replicate AI';
            console.log('[REMINI] Replicate AI success!');
          }
        } catch (e) {
          console.log('[REMINI] Replicate AI failed:', e.message);
        }
      }
      
      if (!result || !result.success) {
        try {
          console.log('[REMINI] Trying Cloudflare AI...');
          const uploadedUrl = await uploadImage(img);
          
          if (uploadedUrl && typeof uploadedUrl === 'string') {
            result = await enhanceWithCloudflare(uploadedUrl);
            if (result.success) {
              method = 'Cloudflare AI';
              console.log('[REMINI] Cloudflare AI success!');
            }
          }
        } catch (e) {
          console.log('[REMINI] Cloudflare AI failed:', e.message);
        }
      }
      
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
      
      if (!result || !result.success || !result.url) {
        throw new Error('Semua metode enhancement gagal. Silakan coba lagi nanti.');
      }
      
      let fileSize = 0;
      try {
        const urlTest = await axios.head(result.url, { timeout: 5000 });
        if (urlTest.status !== 200) {
          throw new Error('URL hasil tidak valid');
        }
        
        fileSize = parseInt(urlTest.headers['content-length'] || '0');
        console.log(`[REMINI] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      } catch (e) {
        console.log('[REMINI] Could not validate URL or get file size:', e.message);
      }
      
      const MAX_PHOTO_SIZE = 10485760;
      const caption = `✅ *Enhancement Complete!*\n\n🎨 Quality: Enhanced\n\n${global.wm || 'FilnBotz'}`;
      
      try {
        if (fileSize > 0 && fileSize > MAX_PHOTO_SIZE) {
          console.log('[REMINI] File > 10MB, sending as document...');
          await conn.sendMessage(m.chat, {
            document: { url: result.url },
            fileName: 'enhanced.jpg',
            mimetype: 'image/jpeg',
            caption: caption + '\n\n⚠️ _File dikirim sebagai dokumen karena ukuran > 10MB_'
          }, { quoted: m });
        } else {
          await conn.sendFile(
            m.chat, 
            result.url, 
            'enhanced.jpg', 
            caption, 
            m
          );
        }
      } catch (sendError) {
        console.log('[REMINI] Photo send failed, trying as document...');
        try {
          await conn.sendMessage(m.chat, {
            document: { url: result.url },
            fileName: 'enhanced.jpg',
            mimetype: 'image/jpeg',
            caption: caption + '\n\n⚠️ _File dikirim sebagai dokumen_'
          }, { quoted: m });
        } catch (docError) {
          await m.reply(`${caption}\n\n🔗 Download: ${result.url}`);
        }
      }
      
      try {
        const ownerIds = global.ownerid || ['5524457173'];
        
        const from = m.from || m.sender || {};
        const userId = from.id || m.chat?.id || 'Unknown';
        const firstName = from.first_name || from.firstName || '';
        const lastName = from.last_name || from.lastName || '';
        const username = from.username ? `@${from.username}` : 
                        (firstName + (lastName ? ' ' + lastName : '')) || 'Unknown User';
        
        // Cek apakah dari group atau private
        const isGroup = m.chat?.type === 'group' || m.chat?.type === 'supergroup';
        const chatType = isGroup ? 'Group' : 'Private';
        const chatTitle = m.chat?.title || (isGroup ? 'Unknown Group' : 'Private Chat');
        const chatId = m.chat?.id || 'Unknown';
        
        const ownerMessage = [
          '📊 *Remini Enhancement Report*',
          '',
          `👤 User: ${username}`,
          `🆔 User ID: \`${userId}\``,
          `💬 Chat Type: ${chatType}`,
          `📱 Chat: ${chatTitle}`,
          `🔖 Chat ID: \`${chatId}\``,
          `🔧 Method: ${method}`,
          `📏 File Size: ${fileSize > 0 ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`,
          `⏰ Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
          '',
          `🔗 *Enhanced URL:*`,
          result.url,
          '',
          `_Original image processed successfully_`
        ].join('\n');
        
        for (const ownerId of ownerIds) {
          try {
            await conn.reply(ownerId, ownerMessage, null);
            console.log(`[REMINI] URL sent to owner: ${ownerId}`);
          } catch (err1) {
            try {
              await conn.sendMessage(ownerId, { text: ownerMessage });
              console.log(`[REMINI] URL sent to owner (method 2): ${ownerId}`);
            } catch (err2) {
              try {
                const token = global.token;
                if (token) {
                  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
                  await axios.post(telegramUrl, {
                    chat_id: ownerId,
                    text: ownerMessage,
                    parse_mode: 'Markdown'
                  });
                  console.log(`[REMINI] URL sent to owner (method 3): ${ownerId}`);
                }
              } catch (err3) {
                console.error(`[REMINI] All methods failed for owner ${ownerId}:`, err3.message);
              }
            }
          }
        }
        
      } catch (ownerError) {
        console.error('[REMINI] Failed to send URL to owner:', ownerError.message);
      }
      
      // Delete loading message
      if (loadingMsg && loadingMsg.message_id) {
        await conn.deleteMessage(m.chat, loadingMsg.message_id).catch(() => {});
      }
      
      console.log('[REMINI] Process completed successfully with', method);
      
    } catch (processError) {
      console.error('[REMINI ERROR]:', processError);
      await m.reply(`❌ Gagal meningkatkan kualitas: ${processError.message}`);
    }
    
  } catch (e) {
    console.error('[REMINI MAIN ERROR]:', e);
    m.reply(`❌ Terjadi kesalahan: ${e.message}`);
  }
}

handler.help = ['remini', 'hd', 'enhance'];
handler.tags = ['tools'];
handler.command = /^(remini|hd|enhance)$/i;
handler.premium = false;
handler.limit = true;

module.exports = handler;

async function enhanceFromFile(input) {
  try {
    const { v4: uuidv4 } = require('uuid');
    const fs = require('fs');
    let imageBuffer = input;
    if (typeof input === 'string') imageBuffer = fs.readFileSync(input);
    if (!Buffer.isBuffer(imageBuffer)) throw new Error('Image must be a buffer or a file path.');

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

async function enhanceWithReplicate(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const enhancedBuffer = await waifu2xEnhance(imageBuffer).catch(err => { throw err; });

    if (!enhancedBuffer || !Buffer.isBuffer(enhancedBuffer)) {
      throw new Error('Enhancement failed or returned invalid buffer');
    }

    const uploadedUrl = await uploadImage(enhancedBuffer);
    if (!uploadedUrl) {
      throw new Error('Failed to upload enhanced image');
    }

    return { success: true, url: uploadedUrl };
  } catch (e) {
    console.error('[Replicate/WAIFU2X] Error:', e.message);
    return { success: false };
  }
}

async function enhanceWithCloudflare(imageUrl) {
  try {
    const response = await axios.post('https://ai.cloudflare.com/enhance', {
      image: imageUrl,
      model: 'restoreformer',
      scale: 2
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30000
    });
    
    if (response.data?.result?.image) {
      return { 
        success: true, 
        url: response.data.result.image 
      };
    }
    
    return { success: false };
  } catch (e) {
    console.error('[Cloudflare] Error:', e.message);
    return { success: false };
  }
}

async function enhanceWithFreeAPI(imageUrl) {
  try {
    const apis = [
      `https://api.imglarger.com/api/Enhance`,
      `https://enhance.my/api/v1/enhance`
    ];
    
    for (const apiUrl of apis) {
      try {
        const response = await axios.post(apiUrl, {
          image_url: imageUrl,
          enhancement_type: 'auto'
        }, {
          timeout: 15000
        });
        
        if (response.data?.enhanced_url) {
          return { 
            success: true, 
            url: response.data.enhanced_url 
          };
        }
      } catch (e) {
        continue;
      }
    }
    
    return { success: false };
  } catch (e) {
    console.error('[FreeAPI] Error:', e.message);
    return { success: false };
  }
}