import fetch from 'node-fetch'
import path from 'path'
import mime from 'mime-types'
import { format } from 'util'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`Contoh:
${usedPrefix + command} https://example.com/file.pdf`)
  }

  try {
    let url = text.trim()

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }

    let res = await fetch(url, {
      redirect: 'follow',
      follow: 20,
      compress: true,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!res.ok) {
      throw `${res.status} ${res.statusText}`
    }

    let contentType = res.headers.get('content-type') || 'application/octet-stream'
    let contentLength = Number(res.headers.get('content-length')) || 0

    if (contentLength > 500 * 1024 * 1024) {
      throw 'File terlalu besar'
    }

    let finalUrl = res.url
    let disposition = res.headers.get('content-disposition')

    let filename = 'file'

    if (disposition && disposition.includes('filename=')) {
      filename = disposition
        .split('filename=')[1]
        .replace(/["']/g, '')
    } else {
      filename = path.basename(new URL(finalUrl).pathname) || 'file'
    }

    let ext = mime.extension(contentType)
    if (!path.extname(filename) && ext) {
      filename += '.' + ext
    }

    // TEXT
    if (/^text\//i.test(contentType)) {
      let txt = await res.text()

      await m.reply(txt.slice(0, 65536))

      return conn.sendFile(
        m.chat,
        Buffer.from(txt),
        filename,
        null,
        m
      )
    }

    // JSON
    if (/application\/json/i.test(contentType)) {
      let json = await res.json()
      let txt = format(JSON.stringify(json, null, 2))

      await m.reply(txt.slice(0, 65536))

      return conn.sendFile(
        m.chat,
        Buffer.from(txt),
        filename,
        null,
        m
      )
    }

    let buffer = Buffer.from(await res.arrayBuffer())

    return conn.sendMessage(
      m.chat,
      {
        document: buffer,
        mimetype: contentType,
        fileName: filename,
        caption: `乂 *FETCH URL*\n\n📦 *Name:* ${filename}\n📄 *Type:* ${contentType}\n📏 *Size:* ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    m.reply(`❌ Error:\n${e.message || e}`)
  }
}

handler.help = ['fetch', 'get'].map(v => v + ' <url>')
handler.tags = ['tools']
handler.command = /^(fetch|get)$/i

export default handler