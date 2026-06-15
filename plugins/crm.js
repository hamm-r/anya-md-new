// plugins/owner-crm.js
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import util from 'util'

const DIR = './tmp/crm-relay'

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })

function randId() {
  return crypto.randomBytes(8).toString('hex').toUpperCase()
}

function cleanMessage(msg = {}) {
  let copy = JSON.parse(JSON.stringify(msg))

  delete copy.messageContextInfo
  delete copy.deviceListMetadata
  delete copy.deviceListMetadataVersion

  return copy
}

function pickContent(qmsg) {
  let msg = qmsg?.message || qmsg?.msg || qmsg
  if (!msg) return null

  if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message
  if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message
  if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message

  return cleanMessage(msg)
}

let handler = async (m, { conn, text, command, isOwner }) => {
  if (!isOwner) return m.reply('Khusus owner 🗿')

  let quoted = m.quoted
  let latestPath = path.join(DIR, 'latest.json')

  if (command === 'crm') {
    if (!quoted) return m.reply('Reply pesan yang mau dijadikan relay.\n\nContoh:\n.reply pesan lalu ketik *.crm cona*')

    let id = randId()
    let name = text?.trim() || 'relay'
    let content = pickContent(quoted)

    if (!content) return m.reply('Gagal ambil payload message.')

    let data = {
      id,
      name,
      creator: m.pushName || 'unknown',
      jid: m.chat,
      sender: quoted.sender || quoted.participant || 'unknown',
      messageId: quoted.id || quoted.key?.id || id,
      type: Object.keys(content)[0] || 'unknown',
      createdAt: new Date().toISOString(),
      content
    }

    let file = path.join(DIR, `relay-${id}.json`)
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    fs.writeFileSync(latestPath, file)

    let jsFile = path.join(DIR, `relay-${id}.js`)
    let source = `/*
 * created relay message
 *
 * name      : ${data.name}
 * jid       : ${data.jid}
 * sender    : ${data.sender}
 * messageid : ${data.messageId}
 * type      : ${data.type}
 * created   : ${data.createdAt}
 */

export const content = ${util.inspect(data.content, {
  depth: null,
  compact: false,
  maxArrayLength: null
})}
`
    fs.writeFileSync(jsFile, source)

    await conn.sendMessage(m.chat, {
      document: fs.readFileSync(jsFile),
      fileName: path.basename(jsFile),
      mimetype: 'application/javascript',
      caption:
`📄 *relay message script*

edit kalau perlu, lalu reply file ini + ketik *run*

ID: *${id}*
Type: *${data.type}*`
    }, { quoted: m })

    return
  }

  if (command === 'cat') {
    let file = text
      ? path.join(DIR, text.endsWith('.json') ? text : `relay-${text}.json`)
      : fs.existsSync(latestPath)
        ? fs.readFileSync(latestPath, 'utf8')
        : null

    if (!file || !fs.existsSync(file)) return m.reply('Belum ada relay. Buat dulu pakai *.crm*')

    let data = JSON.parse(fs.readFileSync(file))
    let code = `/*
 * created relay message
 *
 * name      : ${data.name}
 * jid       : ${data.jid}
 * sender    : ${data.sender}
 * messageid : ${data.messageId}
 * type      : ${data.type}
 * created   : ${data.createdAt}
 */

const content = ${util.inspect(data.content, {
  depth: null,
  compact: false,
  maxArrayLength: null
})}
`
    return m.reply(code.slice(0, 60000))
  }

  if (command === 'run') {
    let file = text
      ? path.join(DIR, text.endsWith('.json') ? text : `relay-${text}.json`)
      : fs.existsSync(latestPath)
        ? fs.readFileSync(latestPath, 'utf8')
        : null

    if (!file || !fs.existsSync(file)) return m.reply('Belum ada relay yang bisa dijalankan.')

    let data = JSON.parse(fs.readFileSync(file))

    await conn.relayMessage(m.chat, data.content, {
      messageId: crypto.randomBytes(10).toString('hex').toUpperCase()
    })

    return m.reply('✅ selesai (no output)')
  }

  if (command === 'listcrm') {
    let files = fs.readdirSync(DIR).filter(v => v.endsWith('.json') && v !== 'latest.json')
    if (!files.length) return m.reply('Belum ada relay tersimpan.')

    let teks = files.map((v, i) => {
      let d = JSON.parse(fs.readFileSync(path.join(DIR, v)))
      return `${i + 1}. *${d.id}*\n• Name: ${d.name}\n• Type: ${d.type}\n• Created: ${d.createdAt}`
    }).join('\n\n')

    return m.reply(teks)
  }

  if (command === 'delcrm') {
    if (!text) return m.reply('Masukkan ID relay.\nContoh: *.delcrm ACC9AB162209249E*')

    let json = path.join(DIR, `relay-${text}.json`)
    let js = path.join(DIR, `relay-${text}.js`)

    if (fs.existsSync(json)) fs.unlinkSync(json)
    if (fs.existsSync(js)) fs.unlinkSync(js)

    return m.reply('✅ relay dihapus.')
  }
}

handler.help = ['crm', 'cat', 'run', 'listcrm', 'delcrm']
handler.tags = ['owner']
handler.command = /^(crm|cat|run|listcrm|delcrm)$/i
handler.owner = true

export default handler