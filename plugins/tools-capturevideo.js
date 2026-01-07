let { promises, existsSync, mkdirSync } = require('fs')
let { exec } = require('child_process')
let uploadImage = require('../lib/uploadImage')
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const TMP_FOLDER = '../tmp'

if (!existsSync(TMP_FOLDER)) mkdirSync(TMP_FOLDER)

function parseTimeFormat(input) {
    if (/^\d+$/.test(input)) {
        let sec = parseInt(input)
        let hours = Math.floor(sec / 3600)
        let minutes = Math.floor((sec % 3600) / 60)
        let seconds = sec % 60
        return [hours, minutes, seconds]
            .map(v => v.toString().padStart(2, '0'))
            .join(':')
    } else if ((input.match(/:/g) || []).length === 1) {
        return '00:' + input
    } else {
        return input
    }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || ''

        if (!/video/.test(mime)) throw `Balas video yang mau di-screenshot dengan caption *${usedPrefix + command} <waktu>*`
        if (!args[0]) throw `Contoh:\n${usedPrefix + command} 10\n${usedPrefix + command} 0:30\n${usedPrefix + command} 1:02:00`

        let time = parseTimeFormat(args[0])

        let video = await q.download?.()
        if (!video) throw '❌ Gagal download video!'

        let filenameBase = Date.now()
        let inputPath = `${TMP_FOLDER}/${filenameBase}.mp4`
        let outputPath = `${TMP_FOLDER}/${filenameBase}_screenshot.jpg`

        await promises.writeFile(inputPath, video)

        m.reply(`⏳ Mengambil screenshot pada ${time}...`)

        exec(`ffmpeg -ss ${time} -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}"`, async (err) => {
            await promises.unlink(inputPath)

            if (err) {
                console.error('Error saat screenshot video:', err)
                return m.reply('❌ Gagal screenshot video!\nPastikan waktu yang kamu masukkan benar.')
            }

            try {
                let result = await promises.readFile(outputPath)
                const uploadVideo = await uploadImage(video)
                const uploadCapture = await uploadImage(result)

                // Attempt enhancement: supawork -> photoenhancer.pro -> waifu2x
                let enhancedUrl = null
                let enhanceMethod = null

                try {
                    const enh = await enhanceFromFile(result)
                    if (enh && enh.success) {
                        if (enh.url) enhancedUrl = enh.url
                        else if (enh.buffer) enhancedUrl = await uploadImage(enh.buffer)
                        enhanceMethod = 'supawork'
                    } else throw new Error('supawork failed')
                } catch (e) {
                    console.log('[CAPTUREVIDEO] supawork failed:', e.message)
                    try {
                        const alt = await enhanceFromFileAlternative(outputPath)
                        if (alt && alt.success) {
                            enhancedUrl = alt.url
                            enhanceMethod = 'photoenhancer.pro'
                        } else throw new Error('photoenhancer.pro failed')
                    } catch (e2) {
                        console.log('[CAPTUREVIDEO] photoenhancer.pro failed:', e2.message)
                        try {
                            const wbuf = await waifu2xEnhance(result)
                            if (wbuf) {
                                enhancedUrl = await uploadImage(wbuf)
                                enhanceMethod = 'waifu2x'
                            }
                        } catch (e3) {
                            console.log('[CAPTUREVIDEO] waifu2x failed:', e3.message)
                        }
                    }
                }

                const caption = `✅ Screenshot di ${time}\n\n🔗 Url Result (Raw): ${uploadCapture}\n🔗 Url Enhanced (${enhanceMethod || 'none'}): ${enhancedUrl || 'Tidak tersedia'}\n🔗 Url Asli (MP4): ${uploadVideo}`

                if (enhancedUrl) {
                    // Send enhanced image as main file, include URLs in caption
                    await conn.sendFile(m.chat, enhancedUrl, 'screenshot_enhanced.jpg', caption, m)
                } else {
                    // Send raw screenshot
                    await conn.sendFile(m.chat, result, 'screenshot.jpg', caption, m)
                }

            } catch (procErr) {
                console.error('Error during post-screenshot processing:', procErr)
                return m.reply('❌ Gagal memproses screenshot: ' + procErr.message)
            } finally {
                await promises.unlink(outputPath)
            }
        })

    } catch (e) {
        console.error('Error di handler screenshotvideo:', e)
        m.reply(`❌ Terjadi error:\n${e}`)
    }
}

handler.help = ['capturevideo <waktu>']
handler.tags = ['tools']
handler.command = /^capturevideo$/i

module.exports = handler

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