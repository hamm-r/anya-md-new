import fs from 'fs'
import os from 'os'
import moment from 'moment-timezone'
import fetch from 'node-fetch'
import { spawn } from 'child_process'
import path from 'path'

/* ================= CLEANER ================= */
function normalizePlugins(plugins) {
  return Object.values(plugins)
    .filter(p => p && !p.disabled)
    .map(p => {
      let help = p.help
      let tags = p.tags

      if (!help) help = []
      if (!Array.isArray(help)) help = [help]
      help = help.filter(v => typeof v === 'string' && v.trim())

      if (!tags) tags = ['other']
      if (!Array.isArray(tags)) tags = [tags]
      tags = tags.filter(v => typeof v === 'string' && v.trim())

      if (help.length === 0) return null

      return {
        help,
        tags,
        limit: Boolean(p.limit),
        premium: Boolean(p.premium)
      }
    })
    .filter(Boolean)
}

/* ================= STYLE ================= */
const style = (text) => {
  const map = {
    a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',
    j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',
    s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
  }
  return text.toLowerCase().split('').map(v => map[v] || v).join('')
}

/* ================= ICON TAG ================= */
const icon = (tag) => {
  const map = {
    tools: '🛠️',
    download: '⬇️',
    search: '🔎',
    ai: '🤖',
    group: '👥',
    owner: '👑',
    game: '🎮',
    anime: '🌸',
    other: '📦'
  }
  return map[tag] || '✨'
}

/* ================= AUDIO ================= */
async function sendAudioAnya(conn, m) {
  try {
    let url = 'https://raw.githubusercontent.com/hamm-r/uploader/main/1778467936928-780.mp3'

    const tmpDir = path.resolve('./tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    let res = await fetch(url)
    let buffer = Buffer.from(await res.arrayBuffer())

    let input = path.join(tmpDir, `in_${Date.now()}.mp3`)
    let output = path.join(tmpDir, `out_${Date.now()}.ogg`)

    fs.writeFileSync(input, buffer)

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i', input,
        '-vn',
        '-c:a', 'libopus',
        output
      ])

      ffmpeg.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error('FFmpeg error'))
      })
    })

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(output),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: m })

    fs.unlinkSync(input)
    fs.unlinkSync(output)

  } catch (e) {
    console.log('Audio error:', e)
  }
}

/* ================= HANDLER ================= */
let handler = async (m, { conn, usedPrefix: _p }) => {

  let msg = await conn.sendMessage(m.chat, { text: 'anya lagi mikir menu nya... 🧠' })
  let key = msg.key

  let load = ['🌸','✨','💖','🍡','🥜']
  for (let i of load) {
    await new Promise(r => setTimeout(r, 250))
    await conn.sendMessage(m.chat, { text: i, edit: key })
  }

  let name = m.pushName || 'Kakak'
  let date = moment.tz('Asia/Jakarta').format('DD MMMM YYYY')
  let time = moment.tz('Asia/Jakarta').format('HH:mm:ss')
  let uptime = clockString(process.uptime() * 1000)
  let totalreg = Object.keys(global.db.data.users).length
  let platform = os.platform()

  let plugins = normalizePlugins(global.plugins)

  let tags = {}
  for (let p of plugins) {
    for (let t of p.tags) {
      if (!tags[t]) tags[t] = []
      tags[t].push(p)
    }
  }

  /* ================= HEADER ================= */
  let header = `
╭━━━〔 🌸 𝙰𝙽𝚈𝙰 𝙼𝙴𝙽𝚄 𝙿𝚁𝙾 〕━━━⬣
┃ 👤 ᴜꜱᴇʀ : ${name}
┃ 📅 ᴅᴀᴛᴇ : ${date}
┃ ⏰ ᴛɪᴍᴇ : ${time}
┃ ⚙️ ᴜᴘᴛɪᴍᴇ : ${uptime}
┃ 👥 ᴜꜱᴇʀꜱ : ${totalreg}
┃ 💻 ꜱʏꜱᴛᴇᴍ : ${platform}
╰━━━━━━━━━━━━━━━━━━━━⬣
`

  /* ================= BODY ================= */
  let body = Object.keys(tags).map((tag, i) => {
    let cmds = tags[tag].flatMap(v => v.help)

    return `
╭─〔 ${icon(tag)} ${tag.toUpperCase()} 〕─⬣
${cmds.map((c, j) =>
  `│ ${j + 1}. ${_p}${c}${tags[tag][0].limit ? ' Ⓛ' : ''}${tags[tag][0].premium ? ' Ⓟ' : ''}`
).join('\n')}
╰──────────────⬣`
  }).join('\n\n')

  /* ================= FOOTER ================= */
  let footer = `
╭───〔 💖 ANYA BOT 〕───⬣
│ 🥜 "waku waku~!"
│ 🌸 powered by hamm
╰──────────────⬣
`

  let text = style(header + '\n' + body + '\n' + footer)

  await conn.sendMessage(m.chat, {
    video: fs.readFileSync('./menuvid/anya.mp4'),
    gifPlayback: true,
    caption: text,
    mentions: [m.sender]
  }, { quoted: m })

  await sendAudioAnya(conn, m)
}

handler.command = /^(allmenu)$/i
export default handler

/* ================= UTIL ================= */
function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}