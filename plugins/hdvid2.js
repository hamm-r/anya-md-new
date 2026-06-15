import fs from 'fs'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'

const API_URL = 'https://api.theresav.biz.id/tools/winkvideo'
const API_KEY = 'kyujir'

let handler = async (m, { conn, usedPrefix, command }) => {
  let tmpPath = null

  try {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || ''

    if (!/video/i.test(mime)) {
      return m.reply(
        `Reply video yang ingin di-HD\n\nContoh:\n${usedPrefix + command}`
      )
    }

    if (typeof global.loading === 'function') {
      await global.loading(m, conn)
    }

    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    tmpPath = path.join(tmpDir, `hdvideo-${Date.now()}.mp4`)

    const media = await q.download()
    if (!media || !media.length) {
      return m.reply('Gagal download video.')
    }

    fs.writeFileSync(tmpPath, media)

    const form = new FormData()
    form.append('video', fs.createReadStream(tmpPath), {
      filename: 'video.mp4',
      contentType: 'video/mp4'
    })
    form.append('apikey', API_KEY)

    const { data } = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        accept: 'application/json'
      },
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    })

    if (!data?.status) {
      return m.reply(data?.message || 'Gagal memproses video.')
    }

    const resultUrl = data?.result?.url || data?.result
    if (!resultUrl) {
      return m.reply('API tidak mengembalikan URL video.')
    }

    await conn.sendFile(
      m.chat,
      resultUrl,
      'hd.mp4',
      '✨ HD Video Ultra',
      m
    )
  } catch (e) {
    console.error(e)
    m.reply(`Error processing video:\n${e.message || e}`)
  } finally {
    try {
      if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    } catch {}

    try {
      if (typeof global.loading === 'function') {
        await global.loading(m, conn, true)
      }
    } catch {}
  }
}

handler.help = ['hdvideo', 'hdvid']
handler.tags = ['tools']
handler.command = /^(hdvideo2|hdvid2)$/i
handler.limit = true

export default handler