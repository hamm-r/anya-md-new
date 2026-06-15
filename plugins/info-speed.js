import { createCanvas, loadImage } from '@napi-rs/canvas'
import os from 'os'
import moment from 'moment-timezone'

const BG_URL = 'https://raw.githubusercontent.com/hamm-r/uploader/main/1781161929894-460.jpg'

const WIDTH = 1280
const HEIGHT = 720

async function getBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed fetch background (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function uptime() {
  let s = Math.floor(process.uptime())
  let d = Math.floor(s / 86400)
  s %= 86400
  let h = Math.floor(s / 3600)
  s %= 3600
  let m = Math.floor(s / 60)

  return `${d}d ${h}h ${m}m`
}

function card(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(15,15,20,0.72)'
  ctx.fillRect(x, y, w, h)

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, w, h)
}

function txt(ctx, text, x, y, size, bold = false, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#ffffff'
  ctx.font = `${bold ? 'bold' : ''} ${size}px sans-serif`
  ctx.fillText(String(text), x, y)
  ctx.globalAlpha = 1
}

function progress(ctx, x, y, w, h, value) {
  value = Math.max(0, Math.min(100, value))

  ctx.fillStyle = 'rgba(255,255,255,.15)'
  ctx.fillRect(x, y, w, h)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, (w * value) / 100, h)
}

async function makeDashboard(conn) {
  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  const bg = await loadImage(await getBuffer(BG_URL))
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = 'rgba(0,0,0,.65)'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const totalRam = os.totalmem()
  const freeRam = os.freemem()
  const usedRam = totalRam - freeRam
  const ramPercent = Math.round((usedRam / totalRam) * 100)

  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model || 'Unknown CPU'
  const cpuText =
    cpuModel.length > 45
      ? cpuModel.slice(0, 45) + '...'
      : cpuModel

  const cores = cpus.length
  const load = os.loadavg()[0]
  const cpuPercent = Math.min(
    100,
    Math.round((load / cores) * 100)
  )

  const users = Object.keys(global.db?.data?.users || {}).length
  const chats = Object.keys(global.db?.data?.chats || {}).length
  const plugins = Object.values(global.plugins || {}).filter(v => !v.disabled).length

  const botName = conn.user?.name || 'Anya MD'
  const now = moment()
    .tz('Asia/Jakarta')
    .format('DD MMM YYYY • HH:mm:ss')

  // HEADER
  card(ctx, 40, 40, 1200, 120)

  txt(ctx, 'ANYA MD DASHBOARD', 70, 95, 40, true)
  txt(ctx, botName, 70, 130, 20, false, 0.7)

  txt(ctx, 'ONLINE', 1080, 90, 24, true)
  txt(ctx, now, 920, 130, 18, false, 0.7)

  // STATS
  card(ctx, 40, 190, 370, 120)
  card(ctx, 455, 190, 370, 120)
  card(ctx, 870, 190, 370, 120)

  txt(ctx, 'UPTIME', 65, 230, 18, true, 0.6)
  txt(ctx, uptime(), 65, 280, 34, true)

  txt(ctx, 'USERS', 480, 230, 18, true, 0.6)
  txt(ctx, users, 480, 280, 34, true)
  txt(ctx, `${chats} chats`, 480, 302, 16, false, 0.5)

  txt(ctx, 'PLUGINS', 895, 230, 18, true, 0.6)
  txt(ctx, plugins, 895, 280, 34, true)
  txt(ctx, 'active modules', 895, 302, 16, false, 0.5)

  // RAM
  card(ctx, 40, 340, 580, 170)

  txt(ctx, 'RAM USAGE', 65, 385, 22, true)
  txt(ctx, `${ramPercent}%`, 65, 440, 42, true)

  txt(
    ctx,
    `${formatBytes(usedRam)} / ${formatBytes(totalRam)}`,
    180,
    438,
    20
  )

  progress(ctx, 65, 465, 500, 18, ramPercent)

  txt(
    ctx,
    `Bot Memory: ${formatBytes(process.memoryUsage().rss)}`,
    65,
    500,
    16,
    false,
    0.6
  )

  // CPU
  card(ctx, 660, 340, 580, 170)

  txt(ctx, 'CPU INFO', 685, 385, 22, true)
  txt(ctx, `${cpuPercent}%`, 685, 440, 42, true)

  txt(
    ctx,
    `${cores} Core • Load ${load.toFixed(2)}`,
    800,
    438,
    20
  )

  progress(ctx, 685, 465, 500, 18, cpuPercent)

  txt(
    ctx,
    cpuText,
    685,
    500,
    16,
    false,
    0.6
  )

  // SYSTEM
  card(ctx, 40, 540, 1200, 120)

  txt(ctx, 'SYSTEM INFORMATION', 65, 585, 20, true)

  txt(
    ctx,
    `${os.type()} • ${os.platform()} ${os.arch()} • Node ${process.version}`,
    65,
    625,
    24
  )

  txt(ctx, '© Anya MD by Hamm', 40, 700, 15, false, 0.45)

  return canvas.toBuffer('image/png')
}

let handler = async (m, { conn }) => {
  try {
    await m.react?.('🕐')

    const image = await makeDashboard(conn)

    await conn.sendMessage(
      m.chat,
      {
        image,
        caption: '📊 *ANYA MD DASHBOARD*'
      },
      { quoted: m }
    )

    await m.react?.('✅')
  } catch (e) {
    console.error(e)
    await m.react?.('❌')
    m.reply(`Error dashboard:\n${e.stack || e.message}`)
  }
}

handler.help = ['dashboard']
handler.tags = ['info']
handler.command = /^(ping|speed)$/i

export default handler