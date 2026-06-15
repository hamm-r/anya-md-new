import DownrScraper from '../lib/scrape/downr.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `Contoh:\n${usedPrefix + command} https://example.com/video`

  await m.react('🕒')

  const scraper = new DownrScraper()
  const result = await scraper.getVideoInfo(text)

  if (!result) throw 'Gagal mengambil data'

  let caption = `🎬 *${result.title}*
👤 ${result.author}
📌 ${result.duration}`

  const media = result.medias?.find(v => v.type === 'video')
  if (!media) throw 'Video tidak ditemukan'

  await conn.sendFile(
    m.chat,
    media.url,
    `${result.title}.mp4`,
    caption,
    global.fstatus
  )
}

handler.help = ['aio <url>']
handler.tags = ['downloader']
handler.command = /^aio$/i
handler.limit = true

export default handler