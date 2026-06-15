let handler = m => m

const PREFIX = '.'

const getText = m => {
  return (
    m.text ||
    m.caption ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    ''
  )
}

const normalizeJid = jid => {
  if (!jid) return ''
  return String(jid).split('@')[0].split(':')[0]
}

const normalizeCmd = v => {
  return String(v || '').toLowerCase().trim()
}

const getTarget = (m, text) => {
  if (m.mentionedJid?.length) return m.mentionedJid[0]
  if (m.quoted?.sender) return m.quoted.sender

  let number = text.replace(/[^0-9]/g, '')
  if (number.length < 8) return null

  return number + '@s.whatsapp.net'
}

const commandMap = {
  putar: 'play',
  lagu: 'play',
  musik: 'play',
  music: 'play',
  play: 'play',

  download: 'ytmp3',
  dl: 'ytmp3',
  donlot: 'ytmp3',
  ytmp3: 'ytmp3',
  mp3: 'ytmp3',

  video: 'ytmp4',
  ytmp4: 'ytmp4',
  mp4: 'ytmp4',

  tiktok: 'tiktok',
  tt: 'tiktok',

  sticker: 'sticker',
  stiker: 'sticker',
  stik: 'sticker',
  s: 's',

  gambar: 'gimage',
  image: 'gimage',
  gimage: 'gimage',

  google: 'google',
  pinterest: 'pinterest',
  pin: 'pinterest'
}

const detectDownloadCommand = (rawCmd, q, fallbackCmd) => {
  if (!/^(download|dl|donlot)$/i.test(rawCmd)) {
    return fallbackCmd
  }

  if (/tiktok\.com|vt\.tiktok\.com/i.test(q)) {
    return 'tiktok'
  }

  if (/youtu\.be|youtube\.com/i.test(q)) {
    return 'ytmp3'
  }

  return fallbackCmd
}

const skipPlugin = name => {
  return /daftar|register|verify|verif|reg/i.test(name)
}

const getPluginHelps = plugin => {
  if (!plugin?.help) return []

  let helps = Array.isArray(plugin.help)
    ? plugin.help
    : [plugin.help]

  return helps
    .filter(v => typeof v === 'string')
    .map(v => normalizeCmd(v.split(' ')[0]))
}

const getPluginCommands = plugin => {
  if (!plugin?.command) return []

  if (typeof plugin.command === 'string') {
    return [normalizeCmd(plugin.command)]
  }

  if (Array.isArray(plugin.command)) {
    return plugin.command
      .filter(v => typeof v === 'string')
      .map(v => normalizeCmd(v))
  }

  return []
}

const isAcceptCommand = (plugin, command) => {
  command = normalizeCmd(command)

  let helps = getPluginHelps(plugin)
  if (helps.includes(command)) return true

  let commands = getPluginCommands(plugin)
  if (commands.includes(command)) return true

  return false
}

const findPlugin = command => {
  command = normalizeCmd(command)

  for (let name in global.plugins) {
    let plugin = global.plugins[name]

    if (!plugin) continue
    if (plugin.disabled) continue
    if (typeof plugin !== 'function') continue
    if (skipPlugin(name)) continue

    if (isAcceptCommand(plugin, command)) {
      return { name, plugin }
    }
  }

  return null
}

handler.before = async function (m, extra) {
  let {
    conn,
    isAdmin,
    isOwner,
    isBotAdmin,
    isROwner,
    isPrems,
    participants,
    groupMetadata,
    user,
    bot,
    isRAdmin,
    match,
    chatUpdate,
    __dirname,
    __filename
  } = extra

  let text = getText(m)

  if (!text) return
  if (m.fromMe) return

  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = {}
  }

  let chat = global.db.data.chats[m.chat]

  if (!chat.autogpt || chat.isBanned) return
  if (!/^anya[\s,]+/i.test(text)) return

  let input = text.replace(/^anya[\s,]+/i, '').trim()
  if (!input) return

  let lower = input.toLowerCase()

  // ================= KICK / ADD MEMBER =================
  let isKick =
    /^(kick|kik|keluarin|keluarkan|tendang|remove)/i.test(lower)

  let isAdd =
    /^(add|tambah|tambahkan|masukin|invite|undang)/i.test(lower)

  if (isKick || isAdd) {
    if (!m.isGroup) return m.reply('Ini cuma bisa di grup ehehe~')

    if (!isAdmin && !isOwner) {
      return m.reply('Hweh, cuma admin/owner yang boleh 🥹')
    }

    if (!isBotAdmin) {
      return m.reply('Anya belum admin 😭')
    }

    let target = getTarget(m, input)

    if (!target) {
      return m.reply(
`Contoh:
Anya keluarkan @user
Anya tambahkan 628xxxx`
      )
    }

    if (normalizeJid(target) === normalizeJid(conn.user.jid)) {
      return m.reply('Masa Anya disuruh keluar sendiri 🫠')
    }

    try {
      if (isKick) {
        await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
        return m.reply('Sudah Anya keluarkan 🤗')
      }

      if (isAdd) {
        await conn.groupParticipantsUpdate(m.chat, [target], 'add')
        return m.reply('Sudah Anya tambahkan 🤗')
      }
    } catch (e) {
      return m.reply('Gagal, mungkin privasi target aktif 🥹')
    }
  }

  // ================= BUKA / TUTUP GRUP =================
  let isOpenGroup =
    /^(buka|open|opengc|bukagrup|bukagc)(\s|$)/i.test(lower) ||
    /^buka\s+(grup|gc)(\s|$)/i.test(lower)

  let isCloseGroup =
    /^(tutup|close|closegc|tutupgrup|tutupgc)(\s|$)/i.test(lower) ||
    /^tutup\s+(grup|gc)(\s|$)/i.test(lower)

  if (isOpenGroup || isCloseGroup) {
    if (!m.isGroup) return m.reply('Ini cuma bisa di grup ehehe~')

    if (!isAdmin && !isOwner) {
      return m.reply('Hweh, cuma admin/owner yang boleh ')
    }

    if (!isBotAdmin) {
      return m.reply('Anya belum admin ')
    }

    try {
      if (isOpenGroup) {
        await conn.groupSettingUpdate(m.chat, 'not_announcement')
        return m.reply('Waku waku~ Grup berhasil dibuka ')
      }

      if (isCloseGroup) {
        await conn.groupSettingUpdate(m.chat, 'announcement')
        return m.reply('Hehe~ Grup berhasil ditutup ')
      }
    } catch (e) {
      console.log('Open/Close Group Error:', e)
      return m.reply('Hweh... gagal buka/tutup grup ')
    }
  }

  // ================= COMMAND ROUTER =================
  let split = input.split(/\s+/)
  let rawCmd = normalizeCmd(split.shift())
  let args = split
  let q = args.join(' ')

  let cmd = commandMap[rawCmd] || rawCmd
  cmd = detectDownloadCommand(rawCmd, q, cmd)

  let found = findPlugin(cmd)
  if (!found) return

  let { name, plugin } = found

  try {
    console.log('[ANYA CMD]', cmd, '=>', name)

    let fakeM = Object.create(m)

    Object.defineProperty(fakeM, 'text', {
      value: PREFIX + cmd + (q ? ' ' + q : ''),
      writable: true,
      configurable: true
    })

    Object.defineProperty(fakeM, 'quoted', {
      value: m.quoted,
      configurable: true
    })

    Object.defineProperty(fakeM, 'mentionedJid', {
      value: m.mentionedJid || [],
      configurable: true
    })

    Object.defineProperty(fakeM, 'isCommand', {
      value: true,
      writable: true,
      configurable: true
    })

    Object.defineProperty(fakeM, 'plugin', {
      value: name,
      writable: true,
      configurable: true
    })

    let exec = {
      match,
      usedPrefix: PREFIX,
      noPrefix: cmd + (q ? ' ' + q : ''),
      _args: args,
      args,
      command: cmd,
      text: q,
      conn,
      participants,
      groupMetadata,
      user,
      bot,
      isROwner,
      isOwner,
      isRAdmin,
      isAdmin,
      isBotAdmin,
      isPrems,
      chatUpdate,
      __dirname,
      __filename
    }

    await plugin.call(this, fakeM, exec)

    return true

  } catch (e) {
    console.log('Anya Command Error:', e)
    return m.reply('Hweh... Anya gagal jalanin command itu 🥹')
  }
}

export default handler