// const https = require('https');
// const fs = require('fs');
// const path = require('path');
// const { exec } = require('child_process');
// const { promisify } = require('util');
// const execAsync = promisify(exec);

// const delay = ms => new Promise(r => setTimeout(r, ms));

// const getInitialAuth = () => {
//   return new Promise((resolve, reject) => {
//     https.get({
//       hostname: 'id.pinterest.com',
//       path: '/',
//       headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
//     }, res => {
//       const cookies = res.headers['set-cookie'];
//       if (!cookies) return reject('No cookies');
//       const csrf = cookies.find(c => c.startsWith('csrftoken='));
//       const sess = cookies.find(c => c.startsWith('_pinterest_sess='));
//       if (!csrf || !sess) return reject('Missing token');
//       const csrftoken = csrf.split(';')[0].split('=')[1];
//       const session = sess.split(';')[0];
//       resolve({ csrftoken, cookieHeader: `${session}; csrftoken=${csrftoken}` });
//     }).on('error', reject);
//   });
// };

// const downloadVideo = async (url, filename, outputDir) => {
//   const filepath = path.join(outputDir || path.join(process.cwd(), 'tmp'), filename);

//   if (fs.existsSync(filepath)) {
//     console.log(`   Already exists: ${filename}`);
//     return filepath;
//   }

//   try {
//     if (url.includes('.m3u8')) {
//       console.log(`   Downloading HLS → MP4: ${filename}`);
//       await execAsync(`ffmpeg -y -i "${url}" -c copy "${filepath}" -loglevel error -stats`);
//     } else {
//       console.log(`   Downloading MP4: ${filename}`);
//       const file = fs.createWriteStream(filepath);
//       await new Promise((resolve, reject) => {
//         https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
//           if (res.statusCode !== 200) return reject(`HTTP ${res.statusCode}`);
//           res.pipe(file);
//           file.on('finish', () => file.close(resolve));
//         }).on('error', reject);
//       });
//     }
//     console.log(`   Success: ${filename}`);
//     return filepath;
//   } catch (err) {
//     console.log(`   Failed: ${filename} → ${err.message}`);
//     throw err;
//   }
// };

// const searchPinterestAPI = async (query, limit = 30) => {
//   const { csrftoken, cookieHeader } = await getInitialAuth();
//   let results = [];
//   let bookmark = null;
//   let page = 1;

//   console.log(`\nSearching "${query}" on Pinterest... (limit: ${limit})\n`);

//   while (results.length < limit && bookmark !== false) {
//     const postData = {
//       options: { query, scope: 'pins', bookmarks: bookmark ? [bookmark] : [], page_size: 25 },
//       context: {}
//     };
//     const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
//     const dataString = `source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(postData))}`;

//     const body = await new Promise((resolve, reject) => {
//       const req = https.request({
//         hostname: 'id.pinterest.com',
//         path: '/resource/BaseSearchResource/get/',
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'X-CSRFToken': csrftoken,
//           'Cookie': cookieHeader,
//           'User-Agent': 'Mozilla/5.0',
//           'Referer': 'https://id.pinterest.com/',
//           'X-Requested-With': 'XMLHttpRequest'
//         }
//       }, res => {
//         let data = '';
//         res.on('data', d => data += d);
//         res.on('end', () => resolve(data));
//       });
//       req.on('error', reject);
//       req.write(dataString);
//       req.end();
//     });

//     await delay(1000);
//     let json;
//     try { json = JSON.parse(body); } catch { break; }

//     const pins = json?.resource_response?.data?.results || [];
//     if (!pins.length) break;

//     for (const pin of pins) {
//       if (results.length >= limit) break;

//       const img = pin.images?.['736x']?.url || pin.images?.orig?.url;
//       if (img && !results.some(r => r.url === img)) {
//         results.push({ 
//           type: 'image', 
//           url: img,
//           title: pin.title || pin.grid_title || 'Pinterest Image',
//           description: pin.description || ''
//         });
//       }

//       const videoData = pin.videos?.video_list;
//       if (videoData) {
//         const vid = videoData.V_720P || videoData.V_480P || videoData.V_360P || Object.values(videoData)[0];
//         if (vid?.url && !results.some(r => r.url === vid.url)) {
//           const ext = vid.url.includes('.m3u8') ? '.mp4' : (path.extname(vid.url) || '.mp4');
//           const safeName = `video_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;
//           results.push({
//             type: 'video',
//             format: vid.url.includes('.m3u8') ? 'hls' : 'mp4',
//             url: vid.url,
//             filename: safeName,
//             thumbnail: pin.images?.['236x']?.url || pin.images?.orig?.url || null,
//             title: pin.title || pin.grid_title || 'Pinterest Video',
//             description: pin.description || ''
//           });
//         }
//       }
//     }

//     bookmark = json?.resource_response?.bookmark ?? false;
//     console.log(`Page ${page} | Total: ${results.length}/${limit}`);
//     page++;
//   }

//   return results.slice(0, limit);
// };

// module.exports = {
//   searchPinterestAPI,
//   downloadVideo,
//   getInitialAuth
// };

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Ambil cookie awal untuk autentikasi Pinterest API
 */
const getInitialAuth = () => {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'id.pinterest.com',
      path: '/',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      const cookies = res.headers['set-cookie'];
      if (!cookies) return reject('No cookies');
      const csrf = cookies.find(c => c.startsWith('csrftoken='));
      const sess = cookies.find(c => c.startsWith('_pinterest_sess='));
      if (!csrf || !sess) return reject('Missing token');
      const csrftoken = csrf.split(';')[0].split('=')[1];
      const session = sess.split(';')[0];
      resolve({ csrftoken, cookieHeader: `${session}; csrftoken=${csrftoken}` });
    }).on('error', reject);
  });
};

/**
 * Cari gambar/video di Pinterest
 */
const searchPinterestAPI = async (query, limit = 30) => {
  const { csrftoken, cookieHeader } = await getInitialAuth();
  let results = [];
  let bookmark = null;

  while (results.length < limit && bookmark !== false) {
    const postData = {
      options: { query, scope: 'pins', bookmarks: bookmark ? [bookmark] : [], page_size: 25 },
      context: {}
    };

    const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
    const dataString = `source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(postData))}`;

    const body = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'id.pinterest.com',
        path: '/resource/BaseSearchResource/get/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': csrftoken,
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://id.pinterest.com/',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(dataString);
      req.end();
    });

    let json;
    try { json = JSON.parse(body); }
    catch { break; }

    const pins = json?.resource_response?.data?.results || [];
    if (!pins.length) break;

    for (const pin of pins) {
      if (results.length >= limit) break;

      // ambil gambar
      const img = pin.images?.['736x']?.url || pin.images?.orig?.url;
      if (img) {
        results.push({ type: 'image', url: img, title: pin.title || "", description: pin.description || "" });
      }

      // ambil video
      const vid = pin.videos?.video_list;
      if (vid) {
        const file = vid.V_720P || vid.V_480P || vid.V_360P || Object.values(vid)[0];
        if (file?.url) {
          const ext = file.url.includes('.m3u8') ? '.mp4' : path.extname(file.url) || '.mp4';
          const name = `video_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
          results.push({
            type: 'video',
            url: file.url,
            filename: name,
            title: pin.title || "",
            thumbnail: pin.images?.['236x']?.url
          });
        }
      }
    }

    bookmark = json?.resource_response?.bookmark ?? false;

    await delay(4000); // kasih jeda biar gak ke-block
  }

  return results.slice(0, limit);
};

/**
 * Download video dari URL Pinterest
 */
async function downloadPinterestVideo(url, filename, dir) {
  const outPath = path.join(dir, filename.endsWith('.mp4') ? filename : `${filename}.mp4`);
  try {
    // jika m3u8 (stream), konversi ke mp4 dengan ffmpeg
    if (url.includes('.m3u8')) {
      const cmd = `ffmpeg -y -i "${url}" -c copy "${outPath}"`;
      await execAsync(cmd);
    } else {
      // unduh langsung file video
      const res = await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, resolve).on('error', reject);
      });
      if (res.statusCode !== 200) throw new Error(`Bad status: ${res.statusCode}`);
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outPath);
        res.pipe(file);
        file.on('finish', resolve);
        file.on('error', reject);
      });
    }
    return outPath;
  } catch (err) {
    console.error('downloadPinterestVideo error:', err);
    return null;
  }
}

module.exports = { searchPinterestAPI, downloadPinterestVideo };