// const { deepNude } = require('../lib/deepnude.js');
// const uploadImage = require('../lib/uploadImage.js');
// const axios = require('axios');
// const FormData = require('form-data');
// const crypto = require('crypto');
// const fs = require('fs');

// async function handler(m, { conn, usedPrefix, command }) {
//   const q = m.quoted ? m.quoted : m;
//   const mime = (q.msg || q).mimetype || q.mediaType || '';
//   if (!/^image/.test(mime) || /webp/.test(mime)) return m.reply(`Reply gambar dengan *${usedPrefix + command}*`);

//   const loading = await conn.sendMessage(m.chat, { text: 'Sedang diproses, tunggu sebentar...' });
//   const loadingId = loading?.id || loading?.message_id || loading?.key?.id;
//   let tmpPath;

//   try {
//     const img = await q.download();
//     tmpPath = `./tmp_${Date.now()}.jpg`;
//     fs.writeFileSync(tmpPath, img);

//     const deep = await deepNude.create(tmpPath);
//     if (!deep.success) throw new Error('DeepNude gagal diproses');

//     const deepImg = await axios.get(deep.result, { responseType: 'arraybuffer' });
//     const buffer = Buffer.from(deepImg.data);

//     console.log('Buffer size:', buffer.length, 'bytes');
    
//     const uploadedUrl = await uploadImage(buffer);
//     console.log('Upload result:', uploadedUrl);
//     console.log('Upload type:', typeof uploadedUrl);
    
//     if (!uploadedUrl || typeof uploadedUrl !== 'string') {
//       throw new Error('Upload gagal atau format salah');
//     }

//     let finalUrl = uploadedUrl;
//     let processInfo = 'DeepNude';

//     console.log('Mencoba enhance...');
//     const tmpEnh = `./tmp_enh_${Date.now()}.jpg`;
//     fs.writeFileSync(tmpEnh, buffer);
//     const enhanceRes = await enhanceFromFile(tmpEnh);
//     fs.unlinkSync(tmpEnh);
    
//     console.log('Enhance result:', enhanceRes);
    
//     if (enhanceRes.success) {
//       try {
//         const testImg = await axios.head(enhanceRes.url, { timeout: 5000 });
//         if (testImg.status === 200) {
//           finalUrl = enhanceRes.url;
//           processInfo = 'DeepNude + Enhance';
//           console.log('Enhance berhasil, URL valid');
//         } else {
//           console.log('Enhance URL tidak valid, pakai upload');
//         }
//       } catch (e) {
//         console.log('Enhance URL error:', e.message, '- pakai upload');
//       }
//     } else {
//       console.log('Enhance gagal, pakai upload');
//     }

//     try {
//       await conn.sendMessage(m.chat, { 
//         photo: finalUrl,
//         caption: `Selesai!\nProses: ${processInfo}` 
//       }, { quoted: m });
//     } catch (sendError) {
//       console.log('Kirim URL gagal, coba download buffer...');
//       const imgBuffer = await axios.get(finalUrl, { responseType: 'arraybuffer' });
//       const buf = Buffer.from(imgBuffer.data);
      
//       await conn.sendMessage(m.chat, { 
//         photo: buf,
//         caption: `Selesai!\nProses: ${processInfo}` 
//       }, { quoted: m });
//     }
    
//     if (loadingId) await conn.sendMessage(m.chat, { delete: loadingId });

//   } catch (e) {
//     await conn.sendMessage(m.chat, { text: `Gagal: ${e.message}`});
//     if (loadingId) await conn.sendMessage(m.chat, { delete: loadingId });
//   } finally {
//     if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
//   }
// }

// handler.help = ['todeepnude'];
// handler.tags = ['tools'];
// handler.command = ['todeepnude'];
// handler.premium = true;
// handler.limit = true;

// module.exports = handler;

// async function enhanceFromFile(imagePath) {
//   try {
//     const form = new FormData();
//     form.append('image', fs.createReadStream(imagePath));
//     form.append('enable_quality_check', 'true');
//     form.append('output_format', 'jpg');

//     const res = await axios.post('https://photoenhancer.pro/api/fast-enhancer', form, {
//       headers: {
//         ...form.getHeaders(),
//         'origin': 'https://photoenhancer.pro',
//         'referer': 'https://photoenhancer.pro/upload?tool=enhance&mode=fast',
//         'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
//       },
//       maxBodyLength: Infinity,
//       maxContentLength: Infinity,
//     });

//     if (res.data?.success) {
//       return { success: true, url: `https://photoenhancer.pro${res.data.url}` };
//     }
//     return { success: false };
//   } catch (e) {
//     return { success: false };
//   }
// }



/*const { deepNude } = require('../lib/deepnude.js');
const uploadImage = require('../lib/uploadImage.js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

let deepTemp = {}; // Simpan data sementara per user

async function handler(m, { conn, usedPrefix, command }) {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';
  if (!/^image/.test(mime) || /webp/.test(mime)) {
    return m.reply(`Reply gambar dengan *${usedPrefix + command}*`);
  }

  const chatId = m.chat;
  const senderId = m.sender;
  const ownerKey = senderId;

  // Cek apakah ada sesi sebelumnya
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

    // Simpan data sementara
    deepTemp[ownerKey] = {
      buffer: img,
      tmpPath,
      chatId,
      quoted: m,
      loadingId: loading.message_id
    };

    console.log('[DEEP] Session created for:', ownerKey);

    // Kirim button pilihan
    await conn.sendButt(chatId, '🎭 Pilih metode pemrosesan:', [
      [
        { text: '🔞 DeepNude', callback_data: `deep_nude_${ownerKey}` },
        { text: '🎭 DeepFake', callback_data: `deep_fake_${ownerKey}` }
      ]
    ], m);

    // Hapus loading
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
  // PERBAIKAN: Ambil data dengan aman
  const data = ctx?.callbackQuery?.data || ctx?.data;
  const conn = ctx.conn;
  
  console.log('[DEEP CALLBACK] Received:', data);
  
  // Filter hanya callback untuk deep_
  if (!data || !data.startsWith('deep_')) {
    console.log('[DEEP CALLBACK] Not for this plugin, skipping');
    return false; // Return false agar plugin lain bisa coba
  }

  const parts = data.split('_');
  if (parts.length < 3) return false;
  
  const action = parts[1];
  const ownerKey = parts[2];
  
  console.log('[DEEP] Processing:', { action, ownerKey });

  // Cek sesi
  const s = deepTemp[ownerKey];
  if (!s) {
    console.log('[DEEP] Session not found for:', ownerKey);
    console.log('[DEEP] Available sessions:', Object.keys(deepTemp));
    
    // PERBAIKAN: Answer callback dengan safe method
    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery('⚠️ Sesi tidak ditemukan atau sudah berakhir.', { show_alert: true });
    } else if (ctx.callbackQuery && conn.telegram) {
      await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '⚠️ Sesi tidak ditemukan atau sudah berakhir.', { show_alert: true });
    }
    return true; // Sudah handle, return true
  }

  const { buffer, tmpPath, chatId, quoted } = s;

  // PERBAIKAN: Answer callback untuk hilangkan loading dengan safe method
  if (ctx.answerCbQuery) {
    await ctx.answerCbQuery('⏳ Memproses... Mohon tunggu.');
  } else if (ctx.callbackQuery && conn.telegram) {
    await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '⏳ Memproses... Mohon tunggu.');
  }

  let resultBuffer, processInfo;

  try {
    if (action === 'nude') {
      console.log('[DEEP] Processing DeepNude...');
      
      const deep = await deepNude.create(tmpPath);
      if (!deep.success) throw new Error('DeepNude gagal');
      
      const deepImg = await axios.get(deep.result, { responseType: 'arraybuffer' });
      resultBuffer = Buffer.from(deepImg.data);
      processInfo = 'DeepNude';
    }
    else if (action === 'fake') {
      console.log('[DEEP] Processing DeepFake...');
      
      // Step 1: Upload image
      const form = new FormData();
      form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
      form.append('fn_name', 'cloth-change');
      form.append('request_from', '4');
      form.append('origin_from', '7cc7af6c758b6e74');

      const { data: uploadRes } = await axios.post(
        'https://api.deepfakemaker.io/aitools/upload-img', 
        form, 
        {
          headers: { 
            ...form.getHeaders(), 
            'origin': 'https://deepfakemaker.io', 
            'referer': 'https://deepfakemaker.io/' 
          }
        }
      );

      const imagePath = uploadRes.data.path;
      console.log('[DEEP] Image uploaded:', imagePath);

      // Step 2: Create task
      const createReq = {
        fn_name: "cloth-change",
        call_type: 3,
        input: { 
          source_image: imagePath, 
          prompt: "best quality, nude", 
          cloth_type: "full_outfits", 
          request_from: 4, 
          type: 1 
        },
        request_from: 4,
        origin_from: "7cc7af6c758b6e74"
      };

      const { data: createRes } = await axios.post(
        'https://api.deepfakemaker.io/aitools/of/create', 
        createReq, 
        {
          headers: { 
            'content-type': 'application/json', 
            'origin': 'https://deepfakemaker.io' 
          }
        }
      );

      const taskId = createRes.data.task_id;
      if (!taskId) throw new Error('Task ID tidak ditemukan');
      
      console.log('[DEEP] Task created:', taskId);

      // Step 3: Poll status
      let resultUrl = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const poll = await axios.post(
          'https://api.deepfakemaker.io/aitools/of/check-status',
          {
            task_id: taskId,
            fn_name: 'cloth-change',
            call_type: 3,
            request_from: 4,
            origin_from: '7cc7af6c758b6e74'
          }
        );
        
        if (poll.data?.data?.status === 2 && poll.data?.data?.result_image) {
          resultUrl = 'https://res.deepfakemaker.io/' + poll.data.data.result_image;
          console.log('[DEEP] Task completed:', resultUrl);
          break;
        }
      }
      
      if (!resultUrl) throw new Error('DeepFake timeout');
      
      const deepImg = await axios.get(resultUrl, { responseType: 'arraybuffer' });
      resultBuffer = Buffer.from(deepImg.data);
      processInfo = 'DeepFake';
    }

    // ===== ENHANCE (OPTIONAL) =====
    console.log('[DEEP] Uploading result...');
    const uploadedUrl = await uploadImage(resultBuffer);
    if (!uploadedUrl || typeof uploadedUrl !== 'string') throw new Error('Upload gagal');

    let finalUrl = uploadedUrl;

    try {
      console.log('[DEEP] Enhancing image...');
      const enhanceRes = await enhanceFromFile(resultBuffer);

      if (enhanceRes.success) {
        const test = await axios.head(enhanceRes.url, { timeout: 5000 });
        if (test.status === 200) {
          finalUrl = enhanceRes.url;
          processInfo += ' + Enhance';
          console.log('[DEEP] Enhanced:', finalUrl);
        }
      }
    } catch (e) {
      console.log('[DEEP] Enhance skipped:', e.message);
    }

    // ===== KIRIM HASIL =====
    console.log('[DEEP] Sending result...');
    
    try {
      await conn.sendMessage(chatId, {
        image: { url: finalUrl },
        caption: `✅ *Selesai!*\n📊 Proses: ${processInfo}`
      }, { quoted });
    } catch (sendError) {
      console.log('[DEEP] Trying buffer send...');
      const imgBuffer = await axios.get(finalUrl, { responseType: 'arraybuffer' });
      await conn.sendMessage(chatId, {
        image: Buffer.from(imgBuffer.data),
        caption: `✅ *Selesai!*\n📊 Proses: ${processInfo}`
      }, { quoted });
    }

    console.log('[DEEP] Process completed successfully!');
    return true; // Berhasil handle callback

  } catch (e) {
    console.error('[DEEP ERROR]:', e);
    await conn.sendMessage(chatId, { 
      text: `❌ *Gagal memproses*\n\n${e.message}` 
    }, { quoted });
    
    // PERBAIKAN: Answer callback error dengan safe method
    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery('❌ Gagal: ' + e.message, { show_alert: true });
    } else if (ctx.callbackQuery && conn.telegram) {
      await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Gagal: ' + e.message, { show_alert: true });
    }
    return true; // Tetap return true karena sudah handle
    
  } finally {
    // Cleanup
    try { if (tmpPath) await fs.promises.unlink(tmpPath); } catch (e) {}
    delete deepTemp[ownerKey];
    console.log('[DEEP] Session deleted:', ownerKey);
  }
};

handler.help = ['todeep'];
handler.tags = ['tools'];
handler.command = ['todeep'];
handler.premium = true
handler.limit = true;

module.exports = handler;

// async function enhanceFromFile(imagePath) {
//   try {
//     const form = new FormData();
//     form.append('image', fs.createReadStream(imagePath));
//     form.append('enable_quality_check', 'true');
//     form.append('output_format', 'jpg');
    
//     const res = await axios.post('https://photoenhancer.pro/api/fast-enhancer', form, {
//       headers: {
//         ...form.getHeaders(),
//         'origin': 'https://photoenhancer.pro',
//         'referer': 'https://photoenhancer.pro/upload?tool=enhance&mode=fast',
//         'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
//       },
//       maxBodyLength: Infinity,
//       maxContentLength: Infinity,
//     });
    
//     if (res.data?.success) {
//       return { success: true, url: `https://photoenhancer.pro${res.data.url}` };
//     }
//     return { success: false };
//   } catch (e) {
//     return { success: false };
//   }
// }
*/


