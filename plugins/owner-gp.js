import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
let exec = promisify(_exec).bind(cp)

let handler = async (m, { conn, isROwner, usedPrefix, command, text }) => {
  if (!isROwner) return
  if (!text) throw `uhm.. where the text?\n\nexample:\n${usedPrefix + command} menu`

  await m.reply(global.wait)

  let ar = Object.keys(global.plugins)
  let ar1 = ar.map(v => v.replace('.js', ''))

  if (!ar1.includes(text)) {
    return conn.sendMessage(m.chat, {
      headerText: '❌ Plugin Not Found',
      contentText: 'Daftar plugin tersedia:',
      code: ar1.join('\n'),
      language: 'bash',
      footerText: 'Anya forger MD'
    }, { quoted: m })
  }

  let o
  try {
    o = await exec('cat plugins/' + text + '.js')
  } catch (e) {
    o = e
  }

  let { stdout, stderr } = o

  if (stdout) {
    await conn.sendMessage(m.chat, {
      headerText: `📦 plugins/${text}.js`,
      contentText: 'Source Code:',
      code: stdout.trim(),
      language: 'javascript',
      footerText: 'Anya forger MD'
    }, { quoted: m })
  }

  if (stderr) {
    await conn.sendMessage(m.chat, {
      headerText: '❌ Error',
      code: stderr.trim(),
      language: 'bash'
    }, { quoted: m })
  }
}

handler.help = ['getplugin']
handler.tags = ['owner']
handler.command = /^(getplugin|gp)$/i
handler.rowner = true

export default handler