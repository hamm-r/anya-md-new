import fs from 'fs'
import { textReplace } from '../lib/scrape/textreplace.js'

let handler = async (m, { conn, text }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  if (!mime || !mime.includes('image'))
    return m.reply('Reply gambar atau kirim gambar dengan caption .timpa')

  if (!text.includes('|'))
    return m.reply('Format:\n.timpa tekslama|teksbaru')

  const [oldText, newText] = text.split('|')

  await m.reply('_wait otw..._')

  const media = await q.download()

  const file = './tmp/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.jpg'
  fs.writeFileSync(file, media)

  const result = await textReplace(file, oldText.trim(), newText.trim())

  await conn.sendFile(m.chat, result, 'hasil.png', '', m)

  fs.unlinkSync(file)
}

handler.help = ['timpa', 'timpatext']
handler.tags = ['tools']
handler.command = /^(timpa|timpatext)$/i
handler.limit = true

export default handler