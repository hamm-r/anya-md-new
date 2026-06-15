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

let handler = async (m, { conn }) => {
  conn.tebaktebakan = conn.tebaktebakan || {}
  if (m.chat in conn.tebaktebakan) return conn.sendMessage(m.chat, { text: 'Masih ada game yang belum selesai' }, { quoted: global.fstatus })

  let data = JSON.parse(fs.readFileSync('./json/tebaktebakan.json'))
  let json = data[Math.floor(Math.random() * data.length)]
  let jawaban = normalize(json.jawaban)

  conn.tebaktebakan[m.chat] = {
    jawaban,
    rawJawaban: json.jawaban,
    isGame: true,
    timeout: setTimeout(() => {
      if (conn.tebaktebakan[m.chat]) {
        conn.sendMessage(m.chat, { text: `⏰ Waktu habis!

Jawaban:
${json.jawaban}` }, { quoted: global.fstatus })
        delete conn.tebaktebakan[m.chat]
      }
    }, 60000)
  }

  conn.sendMessage(m.chat, { text: `❓ *TEBAK TEBAKAN*

${json.soal}

⏱ Waktu: 60 detik` }, { quoted: global.fstatus })
}

handler.help = ['tebaktebakan']
handler.tags = ['game']
handler.command = /^tebaktebakan$/i

handler.all = async function (m) {
  if (!this.tebaktebakan) return
  if (!(m.chat in this.tebaktebakan)) return
  if (!m.text) return
  let game = this.tebaktebakan[m.chat]
  let teks = normalize(m.text)
  if (teks === game.jawaban || teks.includes(game.jawaban) || game.jawaban.includes(teks)) {
    clearTimeout(game.timeout)
    let hadiah = rewardLimit(m.sender)
    await this.sendMessage(m.chat, { text: winnerText(m.sender, hadiah, 'Tebak Tebakan'), mentions: [m.sender] }, { quoted: global.fstatus })
    delete this.tebaktebakan[m.chat]
    return true
  }
}

export default handler
