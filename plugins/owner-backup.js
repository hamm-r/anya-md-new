import fs from 'fs'
import archiver from 'archiver'
import path from 'path'

let handler = async (m, { conn }) => {
  try {
    const root = process.cwd()
    const tmpDir = path.join(root, 'tmp')

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    await conn.sendMessage(m.chat, {
      text: '❀ *Anya sedang membuat backup...*\n\nMohon tunggu sebentar yaa ✨'
    }, { quoted: m })

    const date = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    })

    const time = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    })

    const backupName = `Anya-MD-${date}.zip`
    const backupPath = path.join(root, backupName)

    const output = fs.createWriteStream(backupPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.pipe(output)

    archive.glob('**/*', {
      cwd: root,
      ignore: [
        'node_modules/**',
        'sessions/**',
        '.npm/**',
        'tmp/**',
        backupName
      ]
    })

    archive.directory(tmpDir, 'tmp')

    output.on('close', async () => {
      try {
        let target

        if (m.mentionedJid && m.mentionedJid.length) {
          target = m.mentionedJid[0]
        } else if (m.quoted && m.quoted.sender) {
          target = m.quoted.sender
        } else {
          target = m.sender
        }

        const size = (archive.pointer() / 1024 / 1024).toFixed(2)

        const caption = `
❀ *BACKUP ANYA MD* ❀

📁 *File:* ${backupName}
📦 *Size:* ${size} MB
📅 *Tanggal:* ${date}
⏰ *Jam:* ${time}

Backup berhasil dibuat oleh Anya ✨
`.trim()

        await conn.sendFile(target, backupPath, backupName, caption, m)

        if (target !== m.chat) {
          await conn.sendMessage(m.chat, {
            text: `✅ *Backup berhasil dikirim!*\n\n📤 Dikirim ke: @${target.split('@')[0]}`,
            mentions: [target]
          }, { quoted: m })
        }

        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
      } catch (e) {
        await conn.sendMessage(m.chat, {
          text: '❌ *Backup berhasil dibuat, tapi gagal dikirim:*\n' + e.message
        }, { quoted: m })

        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
      }
    })

    archive.on('error', async err => {
      throw err
    })

    await archive.finalize()

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: '❌ *Backup gagal:*\n' + e.message
    }, { quoted: m })
  }
}

handler.help = ['backup', 'backup @tag']
handler.tags = ['owner']
handler.command = /^backup$/i
handler.owner = true

export default handler