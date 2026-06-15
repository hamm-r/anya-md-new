import { Canvas, loadImage, FontLibrary } from 'skia-canvas'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CONFIG = {
  rp: { x: 70, y: 62, fontSize: 19, color: '#a9e6ff' },
  saldo: { x: 101, y: 53, fontSize: 29, color: '#FFFFFF' },
  icon: { gap: 8, y: 64, size: 20 }
}

const FONT_RP =
  'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/iconfont.ttf'

const FONT_SALDO =
  'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/f5803c-1772975107907.ttf'

const BG_URL =
  'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/_20260501192538912.jpg'

const EYE_URL =
  'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/vision-off-svgrepo-com%20(1).svg'

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Gagal fetch: ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function loadFont(url, name) {
  const buf = await fetchBuffer(url)
  const tmpPath = join(tmpdir(), `${name}-${Date.now()}.ttf`)

  writeFileSync(tmpPath, buf)
  FontLibrary.use(name, tmpPath)

  return tmpPath
}

async function generateDanaMockup(angka) {
  let tmp1
  let tmp2

  try {
    tmp1 = await loadFont(FONT_RP, 'FontRp')
    tmp2 = await loadFont(FONT_SALDO, 'FontSaldo')

    const bg = await loadImage(BG_URL)
    const eyeIcon = await loadImage(EYE_URL)

    const canvas = new Canvas(bg.width, bg.height)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(bg, 0, 0)

    ctx.font = `${CONFIG.rp.fontSize}px FontRp`
    ctx.fillStyle = CONFIG.rp.color
    ctx.textBaseline = 'top'
    ctx.fillText('Rp', CONFIG.rp.x, CONFIG.rp.y)

    ctx.font = `${CONFIG.saldo.fontSize}px FontSaldo`
    ctx.fillStyle = CONFIG.saldo.color
    ctx.fillText(angka, CONFIG.saldo.x, CONFIG.saldo.y)

    const textWidth = ctx.measureText(angka).width
    const iconX = CONFIG.saldo.x + textWidth + CONFIG.icon.gap

    ctx.save()
    ctx.filter = 'brightness(0) invert(1)'
    ctx.drawImage(
      eyeIcon,
      iconX,
      CONFIG.icon.y,
      CONFIG.icon.size,
      CONFIG.icon.size
    )
    ctx.restore()

    // watermark aman
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-0.35)
    ctx.font = `bold 46px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SIMULASI', 0, -10)

    ctx.font = `bold 18px Arial`
    ctx.fillText('BUKAN BUKTI SALDO / TRANSAKSI', 0, 35)
    ctx.restore()

    return await canvas.png
  } finally {
    try {
      if (tmp1) unlinkSync(tmp1)
    } catch {}

    try {
      if (tmp2) unlinkSync(tmp2)
    } catch {}
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `Masukkan nominal.\n\nContoh:\n${usedPrefix + command} 150000`
      )
    }

    const raw = Number(String(text).replace(/[^\d]/g, ''))

    if (!raw || isNaN(raw)) {
      return m.reply('Nominal tidak valid.')
    }

    const angka = raw.toLocaleString('id-ID')
    const buffer = await generateDanaMockup(angka)

    const dir = join(process.cwd(), 'tmp')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const file = join(dir, `dana_mockup_${Date.now()}.png`)
    writeFileSync(file, buffer)

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        caption:
          `*FAKE DANA*\n\n` +
          `Nominal: Rp${angka}\n` +
          `Status: Simulasi / mockup`
      },
      { quoted: m }
    )

    try {
      unlinkSync(file)
    } catch {}
  } catch (e) {
    console.error(e)
    m.reply(String(e?.message || e))
  }
}

handler.help = ['fakedana <nominal>']
handler.tags = ['maker']
handler.command = /^(fakedana|danafake)$/i

export default handler