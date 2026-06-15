import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
  if (!isOwner) {
    return m.reply('Hei~ ini khusus pemilik bot aja lho~ 🔒 ga bisa sembarangan masuk (｡•́︿•̀｡)')
  }

  const [link, emoji] = (text || '').split('|').map(v => v.trim())

  if (!link || !emoji) {
    return m.reply(
`Formatnya kurang nih~ 📋

*${usedPrefix + command} <link_channel>|<emoji>*

Contoh:
*${usedPrefix + command} https://whatsapp.com/channel/xxx|🔥*`
    )
  }

  try {
    await conn.sendMessage(m.chat, {
      react: { text: '🕐', key: m.key }
    })

    const { data } = await axios.get(
      'https://api.epand.my.id/api/tools/rch',
      {
        params: {
          url: link,
          emojis: emoji
        },
        timeout: 20000
      }
    )

    if (!data || data.status === false) {
      throw new Error(data?.message || 'API tidak merespons')
    }

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

    return m.reply(
`✅ *React Channel Berhasil~* 🎉

🔗 *Link*  : ${link}
😋 *Emoji* : ${emoji}
💬 *Pesan* : ${data?.message || data?.result || 'Sukses'}`
    )
  } catch (e) {
    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })

    return m.reply(
`Aduh~ react channel-nya gagal nih (T_T)

Error: ${e.response?.data?.message || e.message || 'Terjadi kesalahan'}

Coba lagi nanti ya~`
    )
  }
}

handler.help = ['rch <link_channel>|<emoji>']
handler.tags = ['owner']
handler.command = /^(rch)$/i
handler.owner = true

export default handler