import { generateIQC } from 'iqc-canvas'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `Contoh:\n${usedPrefix + command} Hello World 👋`
      )
    }

    const now = new Date()
    const time = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).replace(':', '.')

    const result = await generateIQC(text, time, {
      baterai: [true, '100'],
      operator: true,
      timebar: true,
      wifi: true
    })

    if (!result.success) {
      return m.reply(result.message || 'Gagal membuat IQC.')
    }

    await conn.sendMessage(
      m.chat,
      {
        image: result.image,
        mimetype: result.mimeType || 'image/png',
        caption: `✅ *IQC Generated*\n\n🕒 Time: ${time}`
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    m.reply('Terjadi error saat membuat IQC.')
  }
}

handler.help = ['iqc3 <teks>']
handler.tags = ['maker']
handler.command = /^(iqc3)$/i

export default handler