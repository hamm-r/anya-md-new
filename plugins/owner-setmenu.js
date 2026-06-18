let handler = async (m, { conn, text, isOwner }) => {
  if (!isOwner) return m.reply('Hanya Owner yang bisa mengganti tampilan menu!')

  if (!text) throw `* List Style Menu *

1. Native Flow
2. Interactive Menu
3. Classic Text

Contoh:
*.setmenu 1*`

  let type = parseInt(text)

  if (isNaN(type) || ![1, 2, 3].includes(type)) {
    throw 'Pilihan hanya 1, 2, atau 3!'
  }

  global.db.data.settings = global.db.data.settings || {}
  global.db.data.settings[conn.user.jid] = global.db.data.settings[conn.user.jid] || {}

  global.db.data.settings[conn.user.jid].setmenu = type

  const styleName = {
    1: 'Native Flow',
    2: 'Interactive Menu',
    3: 'Classic Text'
  }

  m.reply(` Berhasil mengubah tampilan menu

 Style : ${styleName[type]}
 ID     : ${type}`)
}

handler.help = ['setmenu']
handler.tags = ['owner']
handler.command = /^(setmenu)$/i
handler.owner = true

export default handler