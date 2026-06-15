import fs from 'fs'

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function rewardLimit(sender) {
  let hadiah = Math.floor(Math.random() * 10) + 1
  let user = global.db.data.users[sender]
  if (user) {
    if (!user.limit) user.limit = 0
    user.limit += hadiah
  }
  return hadiah
}

function winnerText(sender, hadiah, gameName, answerExtra) {
  return `🎉 *BENAR!*\n\n🎮 Game : ${gameName}\n👤 Pemenang: @${sender.split('@')[0]}\n🎁 Reward: +${hadiah} Limit${answerExtra ? '\n' + answerExtra : ''}`
}

let timeout = 60000

let handler = async (m, { conn }) => {
  conn.tebaklagu = conn.tebaklagu || {}
  let id = m.chat
  if (id in conn.tebaklagu) return conn.reply(m.chat, '❀ Masih ada game yang belum selesai', conn.tebaklagu[id][0])

  let src = JSON.parse(fs.readFileSync('./json/tebaklagu.json'))
  let json = src[Math.floor(Math.random() * src.length)]
  let caption = `🎵 「 *TEBAK LAGU* 」

Tebak judul lagu dari audio ini

Waktu : ${timeout / 1000} detik
Reward : Limit Random`.trim()

  let msg = await conn.sendMessage(m.chat, { audio: { url: json.lagu }, mimetype: 'audio/mp4' }, { quoted: global.fstatus })
  conn.tebaklagu[id] = {
    msg,
    jawaban: normalize(json.judul),
    rawJawaban: json.judul,
    artis: json.artis,
    isGame: true,
    timeout: setTimeout(async () => {
      if (conn.tebaklagu[id]) {
        await conn.reply(m.chat, `❀ Waktu habis!

🎵 Game : Tebak Lagu

Jawaban :
${json.judul}
Artis : ${json.artis}`, global.fstatus)
        delete conn.tebaklagu[id]
      }
    }, timeout)
  }
  await conn.reply(m.chat, caption, global.fstatus)
}

handler.help = ['tebaklagu']
handler.tags = ['game']
handler.command = /^tebaklagu$/i
handler.register = true

handler.all = async function (m) {
  if (!this.tebaklagu) return
  if (!(m.chat in this.tebaklagu)) return
  if (!m.text) return

  let room = this.tebaklagu[m.chat]
  let teks = normalize(m.text)
  if (/^((me)?nyerah|skip|surr?ender)$/i.test(teks)) {
    clearTimeout(room.timeout)
    await this.reply(m.chat, `🏳️ Menyerah!

🎵 Game : Tebak Lagu

Jawaban :
${room.rawJawaban}
Artis : ${room.artis}`, global.fstatus)
    delete this.tebaklagu[m.chat]
    return true
  }

  if (teks === room.jawaban || teks.includes(room.jawaban) || room.jawaban.includes(teks)) {
    clearTimeout(room.timeout)
    let hadiah = rewardLimit(m.sender)
    await this.reply(m.chat, winnerText(m.sender, hadiah, 'Tebak Lagu', `Artis : ${room.artis}`), global.fstatus, { mentions: [m.sender] })
    delete this.tebaklagu[m.chat]
    return true
  }
}

export default handler
