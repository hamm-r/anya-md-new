import moment from 'moment-timezone'
import * as levelling from '../lib/levelling.js'
import fetch from 'node-fetch'
import fs from 'fs'

const cooldown = new Map()

let handler = async (m, { conn, usedPrefix, command, text, isOwner }) => {
  let user = global.db.data.users[m.sender]
  let setting = global.db.data.settings[conn.user.jid] || { setmenu: 1 }
  let typeMenu = setting.setmenu

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

  const formatTag = tag => tag
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, v => v.toUpperCase())

  const ucapan = () => {
    const jam = moment.tz('Asia/Jakarta').hour()
    if (jam >= 4 && jam < 11) return 'Pagiii... heh? 🌤️'
    if (jam >= 11 && jam < 15) return 'Siang yaa... 🍱'
    if (jam >= 15 && jam < 18) return 'Soree... 🌥️'
    return 'Malam... tidur? 😴'
  }

  let mainCaption = `
*ANYA MD*

${ucapan()} ${name}

Heh? aku Anya~ bantu kamu yaa ✨

♡ Rank : ${role}
♡ Level : ${level}
♡ Peanut Limit : ${strLimit} 🥜

Pilih kategori menu dulu yaa... heh? 😳
`.trim()

  let thumb
  try {
    thumb = fs.readFileSync('./media/menu.png')
  } catch {
    thumb = await (
      await fetch('https://raw.githubusercontent.com/hamm-r/uploader/main/1779255801770-854.jpg')
    ).buffer()
  }

  if (typeMenu === 1 && (!menuType || menuType === 'list')) {
    await conn.sendMessage(m.chat, {
      image: thumb,

      caption: ' ',

      footer: `
— ANYA MD —

❀ ${ucapan()} ${name}
❀ aku Anya, siap bantu kamu hari ini ✨

♡ Rank : ${role}
♡ Level : ${level}
♡ Peanut Limit : ${strLimit} 🥜

⌕ select menu below
© Anya MD
`.trim(),

      optionText: '🥜 Pilih Menu',
      optionTitle: 'List Menu Anya',

      offerText: '🎁 Special Menu!',
      offerCode: 'ANYA-MD',
      offerUrl: 'https://chat.whatsapp.com/KXDWrwd6j5h33AMVdAKFDD?s=cl&p=a&mlu=4',
      offerExpiration: Date.now() + 86400000,

      nativeFlow: [
        {
          text: '🍓 Pilih Kategori',

          sections: [
            {
              title: `🥜 Semua Kategori (${arrayMenu.length})`,

              rows: arrayMenu.map(v => ({
                header: 'Anya MD',

                title: `✦ ${formatTag(v)}`,

                description: `Menu kategori ${formatTag(v)} milik Anya`,

                id: `${usedPrefix + command} ${v}`
              }))
            }
          ],

          icon: 'default'
        },

        {
          text: '🍬 All Menu',

          id: `${usedPrefix + command} all`,

          icon: 'review'
        },

        {
          text: '📋 Copy Menu',

          copy: `${usedPrefix + command} all`
        },

        {
          text: '🤗 Group Anya',

          url: 'https://chat.whatsapp.com/KXDWrwd6j5h33AMVdAKFDD?s=cl&p=a&mlu=4',

          useWebview: true
        }
      ],

      interactiveAsTemplate: false

    }, { quoted: m })

  } else if (typeMenu === 2 && (!menuType || menuType === 'list')) {
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

  } else if (typeMenu === 3 && (!menuType || menuType === 'list')) {
    let txt = mainCaption + `\n\n────── 🍓 ──────\n`

    for (let tag of arrayMenu) {
      txt += `\n🥜 ${usedPrefix + command} ${tag}`
    }

    txt += `\n🥜 ${usedPrefix + command} all`

    await conn.sendMessage(m.chat, {
      image: thumb,
      caption: txt.trim()
    }, { quoted: m })

  } else {
    let detailText = `*ANYA MD*\n(heh? banyak banget menu 😳)\n`

    let tagsToShow = menuType === 'all'
      ? arrayMenu
      : (categories[menuType] ? [menuType] : [])

    if (tagsToShow.length === 0) {
      return m.reply(`Heh? menu *${text}* nggak ada 😵`)
    }

    for (let tag of tagsToShow) {
      detailText += `\n🍓 *${tag.toUpperCase()}*\n`

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

  let last = cooldown.get(m.sender) || 0

  if (Date.now() - last > 60000) {
    cooldown.set(m.sender, Date.now())

    await conn.sendFile(
      m.chat,
      'https://raw.githubusercontent.com/hamm-r/uploader/main/1778454338593-844.aac',
      'menu.aac',
      '',
      m,
      true,
      {
        mimetype: 'audio/mp4',
        ptt: true
      }
    )
  }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|help|perintah)$/i

export default handler