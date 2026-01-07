// const fs = require('fs')
// const { InputFile } = require('telegraf')
// const path = require('path')
// const axios = require('axios')
// const print = require('./print')
// const { getMimeType } = require('./getMime')
// const { M } = require('human-readable')


// const isUrl = (str) => {
//   try {
//     new URL(str)
//     return true
//   } catch {
//     return false
//   }
// }

// const isFilePath = (str) => {
//   if (typeof str !== 'string') return false
//   if (isUrl(str)) return false
//   return fs.existsSync(str)
// }

// const isBuffer = (input) => {
//   return Buffer.isBuffer(input)
// }

// const downloadMedia = async (url) => {
//   try {
//     const response = await axios({
//       method: 'GET',
//       url: url,
//       responseType: 'arraybuffer',
//       timeout: 200000,
//       headers: {

//         'Accept': '*/*',
//         'Accept-Language': 'en-US,en;q=0.9',
//         'Accept-Encoding': 'gzip, deflate, br',
//         'Connection': 'keep-alive',
//         'Upgrade-Insecure-Requests': '1'
//       },
//       maxRedirects: 5
//     })
//     return Buffer.from(response.data)
//   } catch (error) {
//     console.error('Download error:', error.message)
//     throw new Error(`Failed to download: ${error.message}`)
//   }
// }

// const processMediaInput = async (input) => {
//   try {
//     if (isBuffer(input)) {
//       return input
//     }

//     if (isUrl(input)) {
//       return await downloadMedia(input) 
//     }

//     if (isFilePath(input)) {
//       return fs.readFileSync(input)
//     }

//     return input
//   } catch (error) {
//     console.error('Process media error:', error.message)
//     throw error
//   }
// }

// const downloadFromMessage = async (ctx) => {
//   try {
//     if (!ctx.reply_to_message) return null

//     const quoted = ctx.reply_to_message

//     const getFile = async () => {
//       if (quoted.photo) {
//         const fileId = quoted.photo[quoted.photo.length - 1].file_id
//         return await ctx.telegram.getFile(fileId)
//       }
//       if (quoted.video) return await ctx.telegram.getFile(quoted.video.file_id)
//       if (quoted.audio) return await ctx.telegram.getFile(quoted.audio.file_id)
//       if (quoted.document) return await ctx.telegram.getFile(quoted.document.file_id)
//       if (quoted.sticker) return await ctx.telegram.getFile(quoted.sticker.file_id)
//       return null
//     }

//     const file = await getFile()
//     if (!file) return null

//     const response = await axios({
//       method: 'GET',
//       url: `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`,
//       responseType: 'arraybuffer'
//     })

//     return Buffer.from(response.data)

//   } catch (e) {
//     console.error('Download error:', e)
//     return null
//   }
// }

// module.exports = (conn) => {
//   conn.telegram.getMe().then(bot => {
//     conn.botInfo = bot;
//     conn.user = {
//       jid: String(bot.id),
//       id: String(bot.id),
//       username: bot.username || '',
//       first_name: bot.first_name || '',
//       type: 'bot'
//     };
//   });
//   conn.groupMetadata = async function (chatId) {
//     const jid = chatId;
//     const chat = await this.telegram.getChat(jid);
//     let admins = [];
//     try {
//       admins = await this.telegram.getChatAdministrators(jid);
//     } catch (e) {
//       admins = [];
//     }
//     let memberCount = null;
//     try {
//       memberCount = await this.telegram.getChatMemberCounts(jid);
//     } catch (e) {
//       memberCount = null;
//     }
//     const participants = admins.map((a) => ({
//       id: a.user.id,
//       username: a.user.username || null,
//       first_name: a.user.first_name || null,
//       last_name: a.user.last_name || null,
//       admin: a.status === 'administrator' || a.status === 'creator' || 'member',
//       isCreator: a.status === 'creator',
//       status: a.status,
//       can_manage_chat: a.can_manage_chat ?? undefined,
//       can_delete_messages: a.can_delete_messages ?? undefined,
//       can_manage_video_chats: a.can_manage_video_chats ?? undefined,
//       can_restrict_members: a.can_restrict_members ?? undefined,
//       can_promote_members: a.can_promote_members ?? undefined,
//     }));
//     return {
//       id: chat.id,
//       type: chat.type,
//       subject: chat.title || chat.username || null,
//       description: chat.description || null,
//       is_forum: !!chat.is_forum,
//       invite_link: chat.invite_link || null,
//       photo: chat.photo
//         ? { small: chat.photo.small_file_id, big: chat.photo.big_file_id }
//         : null,
//       size: memberCount,
//       participants,
//     };
//   };
//   // ---- helpers kecil ----
//   const getQuotedId = (q) =>
//     q?.message_id || q?.id || q?.msg_id || q?.messageId || undefined;

//   const buildVCard = ({ first_name, last_name, phone_number, org, title }) => {
//     const fn = [first_name, last_name].filter(Boolean).join(' ').trim() || 'Contact';
//     const lines = [
//       'BEGIN:VCARD',
//       'VERSION:3.0',
//       `FN:${fn}`,
//       `N:${last_name || ''};${first_name || ''};;;`,
//       org ? `ORG:${org}` : null,
//       title ? `TITLE:${title}` : null,
//       `TEL;TYPE=CELL:${phone_number}`,
//       'END:VCARD'
//     ].filter(Boolean);
//     return lines.join('\n');
//   };

//   const normalizeContact = (c, defaults = {}) => {
//     if (typeof c === 'string' || typeof c === 'number') {
//       return {
//         phone_number: String(c).trim(),
//         first_name: defaults.first_name || 'Contact',
//         last_name: defaults.last_name || '',
//         vcard: undefined,
//       };
//     }
//     const phone = String(
//       c.phone_number || c.phone || c.number || c.num || ''
//     ).trim();

//     return {
//       phone_number: phone,
//       first_name: (c.first_name || c.name || defaults.first_name || 'Contact').toString(),
//       last_name: (c.last_name || defaults.last_name || '').toString(),
//       vcard: c.vcard,
//     };
//   };

//   // ---- fungsi utama ----
//   conn.sendContact = async (jid, contacts, caption, quoted, options = {}) => {
//     try {
//       if (typeof caption === 'object' && caption && !quoted && !options) {
//         options = caption; caption = undefined; quoted = undefined;
//       } else if (typeof quoted === 'object' && !('message_id' in (quoted || {})) && !options) {
//         options = quoted; quoted = undefined;
//       }

//       const list = Array.isArray(contacts) ? contacts : [contacts];
//       if (!list.length) return null;
//       const seen = new Set();
//       const normalized = list
//         .map(c => normalizeContact(c, { first_name: options.default_name }))
//         .filter(c => c.phone_number && !seen.has(c.phone_number) && seen.add(c.phone_number));

//       const replyId = getQuotedId(quoted);
//       let captionMsg = null;
//       if (caption) {
//         captionMsg = await conn.telegram.sendMessage(jid, caption, {
//           reply_to_message_id: replyId,
//           allow_sending_without_reply: true,
//           parse_mode: options.caption_parse_mode || options.parse_mode || undefined,
//           disable_web_page_preview: true,
//         });
//       }

//       const results = [];
//       for (let i = 0; i < normalized.length; i++) {
//         const c = normalized[i];
//         const extra = {
//           reply_to_message_id: captionMsg?.message_id ?? (i === 0 ? replyId : undefined),
//           allow_sending_without_reply: true,
//           ...options,
//         };
//         delete extra.caption_parse_mode;
//         let vcard = c.vcard;
//         if (!vcard && options.auto_vcard) {
//           vcard = buildVCard({
//             first_name: c.first_name,
//             last_name: c.last_name,
//             phone_number: c.phone_number,
//             org: options.vcard_org,
//             title: options.vcard_title,
//           });
//         }
//         if (vcard) extra.vcard = vcard;
//         if (c.last_name) extra.last_name = c.last_name;

//         // Telegraf: sendContact(chatId, phoneNumber, firstName, extra)\
//         // https://telegraf.js.org/classes/Telegram.html#sendContact.sendContact-1
//         await delay(5000)
//         const res = await conn.telegram.sendContact(jid, c.phone_number, c.first_name, extra);
//         results.push(res);
//       }
//       try { typeof print === 'function' && print({ content: { contacts: normalized }, chat: jid }, conn, true); } catch { }

//       return results.length === 1 ? results[0] : results;
//     } catch (err) {
//       console.error('SendContact error:', err);
//       const replyId = getQuotedId(quoted);
//       await conn.telegram.sendMessage(jid, caption, {
//           reply_to_message_id: replyId,
//           allow_sending_without_reply: true,
//           parse_mode: options.caption_parse_mode || options.parse_mode || undefined,
//           disable_web_page_preview: true,
//         });
//       // throw err;
//     }
//   };

//   // Menambahkan id pada setiap pesan untuk fitur games
//   const aliasId = (r) => {
//     if (r && r.message_id != null && r.id == null) r.id = String(r.message_id);
//     return r;
//   };

//   function sanitizeTgExtra(extra = {}) {
//   const e = { ...extra }
//   // buang field yang bukan bagian Telegram API
//   delete e.quoted
//   delete e.contextInfo
//   delete e.ephemeralExpiration
//   delete e.forwardingScore
//   delete e.is_forwarded
//   delete e.message
//   delete e.msg
//   return e
// }

// function resolveReplyTo(quoted) {
//   if (!quoted) return undefined
//   return quoted.message_id || quoted.id || quoted.msg_id || quoted.messageId || quoted.key?.id
// }


// conn.sendPhoto = async (chatId, photo, options = {}) => {
//   return await conn.telegram.sendPhoto(chatId, photo, options)
// }
  
//   conn.sendMessage = async (jid, content, options = {}) => {
//     try {
//       if (!jid || jid === "" || jid === undefined || jid === null) {
//         throw new Error("Chat ID (jid) is required and cannot be empty");
//       }
      
//       if (!content || typeof content !== 'object') throw new Error("Invalid content object");
      
//       // DELETE MESSAGE
// if (content.delete) {
//   try {
//     let msgId;
//     if (typeof content.delete === "object") {
//       msgId =
//         content.delete.message_id ||
//         content.delete.id ||
//         content.delete.key?.id ||
//         content.delete.key?.message_id;
//     } else {
//       msgId = content.delete;
//     }

//     if (!msgId) throw new Error("Invalid delete target");

//     await conn.telegram.deleteMessage(jid, msgId);
//     console.log("Message deleted:", msgId);
//     return { deleted: true, id: msgId };
//   } catch (err) {
//     console.error("DeleteMessage error:", err.message);
//     return null;
//   }
// }

// // EDIT MESSAGE
// if (content.edit) {
//   try {
//     let msgId;
//     if (typeof content.edit === "object") {
//       msgId =
//         content.edit.message_id ||
//         content.edit.id ||
//         content.edit.key?.id ||
//         content.edit.key?.message_id;
//     } else {
//       msgId = content.edit;
//     }

//     const newText = content.text || "";
//     if (!msgId || !newText) throw new Error("Invalid edit target or empty text");

//     const res = await conn.telegram.editMessageText(jid, msgId, undefined, newText, options);
//     console.log("Message edited:", msgId);
//     return res;
//   } catch (err) {
//     console.error("EditMessage error:", err.message);

//     // fallback — kalau edit gagal, hapus lalu kirim baru
//     if (content.edit) {
//       try {
//         await conn.sendMessage(jid, { delete: content.edit });
//         await conn.sendMessage(jid, { text: newText || "Gagal mengedit pesan." });
//       } catch (delErr) {
//         console.error("Fallback edit->delete error:", delErr.message);
//       }
//     }

//     return null;
//   }
// }

//       const aliasId = (r) => {
//         if (r && r.message_id != null && r.id == null) r.id = String(r.message_id);
//         return r;
//       };

//       const CAP_LIMIT = MAX_CAPTION_LENGTH;

//       // helper ambil reply_to_message_id dari quoted
//       const resolveReplyTo = (q) => {
//         if (!q) return undefined;
//         return q.message_id || q.id || q.msg_id || q.messageId || (q.key && q.key.id);
//       };

//       const { text, photo, video, audio, document, sticker, image } = content;

//       // TEXT
//       if (text) {
//   const messageText = String(text).trim();
//   if (!messageText || messageText === "undefined" || messageText === "null") {
//     return null;
//   }

//   const baseOpts = { ...options };
  
//   // ✅ TAMBAHKAN ENCODING HANDLING DI SINI
//   if (options.encoding && options.encoding.toLowerCase() === 'utf-8') {
//     // Explicit UTF-8 encoding handling
//     baseOpts.parse_mode = undefined; // Nonaktifkan parse_mode untuk raw UTF-8
//   }
  
//   if (baseOpts.parse_mode === false || baseOpts.parse_mode === null) delete baseOpts.parse_mode;

//   const rid = resolveReplyTo(options.quoted);
//   if (rid) baseOpts.reply_to_message_id = rid;

//   // jika text melebihi limit, kirim sebagai dokumen .txt
//   if (messageText.length > CAP_LIMIT) {
//     const txtBuffer = Buffer.from(messageText, 'utf-8');
//     const docRes = await conn.telegram.sendDocument(
//       jid,
//       { source: txtBuffer, filename: 'description.txt' },
//       { ...baseOpts, caption: '📄 Pesan terlalu panjang, dikirim sebagai file:' }
//     );
//     aliasId(docRes);
//     print(
//       { content: { document: 'conn.sendMessage text terlalu panjang mengirim menjadi file.txt' }, chat: jid },
//       conn,
//       true
//     );
//     return docRes;
//   }

//   // normal: kirim sebagai pesan teks
//   const result = await conn.telegram.sendMessage(jid, messageText, baseOpts);
//   if (result && result.message_id != null) result.id = String(result.message_id);
//   aliasId(result);
//   print({ content: { text: messageText }, chat: jid }, conn, true);
//   return result;
// }

//       // IMAGE / PHOTO
//       if (photo || image) {
//         const imageInput = photo || image;
//         const caption = content.caption || "";

//         const baseOpts = { ...options };
//         if (baseOpts.parse_mode === false || baseOpts.parse_mode === null) delete baseOpts.parse_mode;
//         const rid = resolveReplyTo(options.quoted);
//         if (rid) baseOpts.reply_to_message_id = rid;

//         const inputIsUrl =
//           (typeof imageInput === 'string' && isUrl(imageInput)) ||
//           (imageInput && typeof imageInput === 'object' && typeof imageInput.url === 'string' && isUrl(imageInput.url));

//         let result;
//         const sendPhoto = async (optsWithCaption) => {
//           if (inputIsUrl) {
//             const url = typeof imageInput === 'string' ? imageInput : imageInput.url;
//             return conn.telegram.sendPhoto(jid, url, optsWithCaption);
//           } else {
//             const buffer = await processMediaInput(imageInput);
//             return conn.telegram.sendPhoto(jid, { source: buffer, filename: "image.jpg" }, optsWithCaption);
//           }
//         };

//         if (caption && caption.length > CAP_LIMIT) {
//           // kirim foto tanpa caption
//           result = await sendPhoto({ ...baseOpts, caption: "" });
//           aliasId(result);
//           print({ content: { photo: imageInput, caption: "" }, chat: jid }, conn, true);

//           // kirim caption sebagai teks terpisah mereply media
//           const txtBuffer = Buffer.from(caption, 'utf-8');
//           const textRes = await conn.telegram.sendDocument(jid, {
//             source: txtBuffer,
//             filename: 'description.txt',
//           }, {
//             ...options,
//             caption: '📄 Caption terlalu panjang, dikirim sebagai file:',
//             reply_to_message_id: result.message_id,
//           });

//           aliasId(textRes);
//           print({ content: { document: 'conn.sendMessage caption terlalu panjang mengirim menjadi file.txt' }, chat: jid }, conn, true);
//         } else {
//           result = await sendPhoto({ ...baseOpts, caption });
//           aliasId(result);
//           print({ content: { photo: imageInput, caption }, chat: jid }, conn, true);
//         }
//         return result;
//       }

//       // VIDEO
//       if (video) {
//         const videoInput = video;
//         const caption = content.caption || "";

//         const baseOpts = { ...options };
//         if (baseOpts.parse_mode === false || baseOpts.parse_mode === null) delete baseOpts.parse_mode;
//         const rid = resolveReplyTo(options.quoted);
//         if (rid) baseOpts.reply_to_message_id = rid;

//         const inputIsUrl =
//           (typeof videoInput === 'string' && isUrl(videoInput)) ||
//           (videoInput && typeof videoInput === 'object' && typeof videoInput.url === 'string' && isUrl(videoInput.url));

//         let result;
//         const sendVideo = async (optsWithCaption) => {
//           if (inputIsUrl) {
//             const url = typeof videoInput === 'string' ? videoInput : videoInput.url;
//             return conn.telegram.sendVideo(jid, url, { ...optsWithCaption, supports_streaming: true });
//           } else {
//             const buffer = await processMediaInput(videoInput);
//             return conn.telegram.sendVideo(
//               jid,
//               { source: buffer, filename: "video.mp4" },
//               { ...optsWithCaption, supports_streaming: true }
//             );
//           }
//         };

//         if (caption && caption.length > CAP_LIMIT) {
//           result = await sendVideo({ ...baseOpts, caption: "" });
//           aliasId(result);
//           print({ content: { video: videoInput, caption: "" }, chat: jid }, conn, true);

//           const txtBuffer = Buffer.from(caption, 'utf-8');
//           const textRes = await conn.telegram.sendDocument(jid, {
//             source: txtBuffer,
//             filename: 'description.txt',
//           }, {
//             ...options,
//             caption: '📄 Caption terlalu panjang, dikirim sebagai file:',
//             reply_to_message_id: result.message_id,
//           });

//           aliasId(textRes);
//           print({ content: { document: 'conn.sendMessage caption terlalu panjang mengirim menjadi file.txt' }, chat: jid }, conn, true);
//         } else {
//           result = await sendVideo({ ...baseOpts, caption });
//           aliasId(result);
//           print({ content: { video: videoInput, caption }, chat: jid }, conn, true);
//         }
//         return result;
//       }

//       // AUDIO
//       if (audio) {
//         const audioInput = audio;
//         const caption = content.caption || "";

//         const baseOpts = {
//           performer: content.performer,
//           title: content.title,
//           duration: content.duration,
//           ...options,
//         };
//         if (baseOpts.parse_mode === false || baseOpts.parse_mode === null) delete baseOpts.parse_mode;
//         const rid = resolveReplyTo(options.quoted);
//         if (rid) baseOpts.reply_to_message_id = rid;

//         const inputIsUrl =
//           (typeof audioInput === 'string' && isUrl(audioInput)) ||
//           (audioInput && typeof audioInput === 'object' && typeof audioInput.url === 'string' && isUrl(audioInput.url));

//         let result;
//         const sendAudio = async (optsWithCaption) => {
//           if (inputIsUrl) {
//             try {
//               const probe = await axios.get(typeof audioInput === 'string' ? audioInput : audioInput.url, {
//                 method: 'GET',
//                 responseType: 'stream',
//                 maxRedirects: 2,
//               });
//               const ct = probe.headers['content-type'] || '';
//               if (/^audio\//i.test(ct)) {
//                 return conn.telegram.sendAudio(jid, (typeof audioInput === 'string' ? audioInput : audioInput.url), optsWithCaption);
//               } else {
//                 const { data } = await axios.get(typeof audioInput === 'string' ? audioInput : audioInput.url, {
//                   responseType: 'arraybuffer',
//                 });
//                 const buf = Buffer.from(data);
//                 return conn.telegram.sendAudio(jid, { source: buf, filename: 'audio.mp3' }, optsWithCaption);
//               }
//             } catch {
//               const { data } = await axios.get(typeof audioInput === 'string' ? audioInput : audioInput.url, {
//                 responseType: 'arraybuffer',
//               });
//               const buf = Buffer.from(data);
//               return conn.telegram.sendAudio(jid, { source: buf, filename: 'audio.mp3' }, optsWithCaption);
//             }
//           } else {
//             const buffer = await processMediaInput(audioInput);
//             return conn.telegram.sendAudio(jid, { source: buffer, filename: 'audio.mp3' }, optsWithCaption);
//           }
//         };

//         if (caption && caption.length > CAP_LIMIT) {
//           result = await sendAudio({ ...baseOpts, caption: "" });
//           aliasId(result);
//           print({ content: { audio: audioInput, caption: "" }, chat: jid }, conn, true);

//           const txtBuffer = Buffer.from(caption, 'utf-8');
//           const textRes = await conn.telegram.sendDocument(jid, {
//             source: txtBuffer,
//             filename: 'description.txt',
//           }, {
//             ...options,
//             caption: '📄 Caption terlalu panjang, dikirim sebagai file:',
//             reply_to_message_id: result.message_id,
//           });

//           aliasId(textRes);
//           print({ content: { document: 'conn.sendMessage caption terlalu panjang mengirim menjadi file.txt' }, chat: jid }, conn, true);
//         } else {
//           result = await sendAudio({ ...baseOpts, caption });
//           aliasId(result);
//           print({ content: { audio: audioInput, caption }, chat: jid }, conn, true);
//         }
//         return result;
//       }

//       // DOCUMENT
//       if (document) {
//         const docInput = document;
//         const caption = content.caption || "";

//         const baseOpts = { ...options };
//         if (baseOpts.parse_mode === false || baseOpts.parse_mode === null) delete baseOpts.parse_mode;
//         const rid = resolveReplyTo(options.quoted);
//         if (rid) baseOpts.reply_to_message_id = rid;

//         const inputIsUrl =
//           (typeof docInput === 'string' && isUrl(docInput)) ||
//           (docInput && typeof docInput === 'object' && typeof docInput.url === 'string' && isUrl(docInput.url));

//         let buffer;
//         let filename = content.fileName || 'document.bin';

//         if (inputIsUrl) {
//           buffer = await processMediaInput(typeof docInput === 'string' ? docInput : docInput.url);
//         } else {
//           buffer = await processMediaInput(docInput);
//         }

//         try {
//           const mimeType = content.mimetype || getMimeType(buffer) || 'application/octet-stream';
//           const ext = mimeType.split('/')[1] || 'bin';
//           filename = content.fileName || `document.${ext}`;
//         } catch (e) {
//           console.warn('Gagal deteksi MIME, pakai default .bin');
//         }

//         let result;
//         if (caption && caption.length > CAP_LIMIT) {
//           // kirim dokumen tanpa caption
//           result = await conn.telegram.sendDocument(
//             jid,
//             { source: buffer, filename },
//             { ...baseOpts, caption: "" }
//           );
//           aliasId(result);
//           print({ content: { document: docInput, caption: "" }, chat: jid }, conn, true);

//           // kirim caption sebagai teks terpisah mereply dokumen
//           const txtBuffer = Buffer.from(caption, 'utf-8');
//           const textRes = await conn.telegram.sendDocument(jid, {
//             source: txtBuffer,
//             filename: 'description.txt',
//           }, {
//             ...options,
//             caption: '📄 Caption terlalu panjang, dikirim sebagai file:',
//             reply_to_message_id: result.message_id,
//           });

//           aliasId(textRes);
//           print({ content: { document: 'conn.sendMessage caption terlalu panjang mengirim menjadi file.txt' }, chat: jid }, conn, true);
//         } else {
//           result = await conn.telegram.sendDocument(
//             jid,
//             { source: buffer, filename },
//             { ...baseOpts, caption }
//           );
//           aliasId(result);
//           print({ content: { document: docInput, caption }, chat: jid }, conn, true);
//         }
//         return result;
//       }

//       // STICKER (tidak ada caption)
//       if (sticker) {
//         const processedSticker = await processMediaInput(sticker);
//         const opts = { ...options };
//         const rid = resolveReplyTo(options.quoted);
//         if (rid) opts.reply_to_message_id = rid;

//         const result = await conn.telegram.sendSticker(jid, processedSticker, opts);
//         aliasId(result);
//         print({ content: { sticker }, chat: jid }, conn, true);
//         return result;
//       }

//       throw new Error("No valid content provided");
//     } catch (error) {
//       console.error('SendMessage error:', error.message);
//       throw error;
//     }
//   };
  
//   conn.editMessage = async (chatId, messageId, content, extra = {}) => {
//   try {
//     if (content.caption) {
//       return await conn.telegram.editMessageCaption(chatId, messageId, undefined, content.caption, extra)
//     } else if (content.text) {
//       return await conn.telegram.editMessageText(chatId, messageId, undefined, content.text, extra)
//     }
//   } catch (e) {
//     console.error("editMessage error:", e.message)
//     throw e
//   }
// }

// // conn.fakeReply = async (chatId, text = '', fakeJid, fakeText = '', fakeGroupJid, extra = {}) => {
// //   try {
// //     let fakeMsg = null

// //     if (fakeText && String(fakeText).trim().length > 0) {
// //       fakeMsg = await conn.telegram.sendMessage(chatId, fakeText, extra)
// //     }
// //     if (!text || String(text).trim().length === 0) {
// //       return fakeMsg
// //     }
// //     const replyOptions = { ...extra }
// //     if (fakeMsg) {
// //       replyOptions.reply_to_message_id = fakeMsg.message_id
// //     }

// //     return await conn.telegram.sendMessage(chatId, text, replyOptions)
// //   } catch (e) {
// //     console.error('fakeReply error:', e.message)
// //     throw e
// //   }
// // }

// conn.fakeReply = async (chatId, header = '', content = '', extra = {}) => {
//   try {
//     const msg = 
// `> ${header}

// ${content}`

//     return await conn.telegram.sendMessage(chatId, msg, {
//       parse_mode: "Markdown",
//       ...extra
//     })
//   } catch (e) {
//     console.error("fakeReply error:", e.message)
//     throw e
//   }
// }

// conn.deleteMessage = async (chatId, messageId) => {
//   try {
//     return await conn.telegram.deleteMessage(chatId, messageIds)
//   } catch (e) {
//     console.error("deleteMessage error:", e.message)
//     throw e
//   }
// }

//   conn.sendFile = async (jid, path, filename = "", caption = "", quoted, options = {}) => {
//     try {
//       if (!jid) throw new Error("Chat ID (jid) is required");

//       // Handle reply/quoted message
//       let reply_to_message_id;
//       if (quoted) {
//         if (quoted.key) reply_to_message_id = quoted.key.id;
//         else if (quoted.message_id) reply_to_message_id = quoted.message_id;
//         else if (typeof quoted === 'object') reply_to_message_id = quoted.id || quoted.msg_id || quoted.messageId;
//       }

//       const opts = {
//         caption,
//         ...options,
//         reply_to_message_id,
//       };

//       if (opts.parse_mode === false || opts.parse_mode === null) {
//         delete opts.parse_mode;
//       }

//       const fileInput = await processMediaInput(path);
//       const fileType = await getFileType(fileInput);
//       const MAX_SIZE = 49 * 1024 * 1024;

//       // Handle file terlalu besar
//       if (fileInput.length > MAX_SIZE) {
//         const compressedBuffer = await compressFile(fileInput);
//         if (compressedBuffer.length > MAX_SIZE) throw new Error("File too large even after compression");
//         return await conn.telegram.sendDocument(jid, {
//           source: compressedBuffer,
//           filename: filename || 'file.zip',
//         }, { ...opts, disable_content_type_detection: false });
//       }

//       let result;

//       // Jika caption terlalu panjang
//       if (caption && caption.length > MAX_CAPTION_LENGTH) {
//         // 1. Kirim file utama dulu TANPA caption
//         const mediaOpts = {
//           ...options,
//           caption: '',
//           reply_to_message_id,
//         };

//         switch (fileType) {
//           case 'image':
//             result = await conn.telegram.sendPhoto(jid, { source: fileInput }, mediaOpts);
//             break;
//           case 'video':
//             result = await conn.telegram.sendVideo(jid, { source: fileInput }, { ...mediaOpts, supports_streaming: true });
//             break;
//           case 'audio':
//             result = await conn.telegram.sendAudio(jid, { source: fileInput }, mediaOpts);
//             break;
//           case 'sticker':
//             result = await conn.telegram.sendSticker(jid, { source: fileInput }, mediaOpts);
//             break;
//           default:
//             result = await conn.telegram.sendDocument(jid, { source: fileInput, filename }, mediaOpts);
//         }

//         // 2. Kirim caption panjang sebagai file .txt
//         const txtBuffer = Buffer.from(caption, 'utf-8');
//         await conn.telegram.sendDocument(jid, {
//           source: txtBuffer,
//           filename: 'description.txt',
//         }, {
//           ...options,
//           caption: '📄 Caption terlalu panjang, dikirim sebagai file:',
//           reply_to_message_id: result.message_id,
//         });

//         return result;
//       }

//       // Jika caption normal, kirim biasa
//       switch (fileType) {
//         case 'image':
//   try {
//     result = await conn.telegram.sendPhoto(jid, { source: fileInput }, opts);
//   } catch (err) {
//     if (String(err).includes('message to be replied not found')) {
//       const { reply_to_message_id, ...safeOpts } = opts;
//       result = await conn.telegram.sendPhoto(jid, { source: fileInput }, safeOpts);
//     } else {
//       throw err;
//     }
//   }
//   break;
//         case 'video':
//           result = await conn.telegram.sendVideo(jid, { source: fileInput }, { ...opts, supports_streaming: true });
//           break;
//         case 'audio':
//           result = await conn.telegram.sendAudio(jid, { source: fileInput }, opts);
//           break;
//         case 'sticker':
//           result = await conn.telegram.sendSticker(jid, { source: fileInput }, opts);
//           break;
//         default:
//           result = await conn.telegram.sendDocument(jid, { source: fileInput, filename }, opts);
//       }
//       aliasId(result)
//       print({ content: { file: path, type: fileType, caption }, chat: jid }, conn, true);
//       return result;

//     } catch (error) {
//       console.error('SendFile error:', error.message);
//       throw error;
//     }
//   };

//   // Helper function to compress files
//   async function compressFile(buffer) {
//     const zlib = require('zlib')
//     const util = require('util')
//     const compress = util.promisify(zlib.gzip)

//     try {
//       return await compress(buffer)
//     } catch (err) {
//       console.error('Compression error:', err)
//       return buffer // Return original if compression fails
//     }
//   }
//   async function getFileType(buffer) {
//     if (buffer.length < 4) return 'document'

//     // Image formats
//     if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image' // JPEG
//     if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image' // PNG
//     if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image' // GIF

//     // Video formats
//     if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00 &&
//       (buffer[3] === 0x18 || buffer[3] === 0x20) &&
//       buffer.slice(4, 8).toString() === 'ftyp') return 'video' // MP4
//     if (buffer.slice(0, 3).toString() === 'FLV') return 'video'

//     // Audio formats
//     if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WAVE') return 'audio' // WAV
//     if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'audio' // MP3

//     // WebP/Sticker
//     if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'sticker'

//     return 'document'
//   }

//   conn.sendImage = async (jid, image, caption = "", quoted, options = {}) => {
//     try {
//       if (!jid || jid === "" || jid === undefined || jid === null) {
//         throw new Error("Chat ID (jid) is required and cannot be empty")
//       }

//       const processedImage = await processMediaInput(image)

//       const opts = {
//         caption,
//         // parse_mode: "Markdown",
//         ...options,
//       }
//       if (opts.parse_mode === false || opts.parse_mode === null) {
//         delete opts.parse_mode;
//       }
//       if (quoted && quoted.message_id) {
//         opts.reply_to_message_id = quoted.message_id
//       }

//       const result = await conn.telegram.sendPhoto(jid, processedImage, opts)
//       print({ content: { photo: image, caption }, chat: jid }, conn, true)
//       return result
//     } catch (error) {
//       console.error('SendImage error:', error.message)
//       throw error
//     }
//   }

//   conn.reply = async (jid, text, quoted, options = {}) => {
//     try {
//       if (!jid) return null;
//       if (!text) return null;

//       const messageText = String(text).trim();
//       if (!messageText || messageText === "undefined" || messageText === "null") return null;

//       const chatId = (typeof jid === 'object' && jid.id) ? jid.id : jid;

//       const opts = {
//         parse_mode: "Markdown",
//         ...options,
//       };
//       if (quoted) {
//         const replyId =
//           quoted.message_id ||
//           quoted.id ||
//           quoted.msg_id ||
//           quoted.messageId ||
//           quoted.message?.message_id ||
//           quoted.reply_to_message?.message_id ||
//           quoted.key?.id;
//         if (replyId) opts.reply_to_message_id = replyId;
//       }
//       if (options.parse_mode === false || options.parse_mode === null) {
//         delete opts.parse_mode;
//       }
//       if (/[\\_\[\]\(\)\*`~>#+\-=|{}\.!]/.test(messageText) && !options.parse_mode) {
//         delete opts.parse_mode;
//       }
//       const TEXT_LIMIT = MAX_CAPTION_LENGTH
//       if (messageText.length > TEXT_LIMIT) {
//         const txtBuffer = Buffer.from(messageText, 'utf-8');
//         const docRes = await conn.telegram.sendDocument(
//           chatId,
//           { source: txtBuffer, filename: 'description.txt' },
//           { ...opts, caption: '📄 Pesan terlalu panjang, dikirim sebagai file:' }
//         );
//         if (docRes && docRes.message_id != null) docRes.id = String(docRes.message_id);
//         print({ content: { document: 'reply text terlalu panjang -> file.txt' }, chat: chatId }, conn, true);
//         return docRes;
//       }
//       const result = await conn.telegram.sendMessage(chatId, messageText, opts);
//       if (result && result.message_id != null) result.id = String(result.message_id);
//       aliasId(result)
//       print({ content: { text: messageText }, chat: chatId }, conn, true);
//       return result;

//     } catch (error) {
//       console.error('Reply error:', error.message);
//       return null;
//     }
//   };

// const fs = require("fs");

// conn.sendButt = async (jid, content, buttons = [], quoted = null, options = {}) => {
//   try {
//     if (!jid || jid === "" || jid === undefined || jid === null) {
//       throw new Error("Chat ID (jid) is required and cannot be empty");
//     }

//     let messageText = "";
//     let imageUrl = null;
//     let videoUrl = null;
//     let documentUrl = null;
//     let parseMode = options.parse_mode;

//     if (typeof content === "string") {
//       messageText = content.trim();
//     } else if (typeof content === "object" && content !== null) {
//       messageText = content.text ? String(content.text).trim() : "";
//       imageUrl = content.image || content.photo || null;
//       videoUrl = content.video || null;
//       documentUrl = content.document || content.file || null;
//       parseMode = content.parseMode || content.parse_mode || options.parse_mode;
//     }

//     if (!imageUrl && options.photo) {
//       if (typeof options.photo === "string") {
//         imageUrl = options.photo;
//       } else if (options.photo.url) {
//         imageUrl = options.photo.url;
//       }
//     }

//     if (!messageText || messageText === "" || messageText === "undefined" || messageText === "null") {
//       return null;
//     }

//     let processedButtons = [];

//     if (Array.isArray(buttons)) {
//       processedButtons = buttons.map(row => {
//         if (Array.isArray(row)) {
//           return row.map(btn => {
//             if (typeof btn === "object" && btn !== null) {
//               if (btn.url) {
//                 return {
//                   text: btn.text || "Link",
//                   url: btn.url
//                 };
//               } else if (btn.callback_data) {
//                 return {
//                   text: btn.text || "Button",
//                   callback_data: btn.callback_data
//                 };
//               } else if (btn.text) {
//                 return {
//                   text: btn.text,
//                   callback_data: btn.callback_data || `btn_${Math.random().toString(36).substring(2, 9)}`
//                 };
//               }
//             }
//             return btn;
//           });
//         }
//         return row;
//       });

//       const lastElement = buttons[buttons.length - 1];
//       if (lastElement && lastElement.pagination) {
//         const { currentPage, totalPages } = lastElement.pagination;

//         const paginationRow = [];

//         if (currentPage > 1) {
//           paginationRow.push({
//             text: "◀️ Previous",
//             callback_data: `page_${currentPage - 1}`
//           });
//         }

//         paginationRow.push({
//           text: `${currentPage}/${totalPages}`,
//           callback_data: "current_page"
//         });

//         if (currentPage < totalPages) {
//           paginationRow.push({
//             text: "Next ▶️",
//             callback_data: `page_${currentPage + 1}`
//           });
//         }

//         processedButtons.push(paginationRow);
//       }
//     }

//     const opts = {
//       reply_markup: {
//         inline_keyboard: processedButtons
//       },
//       protect_content: !!options.protect_content // default false
//     };

//     if (parseMode === false || parseMode === null) {
//       delete opts.parse_mode;
//     } else if (parseMode) {
//       opts.parse_mode = parseMode;
//     }

//     if (quoted && quoted.message_id) {
//       opts.reply_to_message_id = quoted.message_id;
//     }

//     let result;

//     // === HANDLE VIDEO ===
//     if (videoUrl) {
//       let videoSource;
//       if (typeof videoUrl === "string") {
//         videoSource = fs.existsSync(videoUrl) ? { source: fs.createReadStream(videoUrl) } : videoUrl;
//       } else if (videoUrl.source || videoUrl.url) {
//         const src = videoUrl.source || videoUrl.url;
//         videoSource = fs.existsSync(src) ? { source: fs.createReadStream(src) } : src;
//       }

//       result = await conn.telegram.sendVideo(jid, videoSource, {
//         caption: messageText,
//         parse_mode: opts.parse_mode,
//         reply_markup: opts.reply_markup,
//         reply_to_message_id: opts.reply_to_message_id,
//         protect_content: opts.protect_content
//       });
//     }

//     // === HANDLE IMAGE ===
//     else if (imageUrl) {
//       let imageSource;
//       if (typeof imageUrl === "string") {
//         imageSource = fs.existsSync(imageUrl) ? { source: fs.createReadStream(imageUrl) } : imageUrl;
//       } else if (imageUrl.source || imageUrl.url) {
//         const src = imageUrl.source || imageUrl.url;
//         imageSource = fs.existsSync(src) ? { source: fs.createReadStream(src) } : src;
//       }

//       result = await conn.telegram.sendPhoto(jid, imageSource, {
//         caption: messageText,
//         parse_mode: opts.parse_mode,
//         reply_markup: opts.reply_markup,
//         reply_to_message_id: opts.reply_to_message_id,
//         protect_content: opts.protect_content
//       });
//     }

//     // === HANDLE DOCUMENT ===
//     else if (documentUrl) {
//       let docSource;
//       if (typeof documentUrl === "string") {
//         docSource = fs.existsSync(documentUrl) ? { source: fs.createReadStream(documentUrl) } : documentUrl;
//       } else if (documentUrl.source || documentUrl.url) {
//         const src = documentUrl.source || documentUrl.url;
//         docSource = fs.existsSync(src) ? { source: fs.createReadStream(src) } : src;
//       }

//       result = await conn.telegram.sendDocument(jid, docSource, {
//         caption: messageText,
//         parse_mode: opts.parse_mode,
//         reply_markup: opts.reply_markup,
//         reply_to_message_id: opts.reply_to_message_id,
//         protect_content: opts.protect_content
//       });
//     }

//     // === HANDLE TEXT ===
//     else {
//       result = await conn.telegram.sendMessage(jid, messageText, opts);
//     }

//     // Log hasil (optional)
//     if (typeof print === "function") {
//       print(
//         {
//           content: { text: messageText, image: imageUrl, video: videoUrl },
//           chat: jid
//         },
//         conn,
//         true
//       );
//     }

//     return result;

//   } catch (error) {
//     console.error("SendButt error:", error.message);
//     console.error("SendButt stack:", error.stack);
//     throw error;
//   }
// };

// conn.createButton = (text, options = {}) => {
//   const button = { text }
  
//   if (options.url) {
//     button.url = options.url
//   } else if (options.callback_data) {
//     button.callback_data = options.callback_data
//   } else {
//     button.callback_data = options.callback_data || `btn_${Math.random().toString(36).substring(2, 9)}`
//   }
  
//   return button
// }

// conn.createPagedData = (data, itemsPerPage = 5, currentPage = 1) => {
//   const totalItems = data.length
//   const totalPages = Math.ceil(totalItems / itemsPerPage)
//   const startIndex = (currentPage - 1) * itemsPerPage
//   const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
//   const pageData = data.slice(startIndex, endIndex)
  
//   return {
//     data: pageData,
//     pagination: {
//       currentPage,
//       totalPages,
//       itemsPerPage,
//       totalItems,
//       pageData
//     }
//   }
// }

// conn.sendAlbum = async (jid, media, caption, quoted, options = {}) => {
//   try {
//     if (!jid || jid === "" || jid === undefined || jid === null) {
//       throw new Error("Chat ID (jid) is required and cannot be empty")
//     }

//     // Validate media array
//     if (!Array.isArray(media) || media.length === 0) {
//       throw new Error("Media array is required and cannot be empty")
//     }

//     if (media.length > 10) {
//       throw new Error("Album can contain maximum 10 media items")
//     }

//     console.log('Processing media for album...')

//     // Process media array - UPLOAD FILES TO TELEGRAM FIRST
//     let processedMedia = []
    
//     for (let i = 0; i < media.length; i++) {
//       const item = media[i]
//       let mediaItem = {}
      
//       if (typeof item === 'string') {
//         // Simple URL/path string
//         mediaItem = {
//           type: detectMediaType(item),
//           media: await processMediaPath(conn, item, options.tempChatId)
//         }
//       } else if (typeof item === 'object' && item !== null) {
//         // Media object with properties
//         mediaItem = {
//           type: item.type || detectMediaType(item.media || item.url),
//           media: await processMediaPath(conn, item.media || item.url, options.tempChatId)
//         }
        
//         // Add caption only to first item or if specified
//         if (item.caption) {
//           mediaItem.caption = String(item.caption).trim()
//         }
        
//         // Add parse_mode if specified
//         if (item.parse_mode) {
//           mediaItem.parse_mode = item.parse_mode
//         }
//       } else {
//         throw new Error(`Invalid media item at index ${i}`)
//       }
      
//       // Validate media
//       if (!mediaItem.media) {
//         throw new Error(`Media is required for item at index ${i}`)
//       }
      
//       // Validate media type - only photo and video allowed
//       if (!['photo', 'video'].includes(mediaItem.type)) {
//         throw new Error(`Invalid media type '${mediaItem.type}' at index ${i}. Only 'photo' and 'video' are supported in albums`)
//       }
      
//       processedMedia.push(mediaItem)
//     }

//     // Add caption to first media item if provided as separate parameter
//     if (caption && typeof caption === 'string' && caption.trim() !== '') {
//       if (!processedMedia[0].caption) {
//         processedMedia[0].caption = caption.trim()
//       }
//     }

//     // Process options
//     const opts = {
//       ...options
//     }

//     // Remove tempChatId from final options
//     delete opts.tempChatId

//     // Add reply reference if quoted message exists
//     if (quoted && quoted.message_id) {
//       opts.reply_to_message_id = quoted.message_id
//     }

//     // Handle parse_mode for first item if not set
//     if (options.parse_mode && !processedMedia[0].parse_mode) {
//       processedMedia[0].parse_mode = options.parse_mode
//     }

//     console.log('Sending album with processed URLs...')

//     // Send media group
//     const result = await conn.telegram.sendMediaGroup(jid, processedMedia, opts)

//     print({ 
//       content: { 
//         type: 'album',
//         media: processedMedia,
//         caption: caption || processedMedia[0]?.caption 
//       }, 
//       chat: jid 
//     }, conn, true)
    
//     return result

//   } catch (error) {
//     console.error('SendAlbum error:', error.message)
//     return null
//   }
// }


// // Helper function untuk upload file lokal ke Telegram dan mendapatkan URL
// async function uploadToTelegram(conn, filePath, tempChatId = null) {
//   try {
//     if (!fs.existsSync(filePath)) {
//       throw new Error(`File not found: ${filePath}`)
//     }
    
//     // Gunakan chat ID sementara untuk upload (bisa chat owner/admin)
//     const uploadChatId = tempChatId || conn.user?.id || 'me'
    
//     // Detect file type
//     const ext = filePath.split('.').pop().toLowerCase()
//     const isVideo = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp'].includes(ext)
    
//     let result
//     if (isVideo) {
//       // Upload as video
//       result = await conn.telegram.sendVideo(uploadChatId, fs.createReadStream(filePath), {
//         caption: '_temp_upload_'
//       })
//     } else {
//       // Upload as photo
//       result = await conn.telegram.sendPhoto(uploadChatId, fs.createReadStream(filePath), {
//         caption: '_temp_upload_'
//       })
//     }
    
//     // Extract URL from uploaded media
//     let fileUrl = null
//     if (isVideo && result.video) {
//       fileUrl = await conn.telegram.getFileLink(result.video.file_id)
//     } else if (!isVideo && result.photo && result.photo.length > 0) {
//       // Ambil photo dengan resolusi tertinggi
//       const largestPhoto = result.photo.reduce((prev, current) => 
//         (prev.file_size > current.file_size) ? prev : current
//       )
//       fileUrl = await conn.telegram.getFileLink(largestPhoto.file_id)
//     }
    
//     // Delete temporary message
//     try {
//       await conn.telegram.deleteMessage(uploadChatId, result.message_id)
//     } catch (deleteError) {
//       console.warn('Could not delete temp upload message:', deleteError.message)
//     }
    
//     return fileUrl?.href || fileUrl
    
//   } catch (error) {
//     console.error(`Error uploading ${filePath} to Telegram:`, error.message)
//     return null
//   }
// }

// // Helper function untuk memproses media path/URL
// async function processMediaPath(conn, pathOrUrl, tempChatId = null) {
//   if (!pathOrUrl || typeof pathOrUrl !== 'string') {
//     return pathOrUrl
//   }
  
//   // Jika URL (http/https), return as is
//   if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
//     return pathOrUrl
//   }
  
//   // Jika file lokal, upload ke Telegram dulu
//   console.log(`Uploading local file to Telegram: ${pathOrUrl}`)
//   const uploadedUrl = await uploadToTelegram(conn, pathOrUrl, tempChatId)
  
//   if (uploadedUrl) {
//     console.log(`Successfully uploaded: ${pathOrUrl} -> ${uploadedUrl}`)
//     return uploadedUrl
//   }
  
//   // Fallback return original path
//   console.warn(`Failed to upload: ${pathOrUrl}, using original path`)
//   return pathOrUrl
// }

// // Helper function to detect media type (photo or video only)
// function detectMediaType(urlOrPath) {
//   if (!urlOrPath || typeof urlOrPath !== 'string') {
//     return 'photo' // default to photo
//   }
  
//   const pathLower = urlOrPath.toLowerCase()
  
//   // Check for video extensions (works for both URL and local path)
//   if (pathLower.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp)(\?.*)?$/)) {
//     return 'video'
//   }
  
//   // Default to photo for everything else (including jpg, png, gif, etc.)
//   return 'photo'
// }

// // Utility functions for creating album media
// conn.createPhoto = (pathOrUrl, caption, parse_mode) => {
//   return {
//     type: 'photo',
//     media: pathOrUrl, // Will be processed by processMediaPath
//     caption: caption,
//     parse_mode: parse_mode
//   }
// }

// conn.createVideo = (pathOrUrl, caption, parse_mode) => {
//   return {
//     type: 'video',
//     media: pathOrUrl, // Will be processed by processMediaPath
//     caption: caption,
//     parse_mode: parse_mode
//   }
// }

// // Helper untuk membuat album dari array URL sederhana
// conn.createAlbumFromUrls = (urls, captions = []) => {
//   return urls.map((url, index) => {
//     const type = detectMediaType(url)
//     return {
//       type: type,
//       media: url,
//       caption: captions[index] || undefined
//     }
//   })
// }

//   conn.getName = (jid) => {
//     return jid ? jid.toString() : "Unknown"
//   }

//   conn.parseMention = (text) => {
//     if (!text) return []
//     return [...text.matchAll(/@(\d+)/g)].map((v) => v[1])
//   }

//   conn.user = {
//     jid: conn.botInfo?.id || 0,
//   }

//   conn.on('message', (ctx, next) => {
//     ctx.download = () => downloadFromMessage(ctx)
//     ctx.quoted = ctx.reply_to_message
//     next()
//   })

//   return conn
// }



/**
 * simple.js (FULL)
 * - Wrapper Telegraf biar mirip "conn" style bot multi-platform
 * - Fix: BUTTON_TYPE_INVALID (web_app di group -> fallback url)
 * - Fix: sanitize options (buang quoted/field non-Telegram sebelum dikirim)
 * - Fix: deleteMessage typo (messageIds -> messageId)
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { InputFile } = require("telegraf");

let print = null;
try {
  print = require("./print");
} catch {}

const { getMimeType } = require("./getMime");

const MAX_CAPTION_LENGTH = 1024; // Telegram caption limit
const MAX_TEXT_LENGTH = 4096;    // Telegram message text limit
const MAX_FILE_SIZE = 49 * 1024 * 1024;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const isUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const isFilePath = (str) => {
  if (typeof str !== "string") return false;
  if (isUrl(str)) return false;
  return fs.existsSync(str);
};

const isBuffer = (input) => Buffer.isBuffer(input);

function sanitizeTgExtra(extra = {}) {
  const e = { ...extra };
  // buang field yang bukan Telegram API / bikin payload jadi error
  delete e.quoted;
  delete e.contextInfo;
  delete e.ephemeralExpiration;
  delete e.forwardingScore;
  delete e.is_forwarded;
  delete e.message;
  delete e.msg;
  delete e.key;
  delete e.sender;
  delete e.chat;
  delete e.from;
  delete e.replyTo;
  return e;
}

function resolveReplyTo(quoted) {
  if (!quoted) return undefined;
  return (
    quoted.message_id ||
    quoted.id ||
    quoted.msg_id ||
    quoted.messageId ||
    quoted?.key?.id ||
    undefined
  );
}

const downloadMedia = async (url) => {
  const response = await axios({
    method: "GET",
    url,
    responseType: "arraybuffer",
    timeout: 200000,
    headers: {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
    maxRedirects: 5,
  });
  return Buffer.from(response.data);
};

const processMediaInput = async (input) => {
  if (isBuffer(input)) return input;

  // url string
  if (typeof input === "string" && isUrl(input)) {
    return await downloadMedia(input);
  }

  // object with url
  if (input && typeof input === "object" && typeof input.url === "string" && isUrl(input.url)) {
    return await downloadMedia(input.url);
  }

  // filepath string
  if (typeof input === "string" && isFilePath(input)) {
    return fs.readFileSync(input);
  }

  // passthrough
  return input;
};

const downloadFromMessage = async (ctx) => {
  try {
    if (!ctx.reply_to_message) return null;
    const quoted = ctx.reply_to_message;

    const getFile = async () => {
      if (quoted.photo) {
        const fileId = quoted.photo[quoted.photo.length - 1].file_id;
        return await ctx.telegram.getFile(fileId);
      }
      if (quoted.video) return await ctx.telegram.getFile(quoted.video.file_id);
      if (quoted.audio) return await ctx.telegram.getFile(quoted.audio.file_id);
      if (quoted.document) return await ctx.telegram.getFile(quoted.document.file_id);
      if (quoted.sticker) return await ctx.telegram.getFile(quoted.sticker.file_id);
      return null;
    };

    const file = await getFile();
    if (!file) return null;

    const response = await axios({
      method: "GET",
      url: `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`,
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data);
  } catch (e) {
    console.error("Download error:", e?.message || e);
    return null;
  }
};

function aliasId(r) {
  if (r && r.message_id != null && r.id == null) r.id = String(r.message_id);
  return r;
}

// ---- vCard helpers ----
const buildVCard = ({ first_name, last_name, phone_number, org, title }) => {
  const fn = [first_name, last_name].filter(Boolean).join(" ").trim() || "Contact";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fn}`,
    `N:${last_name || ""};${first_name || ""};;;`,
    org ? `ORG:${org}` : null,
    title ? `TITLE:${title}` : null,
    `TEL;TYPE=CELL:${phone_number}`,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
};

const normalizeContact = (c, defaults = {}) => {
  if (typeof c === "string" || typeof c === "number") {
    return {
      phone_number: String(c).trim(),
      first_name: defaults.first_name || "Contact",
      last_name: defaults.last_name || "",
      vcard: undefined,
    };
  }

  const phone = String(c.phone_number || c.phone || c.number || c.num || "").trim();

  return {
    phone_number: phone,
    first_name: (c.first_name || c.name || defaults.first_name || "Contact").toString(),
    last_name: (c.last_name || defaults.last_name || "").toString(),
    vcard: c.vcard,
  };
};

// ---- file type detection (buffer) ----
async function getFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return "document";

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image";
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image";
  // GIF
  if (buffer.slice(0, 3).toString() === "GIF") return "image";

  // MP4 (ftyp)
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x00 &&
    (buffer[3] === 0x18 || buffer[3] === 0x20) &&
    buffer.slice(4, 8).toString() === "ftyp"
  ) {
    return "video";
  }

  // FLV
  if (buffer.slice(0, 3).toString() === "FLV") return "video";

  // WAV
  if (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WAVE") return "audio";

  // MP3
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return "audio";

  // WEBP sticker
  if (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP") return "sticker";

  return "document";
}

// ---- gzip fallback for big file (simple compress) ----
async function compressFile(buffer) {
  const zlib = require("zlib");
  const util = require("util");
  const compress = util.promisify(zlib.gzip);
  try {
    return await compress(buffer);
  } catch {
    return buffer;
  }
}

// ---- album upload helpers ----
function detectMediaType(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== "string") return "photo";
  const s = urlOrPath.toLowerCase();
  if (s.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp)(\?.*)?$/)) return "video";
  return "photo";
}

async function uploadToTelegram(conn, filePath, tempChatId = null) {
  try {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const uploadChatId = tempChatId || conn.user?.id;

    const ext = filePath.split(".").pop().toLowerCase();
    const isVideo = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v", "3gp"].includes(ext);

    let result;
    if (isVideo) {
      result = await conn.telegram.sendVideo(uploadChatId, fs.createReadStream(filePath), {
        caption: "_temp_upload_",
      });
    } else {
      result = await conn.telegram.sendPhoto(uploadChatId, fs.createReadStream(filePath), {
        caption: "_temp_upload_",
      });
    }

    let fileUrl = null;
    if (isVideo && result.video) {
      fileUrl = await conn.telegram.getFileLink(result.video.file_id);
    } else if (!isVideo && result.photo && result.photo.length > 0) {
      const largest = result.photo.reduce((p, c) => (p.file_size > c.file_size ? p : c));
      fileUrl = await conn.telegram.getFileLink(largest.file_id);
    }

    try {
      await conn.telegram.deleteMessage(uploadChatId, result.message_id);
    } catch {}

    return fileUrl?.href || fileUrl;
  } catch (e) {
    console.error(`uploadToTelegram error:`, e?.message || e);
    return null;
  }
}

async function processMediaPath(conn, pathOrUrl, tempChatId = null) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return pathOrUrl;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;

  const uploadedUrl = await uploadToTelegram(conn, pathOrUrl, tempChatId);
  if (uploadedUrl) return uploadedUrl;
  return pathOrUrl;
}

module.exports = (conn) => {
  // init botInfo/user
  conn.telegram.getMe().then((bot) => {
    conn.botInfo = bot;
    conn.user = {
      jid: String(bot.id),
      id: String(bot.id),
      username: bot.username || "",
      first_name: bot.first_name || "",
      type: "bot",
    };
  });

  // group metadata
  conn.groupMetadata = async function (chatId) {
    const jid = chatId;
    const chat = await this.telegram.getChat(jid);

    let admins = [];
    try {
      admins = await this.telegram.getChatAdministrators(jid);
    } catch {
      admins = [];
    }

    let memberCount = null;
    try {
      // catatan: method telegraf biasanya getChatMembersCount (tanpa s)
      if (typeof this.telegram.getChatMembersCount === "function") {
        memberCount = await this.telegram.getChatMembersCount(jid);
      } else if (typeof this.telegram.getChatMemberCount === "function") {
        memberCount = await this.telegram.getChatMemberCount(jid);
      }
    } catch {
      memberCount = null;
    }

    const participants = admins.map((a) => ({
      id: a.user.id,
      username: a.user.username || null,
      first_name: a.user.first_name || null,
      last_name: a.user.last_name || null,
      admin: a.status === "administrator" || a.status === "creator" || "member",
      isCreator: a.status === "creator",
      status: a.status,
      can_manage_chat: a.can_manage_chat ?? undefined,
      can_delete_messages: a.can_delete_messages ?? undefined,
      can_manage_video_chats: a.can_manage_video_chats ?? undefined,
      can_restrict_members: a.can_restrict_members ?? undefined,
      can_promote_members: a.can_promote_members ?? undefined,
    }));

    return {
      id: chat.id,
      type: chat.type,
      subject: chat.title || chat.username || null,
      description: chat.description || null,
      is_forum: !!chat.is_forum,
      invite_link: chat.invite_link || null,
      photo: chat.photo ? { small: chat.photo.small_file_id, big: chat.photo.big_file_id } : null,
      size: memberCount,
      participants,
    };
  };

  // sendContact
  conn.sendContact = async (jid, contacts, caption, quoted, options = {}) => {
    try {
      if (typeof caption === "object" && caption && !quoted) {
        options = caption;
        caption = undefined;
        quoted = undefined;
      } else if (typeof quoted === "object" && quoted && !options) {
        options = quoted;
        quoted = undefined;
      }

      const list = Array.isArray(contacts) ? contacts : [contacts];
      if (!list.length) return null;

      const seen = new Set();
      const normalized = list
        .map((c) => normalizeContact(c, { first_name: options.default_name }))
        .filter((c) => c.phone_number && !seen.has(c.phone_number) && seen.add(c.phone_number));

      const replyId = resolveReplyTo(quoted);
      let captionMsg = null;

      if (caption) {
        captionMsg = await conn.telegram.sendMessage(jid, caption, {
          reply_to_message_id: replyId,
          allow_sending_without_reply: true,
          parse_mode: options.caption_parse_mode || options.parse_mode || undefined,
          disable_web_page_preview: true,
        });
      }

      const results = [];
      for (let i = 0; i < normalized.length; i++) {
        const c = normalized[i];
        const extra = sanitizeTgExtra({
          reply_to_message_id: captionMsg?.message_id ?? (i === 0 ? replyId : undefined),
          allow_sending_without_reply: true,
          ...options,
        });

        delete extra.caption_parse_mode;

        let vcard = c.vcard;
        if (!vcard && options.auto_vcard) {
          vcard = buildVCard({
            first_name: c.first_name,
            last_name: c.last_name,
            phone_number: c.phone_number,
            org: options.vcard_org,
            title: options.vcard_title,
          });
        }
        if (vcard) extra.vcard = vcard;
        if (c.last_name) extra.last_name = c.last_name;

        await delay(500);
        const res = await conn.telegram.sendContact(jid, c.phone_number, c.first_name, extra);
        results.push(res);
      }

      try {
        typeof print === "function" &&
          print({ content: { contacts: normalized }, chat: jid }, conn, true);
      } catch {}

      return results.length === 1 ? results[0] : results;
    } catch (err) {
      console.error("SendContact error:", err?.message || err);
      // fallback kirim caption saja kalau ada
      if (caption) {
        await conn.telegram.sendMessage(jid, caption, {
          reply_to_message_id: resolveReplyTo(quoted),
          allow_sending_without_reply: true,
        });
      }
      return null;
    }
  };

  // shorthand
  conn.sendPhoto = async (chatId, photo, options = {}) => {
    const opts = sanitizeTgExtra(options);
    return await conn.telegram.sendPhoto(chatId, photo, opts);
  };

  // sendMessage (unified)
  conn.sendMessage = async (jid, content, options = {}) => {
    try {
      if (!jid) throw new Error("Chat ID (jid) is required");
      if (!content || typeof content !== "object") throw new Error("Invalid content object");

      // DELETE
      if (content.delete) {
        try {
          let msgId;
          if (typeof content.delete === "object") {
            msgId =
              content.delete.message_id ||
              content.delete.id ||
              content.delete.key?.id ||
              content.delete.key?.message_id;
          } else {
            msgId = content.delete;
          }
          if (!msgId) throw new Error("Invalid delete target");

          await conn.telegram.deleteMessage(jid, msgId);
          return { deleted: true, id: String(msgId) };
        } catch (err) {
          console.error("DeleteMessage error:", err?.message || err);
          return null;
        }
      }

      // EDIT
      if (content.edit) {
        let msgId;
        if (typeof content.edit === "object") {
          msgId =
            content.edit.message_id ||
            content.edit.id ||
            content.edit.key?.id ||
            content.edit.key?.message_id;
        } else {
          msgId = content.edit;
        }

        const newText = String(content.text || "").trim();
        if (!msgId || !newText) throw new Error("Invalid edit target or empty text");

        const opts = sanitizeTgExtra(options);
        const res = await conn.telegram.editMessageText(jid, msgId, undefined, newText, opts);
        return res;
      }

      const safeOptions = sanitizeTgExtra(options);
      const rid = resolveReplyTo(options.quoted);
      if (rid) safeOptions.reply_to_message_id = rid;

      const { text, photo, image, video, audio, document, sticker } = content;

      // TEXT
      if (text) {
        const messageText = String(text).trim();
        if (!messageText || messageText === "undefined" || messageText === "null") return null;

        // jika terlalu panjang -> kirim .txt
        if (messageText.length > MAX_TEXT_LENGTH) {
          const txtBuffer = Buffer.from(messageText, "utf-8");
          const docRes = await conn.telegram.sendDocument(
            jid,
            { source: txtBuffer, filename: "description.txt" },
            { ...safeOptions, caption: "📄 Pesan terlalu panjang, dikirim sebagai file:" }
          );
          aliasId(docRes);
          try {
            typeof print === "function" &&
              print({ content: { document: "text too long -> description.txt" }, chat: jid }, conn, true);
          } catch {}
          return docRes;
        }

        const res = await conn.telegram.sendMessage(jid, messageText, safeOptions);
        aliasId(res);
        try {
          typeof print === "function" && print({ content: { text: messageText }, chat: jid }, conn, true);
        } catch {}
        return res;
      }

      // PHOTO / IMAGE
      if (photo || image) {
        const input = photo || image;
        const caption = String(content.caption || "");

        const inputIsUrl =
          (typeof input === "string" && isUrl(input)) ||
          (input && typeof input === "object" && typeof input.url === "string" && isUrl(input.url));

        const sendPhoto = async (cap) => {
          if (inputIsUrl) {
            const url = typeof input === "string" ? input : input.url;
            return conn.telegram.sendPhoto(jid, url, { ...safeOptions, caption: cap });
          }
          const buf = await processMediaInput(input);
          return conn.telegram.sendPhoto(jid, { source: buf, filename: "image.jpg" }, { ...safeOptions, caption: cap });
        };

        // caption panjang -> foto tanpa caption + kirim .txt
        if (caption && caption.length > MAX_CAPTION_LENGTH) {
          const res = await sendPhoto("");
          aliasId(res);

          const txtBuffer = Buffer.from(caption, "utf-8");
          const docRes = await conn.telegram.sendDocument(
            jid,
            { source: txtBuffer, filename: "description.txt" },
            { ...safeOptions, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: res.message_id }
          );
          aliasId(docRes);
          return res;
        }

        const res = await sendPhoto(caption);
        aliasId(res);
        try {
          typeof print === "function" && print({ content: { photo: input, caption }, chat: jid }, conn, true);
        } catch {}
        return res;
      }

      // VIDEO
      if (video) {
        const input = video;
        const caption = String(content.caption || "");

        const inputIsUrl =
          (typeof input === "string" && isUrl(input)) ||
          (input && typeof input === "object" && typeof input.url === "string" && isUrl(input.url));

        const sendVideo = async (cap) => {
          if (inputIsUrl) {
            const url = typeof input === "string" ? input : input.url;
            return conn.telegram.sendVideo(jid, url, { ...safeOptions, caption: cap, supports_streaming: true });
          }
          const buf = await processMediaInput(input);
          return conn.telegram.sendVideo(
            jid,
            { source: buf, filename: "video.mp4" },
            { ...safeOptions, caption: cap, supports_streaming: true }
          );
        };

        if (caption && caption.length > MAX_CAPTION_LENGTH) {
          const res = await sendVideo("");
          aliasId(res);

          const txtBuffer = Buffer.from(caption, "utf-8");
          const docRes = await conn.telegram.sendDocument(
            jid,
            { source: txtBuffer, filename: "description.txt" },
            { ...safeOptions, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: res.message_id }
          );
          aliasId(docRes);
          return res;
        }

        const res = await sendVideo(caption);
        aliasId(res);
        try {
          typeof print === "function" && print({ content: { video: input, caption }, chat: jid }, conn, true);
        } catch {}
        return res;
      }

      // AUDIO
      if (audio) {
        const input = audio;
        const caption = String(content.caption || "");

        const inputIsUrl =
          (typeof input === "string" && isUrl(input)) ||
          (input && typeof input === "object" && typeof input.url === "string" && isUrl(input.url));

        const base = { ...safeOptions };
        if (content.performer) base.performer = content.performer;
        if (content.title) base.title = content.title;
        if (content.duration) base.duration = content.duration;

        const sendAudio = async (cap) => {
          if (inputIsUrl) {
            const url = typeof input === "string" ? input : input.url;
            // kadang url bukan audio content-type -> fallback buffer
            try {
              const probe = await axios.get(url, { responseType: "stream", maxRedirects: 2 });
              const ct = probe.headers["content-type"] || "";
              if (/^audio\//i.test(ct)) return conn.telegram.sendAudio(jid, url, { ...base, caption: cap });
            } catch {}
            const buf = await processMediaInput(url);
            return conn.telegram.sendAudio(jid, { source: buf, filename: "audio.mp3" }, { ...base, caption: cap });
          }

          const buf = await processMediaInput(input);
          return conn.telegram.sendAudio(jid, { source: buf, filename: "audio.mp3" }, { ...base, caption: cap });
        };

        if (caption && caption.length > MAX_CAPTION_LENGTH) {
          const res = await sendAudio("");
          aliasId(res);

          const txtBuffer = Buffer.from(caption, "utf-8");
          const docRes = await conn.telegram.sendDocument(
            jid,
            { source: txtBuffer, filename: "description.txt" },
            { ...safeOptions, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: res.message_id }
          );
          aliasId(docRes);
          return res;
        }

        const res = await sendAudio(caption);
        aliasId(res);
        return res;
      }

      // DOCUMENT
      if (document) {
        const input = document;
        const caption = String(content.caption || "");

        const inputIsUrl =
          (typeof input === "string" && isUrl(input)) ||
          (input && typeof input === "object" && typeof input.url === "string" && isUrl(input.url));

        let buffer;
        let filename = content.fileName || "document.bin";

        if (inputIsUrl) buffer = await processMediaInput(typeof input === "string" ? input : input.url);
        else buffer = await processMediaInput(input);

        try {
          const mime = content.mimetype || getMimeType(buffer) || "application/octet-stream";
          const ext = mime.split("/")[1] || "bin";
          filename = content.fileName || `document.${ext}`;
        } catch {}

        const sendDoc = async (cap) => {
          return conn.telegram.sendDocument(jid, { source: buffer, filename }, { ...safeOptions, caption: cap });
        };

        if (caption && caption.length > MAX_CAPTION_LENGTH) {
          const res = await sendDoc("");
          aliasId(res);

          const txtBuffer = Buffer.from(caption, "utf-8");
          const docRes = await conn.telegram.sendDocument(
            jid,
            { source: txtBuffer, filename: "description.txt" },
            { ...safeOptions, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: res.message_id }
          );
          aliasId(docRes);
          return res;
        }

        const res = await sendDoc(caption);
        aliasId(res);
        return res;
      }

      // STICKER
      if (sticker) {
        const buf = await processMediaInput(sticker);
        const res = await conn.telegram.sendSticker(jid, buf, safeOptions);
        aliasId(res);
        return res;
      }

      throw new Error("No valid content provided");
    } catch (e) {
      console.error("SendMessage error:", e?.message || e);
      throw e;
    }
  };

  // editMessage helper
  conn.editMessage = async (chatId, messageId, content, extra = {}) => {
    try {
      const opts = sanitizeTgExtra(extra);
      if (content.caption != null) {
        return await conn.telegram.editMessageCaption(chatId, messageId, undefined, content.caption, opts);
      }
      if (content.text != null) {
        return await conn.telegram.editMessageText(chatId, messageId, undefined, content.text, opts);
      }
      return null;
    } catch (e) {
      console.error("editMessage error:", e?.message || e);
      throw e;
    }
  };

  // fakeReply (markdown quote style)
  conn.fakeReply = async (chatId, header = "", content = "", extra = {}) => {
    const msg = `> ${header}\n\n${content}`;
    const opts = sanitizeTgExtra(extra);
    return await conn.telegram.sendMessage(chatId, msg, { parse_mode: "Markdown", ...opts });
  };

  // deleteMessage (FIXED)
  conn.deleteMessage = async (chatId, messageId) => {
    try {
      return await conn.telegram.deleteMessage(chatId, messageId);
    } catch (e) {
      console.error("deleteMessage error:", e?.message || e);
      throw e;
    }
  };

  // sendFile (local/url/buffer)
  conn.sendFile = async (jid, filePathOrUrlOrBuf, filename = "", caption = "", quoted, options = {}) => {
    try {
      if (!jid) throw new Error("Chat ID (jid) is required");

      const opts = sanitizeTgExtra(options);
      const rid = resolveReplyTo(quoted);
      if (rid) opts.reply_to_message_id = rid;

      let fileBuf = await processMediaInput(filePathOrUrlOrBuf);

      // jika hasilnya masih string url (passthrough), kirim sebagai document via url
      if (typeof fileBuf === "string" && isUrl(fileBuf)) {
        return await conn.telegram.sendDocument(jid, fileBuf, { ...opts, caption: caption || "" });
      }

      if (!Buffer.isBuffer(fileBuf)) {
        // fallback: kalau input sudah cocok untuk telegraf (InputFile etc)
        return await conn.telegram.sendDocument(jid, fileBuf, { ...opts, caption: caption || "" });
      }

      // file terlalu besar -> gzip (simple)
      if (fileBuf.length > MAX_FILE_SIZE) {
        const compressed = await compressFile(fileBuf);
        if (compressed.length > MAX_FILE_SIZE) throw new Error("File too large even after compression");
        const res = await conn.telegram.sendDocument(
          jid,
          { source: compressed, filename: filename || "file.gz" },
          { ...opts, caption: caption || "" }
        );
        aliasId(res);
        return res;
      }

      const type = await getFileType(fileBuf);
      let sendRes = null;

      // caption kepanjangan: kirim media tanpa caption + kirim txt
      if (caption && caption.length > MAX_CAPTION_LENGTH) {
        const mediaOpts = { ...opts, caption: "" };

        if (type === "image") sendRes = await conn.telegram.sendPhoto(jid, { source: fileBuf }, mediaOpts);
        else if (type === "video") sendRes = await conn.telegram.sendVideo(jid, { source: fileBuf }, { ...mediaOpts, supports_streaming: true });
        else if (type === "audio") sendRes = await conn.telegram.sendAudio(jid, { source: fileBuf }, mediaOpts);
        else if (type === "sticker") sendRes = await conn.telegram.sendSticker(jid, { source: fileBuf }, mediaOpts);
        else sendRes = await conn.telegram.sendDocument(jid, { source: fileBuf, filename: filename || "file.bin" }, mediaOpts);

        aliasId(sendRes);

        const txtBuffer = Buffer.from(caption, "utf-8");
        await conn.telegram.sendDocument(
          jid,
          { source: txtBuffer, filename: "description.txt" },
          { ...opts, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: sendRes.message_id }
        );

        return sendRes;
      }

      // normal
      if (type === "image") sendRes = await conn.telegram.sendPhoto(jid, { source: fileBuf }, { ...opts, caption: caption || "" });
      else if (type === "video") sendRes = await conn.telegram.sendVideo(jid, { source: fileBuf }, { ...opts, caption: caption || "", supports_streaming: true });
      else if (type === "audio") sendRes = await conn.telegram.sendAudio(jid, { source: fileBuf }, { ...opts, caption: caption || "" });
      else if (type === "sticker") sendRes = await conn.telegram.sendSticker(jid, { source: fileBuf }, opts);
      else sendRes = await conn.telegram.sendDocument(jid, { source: fileBuf, filename: filename || "file.bin" }, { ...opts, caption: caption || "" });

      aliasId(sendRes);
      try {
        typeof print === "function" && print({ content: { file: filePathOrUrlOrBuf, type, caption }, chat: jid }, conn, true);
      } catch {}
      return sendRes;
    } catch (e) {
      console.error("SendFile error:", e?.message || e);
      throw e;
    }
  };

  // sendImage (shortcut)
  conn.sendImage = async (jid, image, caption = "", quoted, options = {}) => {
    const buf = await processMediaInput(image);
    const opts = sanitizeTgExtra(options);
    const rid = resolveReplyTo(quoted);
    if (rid) opts.reply_to_message_id = rid;
    const res = await conn.telegram.sendPhoto(jid, buf, { ...opts, caption });
    aliasId(res);
    return res;
  };

  // reply (markdown-safe-ish)
  conn.reply = async (jid, text, quoted, options = {}) => {
    if (!jid) return null;
    if (text == null) return null;

    const messageText = String(text).trim();
    if (!messageText || messageText === "undefined" || messageText === "null") return null;

    const chatId = typeof jid === "object" && jid.id ? jid.id : jid;

    const opts = sanitizeTgExtra({ parse_mode: "Markdown", ...options });
    const rid = resolveReplyTo(quoted);
    if (rid) opts.reply_to_message_id = rid;

    // kalau user kirim markdown aneh, auto nonaktifkan parse_mode
    if (/[\\_\[\]\(\)\*`~>#+\-=|{}\.!]/.test(messageText) && !options.parse_mode) {
      delete opts.parse_mode;
    }

    if (messageText.length > MAX_TEXT_LENGTH) {
      const txtBuffer = Buffer.from(messageText, "utf-8");
      const docRes = await conn.telegram.sendDocument(
        chatId,
        { source: txtBuffer, filename: "description.txt" },
        { ...opts, caption: "📄 Pesan terlalu panjang, dikirim sebagai file:" }
      );
      aliasId(docRes);
      return docRes;
    }

    const res = await conn.telegram.sendMessage(chatId, messageText, opts);
    aliasId(res);
    return res;
  };

  /**
   * sendButt
   * - Support: url, callback_data, web_app
   * - Fix: web_app invalid in group => fallback to url (gunakan options.isGroup)
   */
  conn.sendButt = async (jid, content, buttons = [], quoted = null, options = {}) => {
    try {
      if (!jid) throw new Error("Chat ID (jid) is required");

      let messageText = "";
      let imageUrl = null;
      let videoUrl = null;
      let documentUrl = null;
      let parseMode = options.parse_mode;

      if (typeof content === "string") {
        messageText = content.trim();
      } else if (typeof content === "object" && content !== null) {
        messageText = content.text ? String(content.text).trim() : "";
        imageUrl = content.image || content.photo || null;
        videoUrl = content.video || null;
        documentUrl = content.document || content.file || null;
        parseMode = content.parseMode || content.parse_mode || options.parse_mode;
      }

      if (!messageText || messageText === "undefined" || messageText === "null") return null;

      const isGroup = !!options.isGroup;

      let processedButtons = [];
      if (Array.isArray(buttons)) {
        processedButtons = buttons.map((row) => {
          if (!Array.isArray(row)) return row;
          return row.map((btn) => {
            if (typeof btn !== "object" || btn === null) return btn;

            // ✅ web_app support + fallback group->url
            if (btn.web_app && btn.web_app.url) {
              if (isGroup) return { text: btn.text || "Mini App", url: btn.web_app.url };
              return { text: btn.text || "Mini App", web_app: { url: btn.web_app.url } };
            }

            if (btn.url) return { text: btn.text || "Link", url: btn.url };
            if (btn.callback_data) return { text: btn.text || "Button", callback_data: btn.callback_data };

            if (btn.text) {
              return {
                text: btn.text,
                callback_data: btn.callback_data || `btn_${Math.random().toString(36).slice(2, 9)}`,
              };
            }
            return btn;
          });
        });
      }

      const safeOptions = sanitizeTgExtra(options);

      const opts = {
        reply_markup: { inline_keyboard: processedButtons },
        protect_content: !!safeOptions.protect_content,
      };

      if (parseMode === false || parseMode === null) {
        // no parse_mode
      } else if (parseMode) {
        opts.parse_mode = parseMode;
      }

      const rid = resolveReplyTo(quoted || options.quoted);
      if (rid) opts.reply_to_message_id = rid;

      let res;

      // VIDEO
      if (videoUrl) {
        let videoSource = videoUrl;
        if (typeof videoUrl === "string" && fs.existsSync(videoUrl)) {
          videoSource = { source: fs.createReadStream(videoUrl) };
        } else if (videoUrl && typeof videoUrl === "object") {
          const src = videoUrl.source || videoUrl.url;
          if (src && typeof src === "string" && fs.existsSync(src)) videoSource = { source: fs.createReadStream(src) };
          else if (src) videoSource = src;
        }

        res = await conn.telegram.sendVideo(jid, videoSource, {
          caption: messageText,
          parse_mode: opts.parse_mode,
          reply_markup: opts.reply_markup,
          reply_to_message_id: opts.reply_to_message_id,
          protect_content: opts.protect_content,
          supports_streaming: true,
        });
      }

      // IMAGE
      else if (imageUrl) {
        let imageSource = imageUrl;
        if (typeof imageUrl === "string" && fs.existsSync(imageUrl)) {
          imageSource = { source: fs.createReadStream(imageUrl) };
        } else if (imageUrl && typeof imageUrl === "object") {
          const src = imageUrl.source || imageUrl.url;
          if (src && typeof src === "string" && fs.existsSync(src)) imageSource = { source: fs.createReadStream(src) };
          else if (src) imageSource = src;
        }

        res = await conn.telegram.sendPhoto(jid, imageSource, {
          caption: messageText,
          parse_mode: opts.parse_mode,
          reply_markup: opts.reply_markup,
          reply_to_message_id: opts.reply_to_message_id,
          protect_content: opts.protect_content,
        });
      }

      // DOCUMENT
      else if (documentUrl) {
        let docSource = documentUrl;
        if (typeof documentUrl === "string" && fs.existsSync(documentUrl)) {
          docSource = { source: fs.createReadStream(documentUrl) };
        } else if (documentUrl && typeof documentUrl === "object") {
          const src = documentUrl.source || documentUrl.url;
          if (src && typeof src === "string" && fs.existsSync(src)) docSource = { source: fs.createReadStream(src) };
          else if (src) docSource = src;
        }

        res = await conn.telegram.sendDocument(jid, docSource, {
          caption: messageText,
          parse_mode: opts.parse_mode,
          reply_markup: opts.reply_markup,
          reply_to_message_id: opts.reply_to_message_id,
          protect_content: opts.protect_content,
        });
      }

      // TEXT
      else {
        res = await conn.telegram.sendMessage(jid, messageText, opts);
      }

      aliasId(res);

      try {
        typeof print === "function" &&
          print({ content: { text: messageText }, chat: jid }, conn, true);
      } catch {}

      return res;
    } catch (e) {
      console.error("SendButt error:", e?.message || e);
      throw e;
    }
  };

  // buttons helpers
  conn.createButton = (text, options = {}) => {
    const b = { text };
    if (options.url) b.url = options.url;
    else if (options.web_app && options.web_app.url) b.web_app = { url: options.web_app.url };
    else b.callback_data = options.callback_data || `btn_${Math.random().toString(36).slice(2, 9)}`;
    return b;
  };

  conn.createPagedData = (data, itemsPerPage = 5, currentPage = 1) => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pageData = data.slice(startIndex, endIndex);

    return {
      data: pageData,
      pagination: { currentPage, totalPages, itemsPerPage, totalItems, pageData },
    };
  };

  // albums
  conn.sendAlbum = async (jid, media, caption, quoted, options = {}) => {
    try {
      if (!jid) throw new Error("Chat ID (jid) is required");
      if (!Array.isArray(media) || media.length === 0) throw new Error("Media array is required");
      if (media.length > 10) throw new Error("Album max 10 items");

      let processedMedia = [];
      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        let mediaItem = {};

        if (typeof item === "string") {
          mediaItem = {
            type: detectMediaType(item),
            media: await processMediaPath(conn, item, options.tempChatId),
          };
        } else if (typeof item === "object" && item !== null) {
          const src = item.media || item.url;
          mediaItem = {
            type: item.type || detectMediaType(src),
            media: await processMediaPath(conn, src, options.tempChatId),
          };
          if (item.caption) mediaItem.caption = String(item.caption).trim();
          if (item.parse_mode) mediaItem.parse_mode = item.parse_mode;
        } else {
          throw new Error(`Invalid media item at index ${i}`);
        }

        if (!["photo", "video"].includes(mediaItem.type)) {
          throw new Error(`Invalid media type '${mediaItem.type}' at index ${i}`);
        }

        processedMedia.push(mediaItem);
      }

      // caption to first item if provided
      if (caption && typeof caption === "string" && caption.trim() !== "") {
        if (!processedMedia[0].caption) processedMedia[0].caption = caption.trim();
      }

      const opts = sanitizeTgExtra({ ...options });
      delete opts.tempChatId;

      const rid = resolveReplyTo(quoted || options.quoted);
      if (rid) opts.reply_to_message_id = rid;

      // parse_mode for first item if options.parse_mode exists
      if (opts.parse_mode && !processedMedia[0].parse_mode) {
        processedMedia[0].parse_mode = opts.parse_mode;
      }

      const res = await conn.telegram.sendMediaGroup(jid, processedMedia, opts);
      return res;
    } catch (e) {
      console.error("SendAlbum error:", e?.message || e);
      return null;
    }
  };

  // create media objects for album
  conn.createPhoto = (pathOrUrl, caption, parse_mode) => ({
    type: "photo",
    media: pathOrUrl,
    caption,
    parse_mode,
  });

  conn.createVideo = (pathOrUrl, caption, parse_mode) => ({
    type: "video",
    media: pathOrUrl,
    caption,
    parse_mode,
  });

  conn.createAlbumFromUrls = (urls, captions = []) => {
    return urls.map((url, i) => ({
      type: detectMediaType(url),
      media: url,
      caption: captions[i] || undefined,
    }));
  };

  // misc
  conn.getName = (jid) => (jid ? jid.toString() : "Unknown");

  conn.parseMention = (text) => {
    if (!text) return [];
    return [...text.matchAll(/@(\d+)/g)].map((v) => v[1]);
  };

  // inject helpers into ctx
  conn.on("message", (ctx, next) => {
    ctx.download = () => downloadFromMessage(ctx);
    ctx.quoted = ctx.reply_to_message;
    next();
  });

  return conn;
};




// const fs = require("fs");
// const path = require("path");
// const axios = require("axios");

// const { getMimeType } = require("./getMime");

// let print = null;
// try {
//   print = require("./print");
// } catch {}

// const TEXT_LIMIT = 4096;
// const CAPTION_LIMIT = 1024;

// const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// const isUrl = (str) => {
//   try {
//     new URL(str);
//     return true;
//   } catch {
//     return false;
//   }
// };

// const isFilePath = (str) => typeof str === "string" && !isUrl(str) && fs.existsSync(str);
// const isBuffer = (v) => Buffer.isBuffer(v);

// const aliasId = (r) => {
//   if (r && r.message_id != null && r.id == null) r.id = String(r.message_id);
//   return r;
// };

// const resolveReplyTo = (q) =>
//   q?.message_id || q?.id || q?.msg_id || q?.messageId || q?.key?.id || undefined;

// const safePrint = (payload, conn) => {
//   try {
//     if (typeof print === "function") print(payload, conn, true);
//   } catch {}
// };

// async function downloadMedia(url) {
//   const res = await axios.get(url, { responseType: "arraybuffer", timeout: 200000, maxRedirects: 5 });
//   return Buffer.from(res.data);
// }

// async function processMediaInput(input) {
//   if (isBuffer(input)) return input;

//   if (typeof input === "string" && isUrl(input)) return downloadMedia(input);
//   if (typeof input === "string" && isFilePath(input)) return fs.readFileSync(input);

//   if (input && typeof input === "object" && typeof input.url === "string" && isUrl(input.url)) {
//     return downloadMedia(input.url);
//   }

//   return input;
// }

// async function downloadFromMessage(ctx) {
//   try {
//     const q = ctx?.message?.reply_to_message;
//     if (!q) return null;

//     const pickFileId = () => {
//       if (q.photo?.length) return q.photo[q.photo.length - 1].file_id;
//       if (q.video) return q.video.file_id;
//       if (q.audio) return q.audio.file_id;
//       if (q.document) return q.document.file_id;
//       if (q.sticker) return q.sticker.file_id;
//       return null;
//     };

//     const fileId = pickFileId();
//     if (!fileId) return null;

//     const file = await ctx.telegram.getFile(fileId);
//     const dl = await axios.get(`https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`, {
//       responseType: "arraybuffer",
//     });
//     return Buffer.from(dl.data);
//   } catch {
//     return null;
//   }
// }

// async function getFileType(buffer) {
//   if (!Buffer.isBuffer(buffer) || buffer.length < 4) return "document";

//   if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image";
//   if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image";
//   if (buffer.slice(0, 3).toString() === "GIF") return "image";

//   if (
//     buffer[0] === 0x00 &&
//     buffer[1] === 0x00 &&
//     buffer[2] === 0x00 &&
//     (buffer[3] === 0x18 || buffer[3] === 0x20) &&
//     buffer.slice(4, 8).toString() === "ftyp"
//   )
//     return "video";

//   if (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WAVE") return "audio";
//   if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return "audio";

//   if (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP") return "sticker";

//   return "document";
// }

// function setupJidMapping(conn, opts = {}) {
//   const MAP_FILE = opts.file || path.join(process.cwd(), "data", "jidmap.json");
//   const CONSOLE_ONLY = !!opts.consoleOnly; // true => ga nulis file sama sekali

//   const ensureDir = () => {
//     const dir = path.dirname(MAP_FILE);
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//   };

//   const isWaJid = (jid) => typeof jid === "string" && /@(s\.whatsapp\.net|g\.us|lid)$/.test(jid);

//   const normalizeWaJid = (jid) => {
//     jid = String(jid || "").trim();
//     if (!jid) return jid;
//     if (/^\d{5,20}$/.test(jid)) return `${jid}@s.whatsapp.net`;
//     return jid;
//   };

//   const loadMap = () => {
//     if (CONSOLE_ONLY) return { users: {}, groups: {} };
//     try {
//       if (!fs.existsSync(MAP_FILE)) return { users: {}, groups: {} };
//       const json = JSON.parse(fs.readFileSync(MAP_FILE, "utf-8"));
//       return { users: json?.users || {}, groups: json?.groups || {} };
//     } catch {
//       return { users: {}, groups: {} };
//     }
//   };

//   const saveMap = () => {
//     if (CONSOLE_ONLY) return; // NOOP
//     ensureDir();
//     fs.writeFileSync(MAP_FILE, JSON.stringify(conn.jidMap, null, 2));
//   };

//   conn.jidMap = conn.jidMap || loadMap();

//   conn.registerJid = (waJid, tgChatId) => {
//     waJid = normalizeWaJid(waJid);
//     if (!isWaJid(waJid)) throw new Error("Invalid WA jid (pakai @s.whatsapp.net / @g.us)");
//     const chatId = Number(tgChatId);
//     if (!Number.isFinite(chatId)) throw new Error("Invalid telegram chatId");

//     if (waJid.endsWith("@g.us")) conn.jidMap.groups[waJid] = chatId;
//     else conn.jidMap.users[waJid] = chatId;

//     saveMap();

//     console.log("[MAP] WA -> TG:", waJid, "=>", chatId, CONSOLE_ONLY ? "(consoleOnly)" : "(saved)");
//     return { waJid, chatId };
//   };

//   conn.unbindJid = (waJid) => {
//     waJid = normalizeWaJid(waJid);
//     if (waJid.endsWith("@g.us")) delete conn.jidMap.groups[waJid];
//     else delete conn.jidMap.users[waJid];
//     saveMap();
//     console.log("[UNMAP] WA:", waJid, CONSOLE_ONLY ? "(consoleOnly)" : "(saved)");
//     return true;
//   };

//   // return null kalau WA jid belum dimap (biar caller bisa skip)
//   conn.resolveChatId = (jid, { strict = false } = {}) => {
//     if (typeof jid === "number") return jid;
//     if (typeof jid === "string" && /^-?\d+$/.test(jid)) return Number(jid);

//     const wa = normalizeWaJid(jid);
//     if (isWaJid(wa)) {
//       const table = wa.endsWith("@g.us") ? conn.jidMap.groups : conn.jidMap.users;
//       const mapped = table[wa];

//       if (mapped == null) {
//         if (strict) throw new Error(`WA jid belum di-map: ${wa}`);
//         return null;
//       }
//       return mapped;
//     }

//     // kalau username tg @xxx jangan dipakai untuk getChat. telegraf butuh chat_id numeric.
//     return jid;
//   };

//   conn.getMapped = () => conn.jidMap;
//   conn.saveMap = saveMap;
//   conn.isWaJid = isWaJid;
//   conn.normalizeWaJid = normalizeWaJid;

//   return conn;
// }

// const buildVCard = ({ first_name, last_name, phone_number, org, title }) => {
//   const fn = [first_name, last_name].filter(Boolean).join(" ").trim() || "Contact";
//   return [
//     "BEGIN:VCARD",
//     "VERSION:3.0",
//     `FN:${fn}`,
//     `N:${last_name || ""};${first_name || ""};;;`,
//     org ? `ORG:${org}` : null,
//     title ? `TITLE:${title}` : null,
//     `TEL;TYPE=CELL:${phone_number}`,
//     "END:VCARD",
//   ]
//     .filter(Boolean)
//     .join("\n");
// };

// const normalizeContact = (c, defaults = {}) => {
//   if (typeof c === "string" || typeof c === "number") {
//     return { phone_number: String(c).trim(), first_name: defaults.first_name || "Contact", last_name: "", vcard: undefined };
//   }
//   const phone = String(c.phone_number || c.phone || c.number || "").trim();
//   return {
//     phone_number: phone,
//     first_name: String(c.first_name || c.name || defaults.first_name || "Contact"),
//     last_name: String(c.last_name || ""),
//     vcard: c.vcard,
//   };
// };

// function detectMediaType(u) {
//   const v = String(u || "").toLowerCase();
//   if (v.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp)(\?.*)?$/)) return "video";
//   return "photo";
// }

// async function uploadToTelegram(conn, filePath, tempChatId = null) {
//   try {
//     if (!fs.existsSync(filePath)) throw new Error("File not found");
//     const uploadChatId = tempChatId || conn.user?.id || "me";

//     const ext = filePath.split(".").pop().toLowerCase();
//     const isVideo = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v", "3gp"].includes(ext);

//     let res;
//     if (isVideo) res = await conn.telegram.sendVideo(uploadChatId, fs.createReadStream(filePath), { caption: "_temp_" });
//     else res = await conn.telegram.sendPhoto(uploadChatId, fs.createReadStream(filePath), { caption: "_temp_" });

//     let link;
//     if (isVideo && res.video) link = await conn.telegram.getFileLink(res.video.file_id);
//     if (!isVideo && res.photo?.length) {
//       const largest = res.photo.reduce((p, c) => ((p.file_size || 0) > (c.file_size || 0) ? p : c));
//       link = await conn.telegram.getFileLink(largest.file_id);
//     }

//     try {
//       await conn.telegram.deleteMessage(uploadChatId, res.message_id);
//     } catch {}

//     return link?.href || link || null;
//   } catch {
//     return null;
//   }
// }

// async function processMediaPath(conn, pathOrUrl, tempChatId = null) {
//   if (typeof pathOrUrl !== "string") return pathOrUrl;
//   if (isUrl(pathOrUrl)) return pathOrUrl;
//   const up = await uploadToTelegram(conn, pathOrUrl, tempChatId);
//   return up || pathOrUrl;
// }

// module.exports = (conn) => {
//   conn.telegram.getMe().then((bot) => {
//     conn.botInfo = bot;
//     conn.user = {
//       jid: String(bot.id),
//       id: String(bot.id),
//       username: bot.username || "",
//       first_name: bot.first_name || "",
//       type: "bot",
//     };
//   });

//   setupJidMapping(conn, { file: "./data/jidmap.json", consoleOnly: true });

//   conn.groupMetadata = async (chatId) => {
//   const resolved = conn.resolveChatId(chatId); // strict=false default
//   if (resolved == null) {
//     console.log("[SKIP] groupMetadata: WA jid not mapped:", chatId);
//     throw new Error("WA jid belum dimap ke Telegram chatId");
//   }

//   const chat = await conn.telegram.getChat(resolved);
//   let admins = [];
//   try {
//     admins = await conn.telegram.getChatAdministrators(resolved);
//   } catch {}

//   let count = null;
//   try {
//     count = await conn.telegram.getChatMemberCount(resolved);
//   } catch {}

//   const participants = admins.map((a) => ({
//     id: a.user.id,
//     username: a.user.username || null,
//     first_name: a.user.first_name || null,
//     last_name: a.user.last_name || null,
//     status: a.status,
//     isCreator: a.status === "creator",
//   }));

//   return {
//     id: chat.id,
//     type: chat.type,
//     subject: chat.title || chat.username || null,
//     description: chat.description || null,
//     size: count,
//     participants,
//   };
// };

//   conn.sendMessage = async (jid, content, options = {}) => {
//     const chatId = conn.resolveChatId(jid);
//     if (!content || typeof content !== "object") throw new Error("content harus object");

//     const base = { ...options };
//     const rid = resolveReplyTo(options.quoted);
//     if (rid) base.reply_to_message_id = rid;
//     delete base.quoted;

//     const sendCaptionAsTxt = async (replyToMsgId, cap) => {
//       const buf = Buffer.from(String(cap), "utf-8");
//       return conn.telegram.sendDocument(
//         chatId,
//         { source: buf, filename: "description.txt" },
//         { ...base, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: replyToMsgId }
//       );
//     };
//     if (content.delete) {
//       const mid =
//         typeof content.delete === "object"
//           ? content.delete.message_id || content.delete.id || content.delete.key?.id
//           : content.delete;
//       if (!mid) throw new Error("delete target invalid");
//       await conn.telegram.deleteMessage(chatId, mid);
//       return { deleted: true, id: mid };
//     }
//     if (content.edit) {
//       const mid =
//         typeof content.edit === "object"
//           ? content.edit.message_id || content.edit.id || content.edit.key?.id
//           : content.edit;
//       const newText = String(content.text || "").trim();
//       if (!mid || !newText) throw new Error("edit target/text invalid");
//       const res = await conn.telegram.editMessageText(chatId, mid, undefined, newText, base);
//       return aliasId(res);
//     }
//     if (content.text != null) {
//       const t = String(content.text).trim();
//       if (!t) return null;

//       if (t.length > TEXT_LIMIT) {
//         const buf = Buffer.from(t, "utf-8");
//         const res = await conn.telegram.sendDocument(
//           chatId,
//           { source: buf, filename: "description.txt" },
//           { ...base, caption: "📄 Pesan terlalu panjang, dikirim sebagai file:" }
//         );
//         aliasId(res);
//         safePrint({ content: { text: "too_long->file" }, chat: chatId }, conn);
//         return res;
//       }

//       const res = await conn.telegram.sendMessage(chatId, t, base);
//       aliasId(res);
//       safePrint({ content: { text: t }, chat: chatId }, conn);
//       return res;
//     }
//     if (content.photo || content.image) {
//       const inp = content.photo || content.image;
//       const cap = String(content.caption || "");
//       const isU = typeof inp === "string" && isUrl(inp);

//       if (cap && cap.length > CAPTION_LIMIT) {
//         const msg = isU
//           ? await conn.telegram.sendPhoto(chatId, inp, { ...base, caption: "" })
//           : await conn.telegram.sendPhoto(chatId, { source: await processMediaInput(inp), filename: "image.jpg" }, { ...base, caption: "" });
//         aliasId(msg);
//         await sendCaptionAsTxt(msg.message_id, cap);
//         return msg;
//       }

//       const res = isU
//         ? await conn.telegram.sendPhoto(chatId, inp, { ...base, caption: cap })
//         : await conn.telegram.sendPhoto(chatId, { source: await processMediaInput(inp), filename: "image.jpg" }, { ...base, caption: cap });

//       aliasId(res);
//       return res;
//     }
//     if (content.video) {
//       const inp = content.video;
//       const cap = String(content.caption || "");
//       const isU = typeof inp === "string" && isUrl(inp);

//       if (cap && cap.length > CAPTION_LIMIT) {
//         const msg = isU
//           ? await conn.telegram.sendVideo(chatId, inp, { ...base, caption: "", supports_streaming: true })
//           : await conn.telegram.sendVideo(chatId, { source: await processMediaInput(inp), filename: "video.mp4" }, { ...base, caption: "", supports_streaming: true });
//         aliasId(msg);
//         await sendCaptionAsTxt(msg.message_id, cap);
//         return msg;
//       }

//       const res = isU
//         ? await conn.telegram.sendVideo(chatId, inp, { ...base, caption: cap, supports_streaming: true })
//         : await conn.telegram.sendVideo(chatId, { source: await processMediaInput(inp), filename: "video.mp4" }, { ...base, caption: cap, supports_streaming: true });

//       aliasId(res);
//       return res;
//     }
//     if (content.audio) {
//       const inp = content.audio;
//       const cap = String(content.caption || "");
//       const isU = typeof inp === "string" && isUrl(inp);

//       if (cap && cap.length > CAPTION_LIMIT) {
//         const msg = isU
//           ? await conn.telegram.sendAudio(chatId, inp, { ...base, caption: "" })
//           : await conn.telegram.sendAudio(chatId, { source: await processMediaInput(inp), filename: "audio.mp3" }, { ...base, caption: "" });
//         aliasId(msg);
//         await sendCaptionAsTxt(msg.message_id, cap);
//         return msg;
//       }

//       const res = isU
//         ? await conn.telegram.sendAudio(chatId, inp, { ...base, caption: cap })
//         : await conn.telegram.sendAudio(chatId, { source: await processMediaInput(inp), filename: "audio.mp3" }, { ...base, caption: cap });

//       aliasId(res);
//       return res;
//     }
//     if (content.document) {
//       const inp = content.document;
//       const cap = String(content.caption || "");

//       const buf = await processMediaInput(inp);
//       let filename = content.fileName || "file.bin";

//       try {
//         const mime = content.mimetype || getMimeType(buf) || "application/octet-stream";
//         const ext = mime.split("/")[1] || "bin";
//         filename = content.fileName || `document.${ext}`;
//       } catch {}

//       if (cap && cap.length > CAPTION_LIMIT) {
//         const msg = await conn.telegram.sendDocument(chatId, { source: buf, filename }, { ...base, caption: "" });
//         aliasId(msg);
//         await sendCaptionAsTxt(msg.message_id, cap);
//         return msg;
//       }

//       const res = await conn.telegram.sendDocument(chatId, { source: buf, filename }, { ...base, caption: cap });
//       aliasId(res);
//       return res;
//     }
//     if (content.sticker) {
//       const buf = await processMediaInput(content.sticker);
//       const res = await conn.telegram.sendSticker(chatId, buf, base);
//       aliasId(res);
//       return res;
//     }

//     throw new Error("content tidak valid");
//   };

//   conn.reply = async (jid, text, quoted, options = {}) => {
//     const chatId = conn.resolveChatId(jid);
//     const t = String(text || "").trim();
//     if (!t) return null;

//     const opts = { ...options };
//     const rid = resolveReplyTo(quoted);
//     if (rid) opts.reply_to_message_id = rid;

//     if (t.length > TEXT_LIMIT) {
//       const buf = Buffer.from(t, "utf-8");
//       const res = await conn.telegram.sendDocument(
//         chatId,
//         { source: buf, filename: "description.txt" },
//         { ...opts, caption: "📄 Pesan terlalu panjang, dikirim sebagai file:" }
//       );
//       return aliasId(res);
//     }

//     const res = await conn.telegram.sendMessage(chatId, t, opts);
//     return aliasId(res);
//   };

//   conn.sendFile = async (jid, input, filename = "", caption = "", quoted, options = {}) => {
//     const chatId = conn.resolveChatId(jid);
//     const rid = resolveReplyTo(quoted);

//     const buf = await processMediaInput(input);
//     const type = await getFileType(buf);

//     const opts = { ...options };
//     if (rid) opts.reply_to_message_id = rid;

//     const cap = String(caption || "");

//     const sendCaptionAsTxt = async (replyToMsgId) => {
//       const b = Buffer.from(cap, "utf-8");
//       await conn.telegram.sendDocument(
//         chatId,
//         { source: b, filename: "description.txt" },
//         { ...opts, caption: "📄 Caption terlalu panjang, dikirim sebagai file:", reply_to_message_id: replyToMsgId }
//       );
//     };
//     if (cap && cap.length > CAPTION_LIMIT) {
//       let msg;
//       if (type === "image") msg = await conn.telegram.sendPhoto(chatId, { source: buf, filename: filename || "image.jpg" }, { ...opts, caption: "" });
//       else if (type === "video") msg = await conn.telegram.sendVideo(chatId, { source: buf, filename: filename || "video.mp4" }, { ...opts, caption: "", supports_streaming: true });
//       else if (type === "audio") msg = await conn.telegram.sendAudio(chatId, { source: buf, filename: filename || "audio.mp3" }, { ...opts, caption: "" });
//       else if (type === "sticker") msg = await conn.telegram.sendSticker(chatId, buf, opts);
//       else msg = await conn.telegram.sendDocument(chatId, { source: buf, filename: filename || "file.bin" }, { ...opts, caption: "" });

//       aliasId(msg);
//       await sendCaptionAsTxt(msg.message_id);
//       return msg;
//     }

//     if (type === "image") return aliasId(await conn.telegram.sendPhoto(chatId, { source: buf, filename: filename || "image.jpg" }, { ...opts, caption: cap }));
//     if (type === "video") return aliasId(await conn.telegram.sendVideo(chatId, { source: buf, filename: filename || "video.mp4" }, { ...opts, caption: cap, supports_streaming: true }));
//     if (type === "audio") return aliasId(await conn.telegram.sendAudio(chatId, { source: buf, filename: filename || "audio.mp3" }, { ...opts, caption: cap }));
//     if (type === "sticker") return aliasId(await conn.telegram.sendSticker(chatId, buf, opts));
//     return aliasId(await conn.telegram.sendDocument(chatId, { source: buf, filename: filename || "file.bin" }, { ...opts, caption: cap }));
//   };

//   conn.sendContact = async (jid, contacts, caption, quoted, options = {}) => {
//     const chatId = conn.resolveChatId(jid);

//     const list = Array.isArray(contacts) ? contacts : [contacts];
//     if (!list.length) return null;

//     const rid = resolveReplyTo(quoted);
//     let captionMsg = null;
//     if (caption) {
//       captionMsg = await conn.telegram.sendMessage(chatId, String(caption), {
//         reply_to_message_id: rid,
//         allow_sending_without_reply: true,
//         parse_mode: options.caption_parse_mode || options.parse_mode || undefined,
//         disable_web_page_preview: true,
//       });
//     }

//     const resList = [];
//     for (let i = 0; i < list.length; i++) {
//       const c = normalizeContact(list[i], { first_name: options.default_name || "Contact" });
//       if (!c.phone_number) continue;

//       const extra = { ...options };
//       delete extra.caption_parse_mode;

//       extra.reply_to_message_id = captionMsg?.message_id ?? (i === 0 ? rid : undefined);
//       extra.allow_sending_without_reply = true;

//       if (options.auto_vcard && !c.vcard) {
//         c.vcard = buildVCard({
//           first_name: c.first_name,
//           last_name: c.last_name,
//           phone_number: c.phone_number,
//           org: options.vcard_org,
//           title: options.vcard_title,
//         });
//       }
//       if (c.vcard) extra.vcard = c.vcard;
//       if (c.last_name) extra.last_name = c.last_name;

//       if (options.delay_each_contact_ms) await delay(Number(options.delay_each_contact_ms) || 0);

//       const sent = await conn.telegram.sendContact(chatId, c.phone_number, c.first_name, extra);
//       resList.push(aliasId(sent));
//     }

//     return resList.length === 1 ? resList[0] : resList;
//   };

//   conn.sendButt = async (jid, content, buttons = [], quoted = null, options = {}) => {
//     const chatId = conn.resolveChatId(jid);

//     const text = typeof content === "string" ? content : String(content?.text || "");
//     if (!text.trim()) return null;

//     const rid = resolveReplyTo(quoted);

//     const inline_keyboard = (Array.isArray(buttons) ? buttons : []).map((row) =>
//       (Array.isArray(row) ? row : []).map((btn) => {
//         if (btn?.url) return { text: btn.text || "Link", url: btn.url };
//         if (btn?.callback_data) return { text: btn.text || "Button", callback_data: btn.callback_data };
//         if (btn?.text) return { text: btn.text, callback_data: btn.callback_data || `btn_${Math.random().toString(36).slice(2, 9)}` };
//         return { text: String(btn), callback_data: `btn_${Math.random().toString(36).slice(2, 9)}` };
//       })
//     );

//     const opts = {
//       ...options,
//       reply_markup: { inline_keyboard },
//     };
//     if (rid) opts.reply_to_message_id = rid;

//     return aliasId(await conn.telegram.sendMessage(chatId, text, opts));
//   };

//   conn.sendAlbum = async (jid, media, caption, quoted, options = {}) => {
//     const chatId = conn.resolveChatId(jid);

//     if (!Array.isArray(media) || !media.length) throw new Error("media harus array");
//     if (media.length > 10) throw new Error("album max 10 item");

//     const rid = resolveReplyTo(quoted);

//     const group = [];
//     for (let i = 0; i < media.length; i++) {
//       const item = media[i];

//       if (typeof item === "string") {
//         const type = detectMediaType(item);
//         const src = await processMediaPath(conn, item, options.tempChatId);
//         group.push({ type, media: src });
//         continue;
//       }

//       if (item && typeof item === "object") {
//         const type = item.type || detectMediaType(item.media || item.url);
//         const src = await processMediaPath(conn, item.media || item.url, options.tempChatId);
//         const payload = { type, media: src };
//         if (item.caption) payload.caption = String(item.caption);
//         if (item.parse_mode) payload.parse_mode = item.parse_mode;
//         group.push(payload);
//         continue;
//       }

//       throw new Error(`media item invalid index ${i}`);
//     }

//     if (caption && !group[0].caption) group[0].caption = String(caption);

//     const opts = { ...options };
//     delete opts.tempChatId;
//     if (rid) opts.reply_to_message_id = rid;

//     return conn.telegram.sendMediaGroup(chatId, group, opts);
//   };

//   if (!conn.__simple_mw_attached) {
//     conn.__simple_mw_attached = true;

//     conn.on("message", async (ctx, next) => {
//       // helper
//       ctx.download = () => downloadFromMessage(ctx);
//       ctx.quoted = ctx.message?.reply_to_message;

//       const text = ctx.message?.text || "";
//       const chatId = ctx.chat?.id;

//       if (/^\/bind(\s+|$)/i.test(text)) {
//         const arg = text.split(/\s+/)[1];
//         if (!arg) return ctx.reply("Format: /bind 628xxxxxxxxx atau 628xx@s.whatsapp.net");
//         try {
//           const waJid = /^\d+$/.test(arg) ? `${arg}@s.whatsapp.net` : arg;
//           conn.registerJid(waJid, chatId);
//           return ctx.reply(`✅ Mapped: ${waJid} -> ${chatId}`);
//         } catch (e) {
//           return ctx.reply(`❌ Gagal bind: ${e.message}`);
//         }
//       }

//       if (/^\/unbind(\s+|$)/i.test(text)) {
//         const arg = text.split(/\s+/)[1];
//         if (!arg) return ctx.reply("Format: /unbind 628xxxxxxxxx atau 628xx@s.whatsapp.net");
//         try {
//           const waJid = /^\d+$/.test(arg) ? `${arg}@s.whatsapp.net` : arg;
//           conn.unbindJid(waJid);
//           return ctx.reply(`🗑️ Unbind: ${waJid}`);
//         } catch (e) {
//           return ctx.reply(`❌ Gagal unbind: ${e.message}`);
//         }
//       }
      
//       if (/^\/map$/i.test(text)) {
//         const map = conn.getMapped();
//         const users = Object.entries(map.users).map(([k, v]) => `- ${k} -> ${v}`).join("\n") || "- (kosong)";
//         const groups = Object.entries(map.groups).map(([k, v]) => `- ${k} -> ${v}`).join("\n") || "- (kosong)";
//         return ctx.reply(`📌 USERS:\n${users}\n\n📌 GROUPS:\n${groups}`);
//       }

//       return next();
//     });
//   }

//   return conn;
// };
