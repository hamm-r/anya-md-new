/*
 * Bypass Link
 * Type    : Plugin ESM
 * Command : bypass
 */

const API = 'https://trw.lat/api/bypass'
const API_KEY = 'TRW_FREE-GAY-15a92945-9b04-4c75-8337-f2a6007281e9'

function parseResult(result) {
  if (typeof result !== 'string') return result

  const tupleMatch = result.match(/^\(['"](.+?)['"],\s*(True|False)\)$/)
  if (tupleMatch) return tupleMatch[1]

  const quoteMatch = result.match(/^["'](.+?)["']$/)
  if (quoteMatch) return quoteMatch[1]

  return result
}

async function bypassUrl(url) {
  const apiUrl = new URL(API)
  apiUrl.searchParams.set('apikey', API_KEY)
  apiUrl.searchParams.set('url', url)

  const res = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      accept: '*/*',
      origin: 'https://bypassunlock.com',
      referer: 'https://bypassunlock.com/',
      'user-agent':
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
      'accept-language': 'id-ID,id;q=0.9'
    }
  })

  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text || res.statusText)
  }

  if (!res.ok || !data.success || !data.result) {
    throw new Error(data.message || data.error || 'Bypass gagal')
  }

  return parseResult(data.result)
}

let handler = async (m, { text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(
      `Masukkan URL yang mau dibypass.\n\n` +
      `Contoh:\n${usedPrefix + command} https://linkvertise.com/xxxx`
    )
  }

  if (!/^https?:\/\//i.test(text)) {
    return m.reply('URL tidak valid, harus diawali http:// atau https://')
  }

  try {
    await m.react?.('🕒')

    const result = await bypassUrl(text.trim())

    await m.reply(
      `乂 *BYPASS LINK*\n\n` +
      `*Input:*\n${text.trim()}\n\n` +
      `*Result:*\n${result}`
    )

    await m.react?.('✅')
  } catch (e) {
    await m.react?.('❌')
    m.reply(`Gagal bypass:\n${e.message || e}`)
  }
}

handler.help = ['bypass <url>']
handler.tags = ['tools']
handler.command = /^(bypass|bypasslink|unshort)$/i

export default handler