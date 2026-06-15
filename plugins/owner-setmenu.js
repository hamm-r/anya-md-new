let handler = async (m, { conn, text, isOwner }) => {
  if (!isOwner) return m.reply('Hanya Owner yang bisa mengganti tampilan menu!')
  if (!text) throw `*List Style Menu:*\n\n1. Native Flow (Gambar + Tombol)\n2. Interactive Doc (Fake PDF + Button)\n3. Classic Text (Full PDF Text)\n\nContoh: *.setmenu 2*`

  let type = parseInt(text)
  if (![1, 2, 3].includes(type)) throw 'Pilihan hanya 1, 2, atau 3!'

  if (!global.db.data.settings[conn.user.jid]) global.db.data.settings[conn.user.jid] = {}
  global.db.data.settings[conn.user.jid].setmenu = type
  
  m.reply(`✅ Berhasil mengubah tampilan menu ke *Style ${type}*`)
}

handler.help = ['setmenu']
handler.tags = ['owner']
handler.command = /^(setmenu)$/i
handler.owner = true

export default handler