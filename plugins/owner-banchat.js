let handler = async (m, { conn, args }) => {
  let groups = await conn.groupFetchAllParticipating()
  let groupList = Object.values(groups)

  if (!args[0]) {
    let teks = '📋 *LIST GROUP BOT*\n\n'
    groupList.map((g, i) => {
      teks += `${i + 1}. ${g.subject}\n`
    })
    teks += '\nGunakan:\n.banchat <nomor> <durasi> <alasan>'

    return m.reply(teks)
  }

  let index = parseInt(args[0]) - 1
  if (!groupList[index]) return m.reply('❌ Nomor tidak valid!')

  let duration = args[1]
  if (!duration) return m.reply('❌ Masukkan durasi! contoh: 10m / 2h / 1d')

  let reason = args.slice(2).join(' ') || 'Tidak ada alasan'

  // convert durasi ke ms
  let time = 0
  let num = parseInt(duration)
  if (duration.endsWith('m')) time = num * 60 * 1000
  else if (duration.endsWith('h')) time = num * 60 * 60 * 1000
  else if (duration.endsWith('d')) time = num * 24 * 60 * 60 * 1000
  else return m.reply('❌ Format durasi salah! (m/h/d)')

  let target = groupList[index].id

  global.db.data.chats[target] = global.db.data.chats[target] || {}
  let chat = global.db.data.chats[target]

  chat.isBanned = true
  chat.banReason = reason
  chat.banExpired = Date.now() + time

  m.reply(`🚫 *GRUP DI BAN!*\n\n📌 Nama: ${groupList[index].subject}\n⏱️ Durasi: ${duration}\n📝 Alasan: ${reason}`)
}

handler.help = ['banchat <nomor> <durasi> <alasan>']
handler.tags = ['owner']
handler.command = /^(banchat|bnc)$/i
handler.owner = true

export default handler