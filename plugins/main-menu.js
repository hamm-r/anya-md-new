import moment from 'moment-timezone'
import fetch from 'node-fetch'
import fs from 'fs'

let handler = async (m, { conn, usedPrefix, command, text, isOwner }) => {

  global.db.data.settings = global.db.data.settings || {}

  let setting = global.db.data.settings[conn.user.jid] ??= { setmenu: 1 }
  let typeMenu = Number(setting.setmenu ?? 1)

  let user = global.db.data.users[m.sender]
  let { level, role, limit, premiumTime } = user

  let name = `@${m.sender.split('@')[0]}`
  let strLimit = isOwner ? '∞' : premiumTime > 0 ? 'Unlimited' : `${limit}`

  let plugins = Object.values(global.plugins).filter(p => !p.disabled)

  let categories = {}

  for (let plugin of plugins) {
    let help = Array.isArray(plugin.help) ? plugin.help : [plugin.help]
    let tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags]

    for (let tag of tags) {
      if (!tag) continue
      if (!categories[tag]) categories[tag] = []

      categories[tag].push({
        help,
        limit: !!plugin.limit,
        premium: !!plugin.premium,
        owner: !!plugin.owner,
        admin: !!plugin.admin,
        prefix: !!plugin.customPrefix
      })
    }
  }

  let menuType = text?.toLowerCase().trim()
  let arrayMenu = Object.keys(categories).sort()

  const formatTag = tag =>
    tag.replace(/[-_]/g, ' ').replace(/\b\w/g, v => v.toUpperCase())

  const ucapan = () => {
    const jam = moment.tz('Asia/Jakarta').hour()
    if (jam >= 4 && jam < 11) return 'Pagiii... 🌤️'
    if (jam >= 11 && jam < 15) return 'Siang yaa... 🍱'
    if (jam >= 15 && jam < 18) return 'Soree... 🌥️'
    return 'Malam... 😴'
  }

  let mainCaption = `
*ANYA MD*

${ucapan()} ${name}

♡ Rank : ${role}
♡ Level : ${level}
♡ Limit : ${strLimit} 🥜

Pilih kategori menu yaa...
`.trim()

  let thumb
  try {
    thumb = fs.readFileSync('./media/menu.png')
  } catch {
    thumb = await (await fetch('https://raw.githubusercontent.com/hamm-r/uploader/main/1779255801770-854.jpg')).buffer()
  }

  /* ================= STYLE 1 ================= */
  if (typeMenu === 1 && (!menuType || menuType === 'list')) {

    await conn.sendMessage(m.chat, {
      image: thumb,
      caption: mainCaption,
      footer: 'ANYA MD',
      nativeFlow: [
        {
          text: '🍓 Pilih Kategori',
          sections: [{
            title: `🥜 Kategori (${arrayMenu.length})`,
            rows: arrayMenu.map(v => ({
              title: `✦ ${formatTag(v)}`,
              description: `Menu ${formatTag(v)}`,
              id: `${usedPrefix + command} ${v}`
            }))
          }]
        },
        {
          text: '📋 All Menu',
          id: `${usedPrefix + command} all`
        }
      ]
    }, { quoted: m })
  }

  /* ================= STYLE 2 ================= */
  else if (typeMenu === 2 && (!menuType || menuType === 'list')) {

    let rows = arrayMenu.map(tag => ({
      title: `✨ ${tag.toUpperCase()}`,
      id: `${usedPrefix + command} ${tag}`
    }))

    await conn.sendMessage(m.chat, {
      image: thumb,
      caption: mainCaption,
      buttons: [{
        text: '🍓 Pilih kategori',
        sections: [{
          title: 'MENU ANYA',
          rows
        }]
      }]
    }, { quoted: m })
  }

  /* ================= STYLE 3 ================= */
  else if (typeMenu === 3 && (!menuType || menuType === 'list')) {

    let txt = mainCaption + `\n\n────── 🍓 ──────\n`

    for (let tag of arrayMenu) {
      txt += `\n🥜 ${usedPrefix + command} ${tag}`
    }

    txt += `\n🥜 ${usedPrefix + command} all`

    await conn.sendMessage(m.chat, {
      image: thumb,
      caption: txt.trim()
    }, { quoted: m })
  }

  /* ================= DETAIL MENU ================= */
  else {

    let tagsToShow = menuType === 'all'
      ? arrayMenu
      : (categories[menuType] ? [menuType] : [])

    if (!tagsToShow.length) {
      return m.reply(`Menu *${menuType}* tidak ditemukan 😵`)
    }

    let detailText = `*ANYA MD MENU*\n`

    for (let tag of tagsToShow) {
      detailText += `\n🍓 ${tag.toUpperCase()}\n`

      for (let item of categories[tag]) {
        for (let cmd of item.help) {
          let status =
            `${item.premium ? ' 🥜' : ''}` +
            `${item.limit ? ' 🍬' : ''}` +
            `${item.owner ? ' 👤' : ''}` +
            `${item.admin ? ' 🧠' : ''}`

          detailText += `➤ ${item.prefix ? '' : usedPrefix}${cmd}${status}\n`
        }
      }
    }

    await conn.sendMessage(m.chat, {
      image: thumb,
      caption: detailText.trim()
    }, { quoted: m })
  }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|help|perintah)$/i

export default handler