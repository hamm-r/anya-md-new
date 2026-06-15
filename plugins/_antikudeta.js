export const name = "antikudeta-db"

export async function before(m, { conn, isBotAdmin }) {
  if (!m.isGroup) return
  if (!isBotAdmin) return

  // init database
  let db = global.db.data
  if (!db.antikudeta) db.antikudeta = {}
  if (!db.antikudeta[m.chat]) {
    db.antikudeta[m.chat] = {
      whitelist: []
    }
  }

  let data = db.antikudeta[m.chat]

  // hanya deteksi demote
  if (m.messageStubType !== 32) return

  let target = m.messageStubParameters?.[0]
  let actor = m.sender
  if (!target || !actor) return

  // skip whitelist
  if (data.whitelist.includes(actor)) return
  if (data.whitelist.includes(target)) return

  // skip command bot
  if (m.text && m.text.startsWith(".")) return

  try {
    // balikin admin
    await conn.groupParticipantsUpdate(m.chat, [target], "promote")

    // kick pelaku
    await conn.groupParticipantsUpdate(m.chat, [actor], "remove")

    await conn.sendMessage(m.chat, {
      text: `⚠️ *ANTI KUDETA AKTIF!*

👤 @${actor.split("@")[0]} mencoba demote admin
🔄 Admin dikembalikan
👢 Pelaku dikeluarkan!`,
      mentions: [actor]
    })

  } catch (e) {
    console.log("Anti kudeta DB error:", e)
  }
}