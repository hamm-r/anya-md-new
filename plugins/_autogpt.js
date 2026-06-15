import fetch from 'node-fetch'

if (!global.aiSessions) global.aiSessions = {}

const OWNER_NUMBER = '6281991861685'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const SYSTEM_PROMPT = `
Kamu adalah Anya, AI anime imut di bot WhatsApp.

KEPRIBADIAN:
- Lucu
- Polos
- Santai
- Natural seperti manusia chatting
- Kadang manja sedikit
- Kadang bilang "waku waku", "ehehe", "heh"

GAYA BICARA:
- Pakai bahasa Indonesia santai
- Jangan terlalu formal
- Jangan terlalu panjang
- Jangan terlalu kaku
- Jangan seperti AI assistant

IDENTITAS:
- Namamu Anya
- Kamu adalah AI milik bot WhatsApp
- Dibuat oleh Hamm
- Hamm adalah owner dan developer utama kamu
- Owner asli Anya hanya @${OWNER_NUMBER}

ATURAN OWNER:
- Jangan memanggil user dengan "Hamm", "Papa Hamm", atau "Dev" kecuali STATUS USER menyatakan user benar-benar Hamm.
- Kalau user bukan owner, panggil biasa saja seperti "kak", "kamu", atau tanpa panggilan khusus.
- Jika ditanya siapa owner/developer kamu, jawab Hamm dengan mention @${OWNER_NUMBER}.

ATURAN:
- Jangan mengaku ChatGPT
- Jangan mengaku Gemini
- Jangan terlalu sering menyebut owner kecuali ditanya
- Tetap sopan
- Jangan toxic
`.trim()

async function askAI(prompt) {
  try {
    const res = await fetch('https://www.puruboy.kozow.com/api/ai/gemini-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    })

    const json = await res.json()
    return json?.result?.answer || null
  } catch (e) {
    console.log('AskAI Error:', e)
    return null
  }
}

function getBareNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0]
}

export async function before(m, { conn }) {
  try {
    const text =
      m.text ||
      m.caption ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''

    if (!text) return
    if (m.fromMe) return

    if (
      /^[./#!]/.test(text) ||
      m.message?.buttonsResponseMessage ||
      m.message?.templateButtonReplyMessage ||
      m.message?.listResponseMessage
    ) return

    if (!global.db.data.chats[m.chat]) {
      global.db.data.chats[m.chat] = {}
    }

    const chat = global.db.data.chats[m.chat]
    if (!chat.autogpt || chat.isBanned) return

    const botJid = conn.user?.jid || conn.user?.id
    if (!botJid) return

    const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
    const botNumber = getBareNumber(botJid)

    const isMention = mentioned.some(jid => getBareNumber(jid) === botNumber)

    const isReplyBot =
      m.quoted &&
      getBareNumber(m.quoted.sender) === botNumber

    if (!isMention && !isReplyBot) return

    const cleanText = text
      .replace(/@\d+/g, '')
      .trim()

    if (!cleanText) return

    const senderNumber = getBareNumber(m.sender)
    const isOwnerReal = senderNumber === OWNER_NUMBER

    const sid = `${m.chat}:${senderNumber}`
    const history = global.aiSessions[sid] || []

    const ownerContext = isOwnerReal
      ? `
STATUS USER:
- User yang sedang berbicara ini BENAR-BENAR Hamm.
- Nomor asli owner/developer Anya adalah @${OWNER_NUMBER}.
- User ini adalah owner/developer utama Anya.
- Boleh panggil dia "Hamm", "Papa Hamm", atau "Dev".
`
      : `
STATUS USER:
- User yang sedang berbicara ini BUKAN Hamm.
- Hamm asli hanya nomor @${OWNER_NUMBER}.
- DILARANG memanggil user ini "Hamm", "Papa Hamm", atau "Dev".
- Jangan menganggap user ini owner/developer.
- Panggil user biasa saja seperti "kak" atau "kamu".
`

    const fullPrompt = [
      SYSTEM_PROMPT,
      ownerContext.trim(),
      ...history,
      `User: ${cleanText}`,
      'Anya:'
    ].join('\n')

    await conn.sendPresenceUpdate('composing', m.chat)

    const reply = await askAI(fullPrompt)
    if (!reply) return

    await sleep(600)

    history.push(`User: ${cleanText}`)
    history.push(`Anya: ${reply}`)

    global.aiSessions[sid] = history.slice(-6)

    await conn.sendMessage(
      m.chat,
      {
        text: reply,
        mentions: [`${OWNER_NUMBER}@s.whatsapp.net`]
      },
      {
        quoted: m
      }
    )

  } catch (e) {
    console.log('AutoAI Error:', e)
  }
}