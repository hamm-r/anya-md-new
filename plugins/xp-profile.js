import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'

let handler = async (m, { conn }) => {

  let who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender

  if (!(who in global.db.data.users))
    return m.reply('Anya tidak menemukan user di database 🥜')

  let user = global.db.data.users[who]

  /* ================= FIX NaN ================= */
  const toNumber = (value, fallback = 0) => {
    value = Number(value)
    return Number.isFinite(value) ? value : fallback
  }

  if (!Number.isFinite(Number(user.limit))) user.limit = 0
  if (!Number.isFinite(Number(user.level))) user.level = 0
  if (!Number.isFinite(Number(user.exp))) user.exp = 0
  if (!Number.isFinite(Number(user.premiumTime))) user.premiumTime = 0

  let name = user.registered ? user.name : await conn.getName(who)
  let number = PhoneNumber('+' + who.split('@')[0]).getNumber('international')

  let pp
  try {
    pp = await conn.profilePictureUrl(who, 'image')
  } catch {
    pp = 'https://i.ibb.co/2kR1Z6X/profile.jpg'
  }

  let bio
  try {
    bio = (await conn.fetchStatus(who))?.status || 'Tidak ada bio'
  } catch {
    bio = 'Tidak ada bio'
  }

  let week = moment().tz('Asia/Jakarta').format('dddd')
  let date = moment().tz('Asia/Jakarta').format('DD MMMM YYYY')
  let time = moment().tz('Asia/Jakarta').format('HH:mm:ss')

  let role = user.role || 'Peanut Beginner'
  let level = toNumber(user.level)
  let exp = toNumber(user.exp)
  let limit = toNumber(user.limit)
  let premiumTime = toNumber(user.premiumTime)

  let registered = !!user.registered
  let age = user.age || '-'

  let premium = premiumTime > 0 ? 'Yes 🌟' : 'No 🥜'

  let text = `
🍿 *Anya Secret Profile*

🎀 *Nama* : ${name}
🎂 *Umur* : ${registered ? age : '-'}
💭 *Bio* : ${bio}

🧸 *Tag* : @${who.split('@')[0]}
📱 *Nomor* : ${number}

╭─⬣
│ 🏅 Role : ${role}
│ ⭐ Level : ${level}
│ ✨ Exp : ${exp}
│ 🎟️ Limit : ${limit}
│ 💎 Premium : ${premium}
╰────────────⬣

📅 ${week}, ${date}
⏰ ${time}

🥜 *Waku waku~*
`.trim()

  let imagePayload = Buffer.isBuffer(pp)
    ? { image: pp }
    : { image: { url: pp } }

  await conn.sendMessage(m.chat, {
    ...imagePayload,
    caption: text,
    mentions: [who]
  }, { quoted: m })
}

handler.help = ['profile', 'profil', 'me', 'my']
handler.tags = ['info', 'xp']
handler.command = /^(profile|profil|me|my)$/i
handler.limit = false

export default handler