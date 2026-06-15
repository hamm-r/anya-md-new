import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, __dirname, text }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!mime.startsWith('image/'))
        return m.reply('Reply / kirim gambar dulu!\nContoh: reply foto lalu ketik *.addimage namafile*')

    if (!text)
        return m.reply('Masukkan nama file!\nContoh: *.addimage ryo* (tanpa ekstensi)')

    let img = await q.download()
    const filename = text.trim().replace(/[^a-zA-Z0--]/g, '') + '.jpg'
    const dest = path.resolve(__dirname, '../media', filename)

    fs.writeFileSync(dest, img)

    m.reply(`✅ Berhasil disimpan sebagai *${filename}* di folder media!`)
}

handler.help = ['addimage']
handler.tags = ['owner']
handler.command = /^addimage$/i
handler.owner = true
handler.limit = false

export default handler