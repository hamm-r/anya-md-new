import fs from 'fs'

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function randomLimit() {
  return Math.floor(Math.random() * 10) + 1
}

let handler = async (m, { conn }) => {
  conn.siapakahaku = conn.siapakahaku || {}

  if (m.chat in conn.siapakahaku)
    return conn.sendMessage(
      m.chat,
      { text: 'Masih ada game yang belum selesai' },
      { quoted: global.fstatus }
    )

  let data = JSON.parse(fs.readFileSync('./json/siapakahaku.json', 'utf-8'))
  let json = data[Math.floor(Math.random() * data.length)]
  let jawaban = normalize(json.jawaban)

  conn.siapakahaku[m.chat] = {
    jawaban,
    answer: jawaban,
    answerOriginal: json.jawaban,
    isGame: true,
    gameName: '🕵️ SIAPAKAH AKU',
    timeout: setTimeout(() => {
      if (conn.siapakahaku[m.chat]) {
        conn.sendMessage(
          m.chat,
          { text: `⏰ Waktu habis!

Jawaban:
${json.jawaban}` },
          { quoted: global.fstatus }
        )
        delete conn.siapakahaku[m.chat]
      }
    }, 60000)
  }

  conn.sendMessage(
    m.chat,
    { text: `🕵️ *SIAPAKAH AKU*

${json.soal}

⏱ Waktu: 60 detik` },
    { quoted: global.fstatus }
  )
}

handler.help = ['siapakahaku']
handler.tags = ['game']
handler.command = /^siapakahaku$/i

handler.all = async function (m) {
  if (!this.siapakahaku) return
  if (!(m.chat in this.siapakahaku)) return
  if (!m.text) return

  let game = this.siapakahaku[m.chat]
  let teks = normalize(m.text)

  if (teks === game.jawaban || teks.includes(game.jawaban) || game.jawaban.includes(teks)) {
    clearTimeout(game.timeout)

    let hadiah = randomLimit()
    let user = global.db.data.users[m.sender]
    if (user) {
      if (!user.limit) user.limit = 0
      user.limit += hadiah
    }

    await this.sendMessage(
      m.chat,
      {
        text: `🎉 *BENAR!*

👤 Pemenang: @${m.sender.split('@')[0]}
🎁 Reward: +${hadiah} Limit`,
        mentions: [m.sender]
      },
      { quoted: global.fstatus }
    )

    delete this.siapakahaku[m.chat]
    return true
  }
}

export default handler
