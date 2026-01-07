let handler = async (m, { conn, args }) => {
  const pageArg = parseInt(args && args[0], 10)
  const page = isNaN(pageArg) || pageArg < 1 ? 1 : pageArg

  // Ambil user ID pengirim (m.sender sudah langsung ID number)
  // Untuk anonymous admin, gunakan ID khusus: 1087968824 atau 136817688
  const senderId = m.from?.id || m.sender
  
  // Debug anonymous
  console.log('=== SENDER INFO ===')
  console.log('senderId:', senderId)
  console.log('Is Anonymous?:', senderId === 1087968824 || senderId === 136817688)
  console.log('===================')
  
  // Jika anonymous admin, skip validasi button (allow semua admin)
  const isAnonymous = senderId === 1087968824 || senderId === 136817688
  
  await sendMediaPage(conn, m.chat, page, m, senderId, isAnonymous)
}

handler.help = ['asups']
handler.tags = ['owner']
handler.command = /^(asups)$/i

handler.premium = false
handler.limit = false
handler.level = false
handler.group = true
handler.register = true
handler.owner = true

// ============================================
// CALLBACK HANDLER - SESUAI STRUKTUR BARU
// ============================================
handler.callback = async (ctx) => {
  // PERBAIKAN: Ambil data dengan aman sesuai struktur main.js
  const data = ctx?.callbackQuery?.data || ctx?.data
  const conn = ctx.conn
  
  console.log('[ASUPS CALLBACK] Received:', data)
  
  // Filter hanya callback untuk asupp_
  if (!data || !data.startsWith('asupp_')) {
    console.log('[ASUPS CALLBACK] Not for this plugin, skipping')
    return false // Bukan untuk plugin ini
  }

  const chatId = ctx?.callbackQuery?.message?.chat?.id
  if (!chatId) {
    console.log('[ASUPS] No chatId found')
    return false
  }

  // Ambil ID user yang klik button
  const clickerId = ctx?.callbackQuery?.from?.id

  try {
    // ===== HANDLE BUTTON CURRENT PAGE =====
    if (data.startsWith('asupp_page_current_')) {
      const parts = data.replace('asupp_page_current_', '').split('_')
      const currentPage = parts[0]
      const senderId = parts[1]
      
      // Validasi: hanya pengirim atau anonymous yang bisa klik
      const isAnonymous = clickerId === 1087968824 || clickerId === 136817688
      if (!isAnonymous && clickerId !== Number(senderId) && senderId !== 'anon') {
        // Answer callback dengan safe method
        if (ctx.answerCbQuery) {
          await ctx.answerCbQuery('❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
        } else if (ctx.callbackQuery && conn.telegram) {
          await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
        }
        return true
      }
      
      // Answer callback
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery(`${currentPage} adalah urutan saat ini.`, { show_alert: false })
      } else if (ctx.callbackQuery && conn.telegram) {
        await conn.telegram.answerCbQuery(ctx.callbackQuery.id, `${currentPage} adalah urutan saat ini.`, { show_alert: false })
      }
      
      console.log('[ASUPS] Current page info shown')
      return true
    }

    // ===== NAVIGASI HALAMAN =====
    if (data.startsWith('asupp_page_')) {
      const parts = data.replace('asupp_page_', '').split('_')
      const nextPage = Number(parts[0]) || 1
      const senderId = parts[1]
      
      // Validasi: hanya pengirim atau anonymous yang bisa klik
      const isAnonymous = clickerId === 1087968824 || clickerId === 136817688
      if (!isAnonymous && clickerId !== Number(senderId) && senderId !== 'anon') {
        if (ctx.answerCbQuery) {
          await ctx.answerCbQuery('❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
        } else if (ctx.callbackQuery && conn.telegram) {
          await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
        }
        return true
      }
      
      // Answer callback
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery('📄 Navigating...')
      } else if (ctx.callbackQuery && conn.telegram) {
        await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '📄 Navigating...')
      }
      
      // Hapus pesan lama
      const messageId = ctx.callbackQuery?.message?.message_id
      if (messageId && conn.telegram) {
        await conn.telegram.deleteMessage(chatId, messageId).catch(() => {})
      }
      
      // Kirim pesan baru
      await sendMediaPage(conn, chatId, nextPage, null, clickerId, isAnonymous)
      
      console.log('[ASUPS] Page navigation completed')
      return true
    }

    // ===== KIRIM MEDIA KE PM =====
    if (data.startsWith('asupp_pm_')) {
      const parts = data.replace('asupp_pm_', '').split('_')
      const idx = Number(parts[0])
      const senderId = parts[1]
      
      // Validasi: hanya pengirim atau anonymous yang bisa klik
      const isAnonymous = clickerId === 1087968824 || clickerId === 136817688
      if (!isAnonymous && clickerId !== Number(senderId) && senderId !== 'anon') {
        if (ctx.answerCbQuery) {
          await ctx.answerCbQuery('❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
        } else if (ctx.callbackQuery && conn.telegram) {
          await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Button ini hanya untuk pengirim pesan!', { show_alert: true })
        }
        return true
      }
      
      if (Number.isNaN(idx) || idx < 0 || idx >= asupp.length) {
        if (ctx.answerCbQuery) {
          await ctx.answerCbQuery('Item tidak ditemukan.', { show_alert: true })
        } else if (ctx.callbackQuery && conn.telegram) {
          await conn.telegram.answerCbQuery(ctx.callbackQuery.id, 'Item tidak ditemukan.', { show_alert: true })
        }
        return true
      }
      
      const url = asupp[idx]
      const isVid = /\.mp4$/i.test(url)
      const targetId = ctx.callbackQuery?.from?.id

      const pmCaption = `📦 Terkirim ke pribadi: #${idx + 1}`
      
      // Answer callback
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery('📤 Mengirim ke chat pribadimu...')
      } else if (ctx.callbackQuery && conn.telegram) {
        await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '📤 Mengirim ke chat pribadimu...')
      }
      
      // Kirim media ke PM
      try {
        await conn.sendButt(targetId, pmCaption, [], null, {
          ...(isVid ? { video: { url } } : { photo: { url } })
        })
        
        console.log('[ASUPS] Media sent to PM successfully')
      } catch (sendError) {
        console.error('[ASUPS] Send to PM error:', sendError)
        if (ctx.answerCbQuery) {
          await ctx.answerCbQuery('❌ Gagal mengirim ke PM', { show_alert: true })
        } else if (ctx.callbackQuery && conn.telegram) {
          await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Gagal mengirim ke PM', { show_alert: true })
        }
      }
      
      return true
    }

    // Jika sampai sini, callback tidak dikenali
    console.log('[ASUPS] Unknown callback pattern')
    return false
    
  } catch (err) {
    console.error('[ASUPS ERROR]:', err)
    try {
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery('❌ Terjadi kesalahan', { show_alert: true })
      } else if (ctx.callbackQuery && conn.telegram) {
        await conn.telegram.answerCbQuery(ctx.callbackQuery.id, '❌ Terjadi kesalahan', { show_alert: true })
      }
    } catch {}
    return true // Tetap return true karena ini untuk plugin ini
  }
}

module.exports = handler

// ===== HELPER FUNCTIONS =====
function formatDateTime() {
  const now = new Date()
  
  const date = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(now)
  
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(now)
  
  return { date, time }
}

async function sendMediaPage(conn, jid, page, quoted, senderId, isAnonymous = false) {
  const { date, time } = formatDateTime()
  const totalPages = asupp.length
  const currentPage = Math.max(1, Math.min(page, totalPages))
  const idx = currentPage - 1
  const mediaUrl = asupp[idx]
  const isVid = /\.mp4$/i.test(mediaUrl)

  const caption = [
    `*Asupan*`,
    `Media ke ${currentPage} Dari ${totalPages}`,
    `Tanggal: ${date}`,
    `Waktu: ${time}`,
    ``,
    `_Prev/Next untuk pindah item_`,
    `_📤 Send to PM untuk kirim ke pribadi_`
  ].join('\n')

  // Gunakan 'anon' sebagai identifier untuk anonymous admin
  const buttonSenderId = isAnonymous ? 'anon' : senderId

  // Tombol Send to PM (dengan senderId)
  const sendPmButton = [
    { text: '📤 Send to PM', callback_data: `asupp_pm_${idx}_${buttonSenderId}` }
  ]

  // Buat navigation buttons manual (dengan senderId)
  const navButtons = []
  if (currentPage > 1) {
    navButtons.push({ text: '◀️ Prev', callback_data: `asupp_page_${currentPage - 1}_${buttonSenderId}` })
  }
  // Button current dengan encode currentPage dan senderId di callback_data
  navButtons.push({ 
    text: `${currentPage} from ${totalPages}`, 
    callback_data: `asupp_page_current_${currentPage}_${buttonSenderId}` 
  })
  if (currentPage < totalPages) {
    navButtons.push({ text: 'Next ▶️', callback_data: `asupp_page_${currentPage + 1}_${buttonSenderId}` })
  }

  // Gabungkan semua buttons
  const buttons = [
    sendPmButton,
    navButtons
  ]

  // Kirim media menggunakan sendButt dengan pagination (support video & image)
  await conn.sendButt(
    jid,
    caption,
    buttons,
    quoted,
    {
      ...(isVid ? { video: { url: mediaUrl } } : { photo: { url: mediaUrl } })
    }
  )
}

// ===== DATA MEDIA =====
const asupp = [
  "https://tmp.filn.xyz/uploads/b33ca9f6c4667501.jpg",
  "https://tmp.filn.xyz/uploads/65ef70eaa4b887a1.jpg",
  "https://tmp.filn.xyz/uploads/e8b751d7d4ec2cfb.mp4",
  "https://tmp.filn.xyz/uploads/b0536f23bf4e7ea5.mp4",
  "https://tmp.filn.xyz/uploads/db648361879fb246.mp4",
  "https://tmp.filn.xyz/uploads/e283721c547ee56b.mp4",
  "https://tmp.filn.xyz/uploads/f83247dccf35e75c.mp4",
  "https://tmp.filn.xyz/uploads/9115464b72fc77f7.mp4",
  "https://tmp.filn.xyz/uploads/f0e06ce24abb6e1e.mp4",
  "https://tmp.filn.xyz/uploads/2eeb7107b9eea1a1.jpg",
  "https://tmp.filn.xyz/uploads/beb47defeddd5b4c.jpg",
  "https://tmp.filn.xyz/uploads/eb929c7b38cc79f4.jpg",
  "https://tmp.filn.xyz/uploads/f0c4c8eb6d2c18d9.jpg"
]