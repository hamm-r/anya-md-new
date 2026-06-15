import { fileTypeFromBuffer } from 'file-type'

let handler = async (m, { conn, text, participants }) => {
    let users = participants.map(u => u.id)

    let quoted = m.quoted || m
    let mime = (quoted.msg || quoted).mimetype || ''

    // =========================
    // 🎧 AUDIO → TEKS SAJA
    // =========================
    if (/audio/.test(mime)) {
        let teks = text || '...'

        return conn.sendMessage(m.chat, {
            text: teks,
            mentions: users
        }, {
            quoted: m // aman
        })
    }

    // =========================
    // ✅ TEKS / REPLY TEKS
    // =========================
    if (!mime) {
        let teks = text || m.quoted?.text || m.quoted?.caption || ''
        if (!teks) throw 'Masukin teksnya!'

        return conn.sendMessage(m.chat, {
            text: teks,
            mentions: users
        }, {
            quoted: m
        })
    }

    // =========================
    // ✅ MEDIA (SELain AUDIO)
    // =========================
    let buffer = null
    try {
        buffer = await quoted.download?.()
    } catch {
        buffer = null
    }

    if (!buffer) {
        return conn.sendMessage(m.chat, {
            text: text || '...',
            mentions: users
        }, { quoted: m })
    }

    let type = await fileTypeFromBuffer(buffer) || { mime }
    let mimetype = type.mime

    let msg = {
        mentions: users
    }

    if (/image/.test(mimetype)) {
        msg.image = buffer
        msg.caption = text || ''
    } else if (/video/.test(mimetype)) {
        msg.video = buffer
        msg.caption = text || ''
    } else if (/sticker/.test(mimetype)) {
        msg.sticker = buffer
    } else {
        msg.document = buffer
        msg.mimetype = mimetype
        msg.fileName = 'file'
        msg.caption = text || ''
    }

    await conn.sendMessage(m.chat, msg) // tanpa quoted biar aman
}

handler.help = ['hidetag', 'h']
handler.tags = ['group']
handler.command = /^(hidetag|h)$/i
handler.group = true
handler.admin = true

export default handler