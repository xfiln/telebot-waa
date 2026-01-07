const https = require('https');
const path = require('path');
const fs = require('fs');

const USER_AGENT = 'WikimediaAllImages/1.0 (+your-email@example.com)';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args || args.length === 0) {
        return m.reply(`*Contoh Penggunaan:*\n${usedPrefix + command} Jakarta`);
    }
    
    const query = args.join(' ');
    
    try {
        m.reply(`🔍 Mencari gambar "${query}" di Wikimedia...`);
        
        const result = await getAllWikimediaImages(query);
        
        if (!result || result.total === 0) {
            return m.reply(`Maaf, tidak ditemukan gambar untuk "${query}".`);
        }
        
        let response = `*${result.label}*\n`;
        response += `📌 QID: ${result.qid}\n`;
        response += `🖼️ Total Gambar: ${result.total}\n\n`;
        
        // Tampilkan 5 gambar pertama
        const limit = Math.min(5, result.images.length);
        response += `*Menampilkan ${limit} dari ${result.total} gambar:*\n\n`;
        
        for (let i = 0; i < limit; i++) {
            const img = result.images[i];
            response += `${i + 1}. ${img.file}\n`;
            response += `   👤 Uploader: ${img.uploader}\n`;
            response += `   📅 ${new Date(img.uploaded).toLocaleDateString('id-ID')}\n`;
            response += `   🔗 ${img.page}\n\n`;
        }
        
        if (result.total > limit) {
            response += `\n_...dan ${result.total - limit} gambar lainnya_`;
        }
        
        m.reply(response);
        
        // Kirim gambar pertama jika ada
        if (result.images[0] && result.images[0].thumb) {
            await conn.sendFile(m.chat, result.images[0].thumb, 'image.jpg', 
                `*${result.label}*\n${result.images[0].file}`, m);
        }
        
    } catch (err) {
        console.error('Error:', err);
        m.reply(`Terjadi kesalahan: ${err.message}`);
    }
};

handler.command = /^(wikimedia)$/i;
module.exports = handler;

// ========================================
// FUNCTION WIKIMEDIA (dibawah module.exports)
// ========================================

/**
 * Mengambil semua gambar dari Wikimedia untuk suatu entitas
 * @param {string} label - Nama entitas yang dicari
 * @returns {Promise<Object>} Object berisi QID, label, dan array gambar
 */
async function getAllWikimediaImages(label) {
  // Helper function untuk fetch JSON
  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': USER_AGENT } }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
        });
      }).on('error', reject);
    });
  }

  // Helper: Cari QID di Wikidata
  async function searchWikidata(query) {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=id&format=json&origin=*`;
    const data = await fetchJson(url);
    return data.search[0]?.id || null;
  }

  // Helper: Ambil entity data lengkap
  async function getWikidataEntity(qid) {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
    return await fetchJson(url);
  }

  // Helper: Ambil gambar P18 (gambar utama)
  async function getP18Images(qid) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
    const data = await fetchJson(url);
    const claims = data.claims.P18 || [];
    return claims.map(c => c.mainsnak.datavalue.value.replace(/ /g, '_'));
  }

  // Helper: Ambil gambar P8517 (depicts)
  async function getP8517Images(qid) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P8517&format=json&origin=*`;
    const data = await fetchJson(url);
    const claims = data.claims.P8517 || [];
    return claims.map(c => c.mainsnak.datavalue.value.item.replace('http://www.wikidata.org/entity/', '') + '.jpg');
  }

  // Helper: Ambil gambar dari kategori Commons
  async function getCategoryImages(category) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtype=file&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=50&format=json&origin=*`;
    const data = await fetchJson(url);
    return (data.query.categorymembers || []).map(m => m.title.replace('File:', ''));
  }

  // Helper: Ambil info detail file dari Commons
  async function getCommonsFileInfo(filename) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|size|mime|user|timestamp|extmetadata&format=json&origin=*`;
    const data = await fetchJson(url);
    const page = Object.values(data.query.pages)[0];
    return page.imageinfo?.[0] || null;
  }

  // === MAIN LOGIC ===
  // 1. Cari QID
  const qid = await searchWikidata(label);
  if (!qid) throw new Error('Tidak ditemukan di Wikidata');

  // 2. Ambil entity data
  const entityData = await getWikidataEntity(qid);
  const entity = entityData.entities[qid];

  const allFiles = new Set();

  // 3. Kumpulkan semua file dari berbagai sumber
  const p18 = await getP18Images(qid);
  p18.forEach(f => allFiles.add(f));

  const p8517 = await getP8517Images(qid);
  p8517.forEach(f => allFiles.add(f));

  const category = entity.claims.P373?.[0]?.mainsnak?.datavalue?.value;
  if (category) {
    const catFiles = await getCategoryImages(category);
    catFiles.forEach(f => allFiles.add(f));
  }

  const files = Array.from(allFiles);

  // 4. Ambil detail setiap file
  const images = [];
  for (const file of files) {
    try {
      const info = await getCommonsFileInfo(file);
      if (info) {
        images.push({
          file,
          page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
          thumb: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=600`,
          full: info.url,
          width: info.width,
          height: info.height,
          uploader: info.user,
          uploaded: info.timestamp
        });
      }
    } catch (e) {
      // Skip file yang error
    }
    await new Promise(r => setTimeout(r, 200)); // Rate limiting
  }

  return {
    qid,
    label: entity.labels.id?.value || entity.labels.en?.value || label,
    images,
    total: images.length
  };
}