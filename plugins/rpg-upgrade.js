let handler = async (m, { conn, args }) => {

let user = global.db.data.users[m.sender]
let e = global.rpg.emoticon

let type = (args[0] || '').toLowerCase()
let list = `
🌸 *ANYA RPG UPGRADE* ❀

Upgrade tools untuk meningkatkan kekuatan.

Tools tersedia:

⚔️ .upgrade sword
⛏️ .upgrade pickaxe
🎣 .upgrade fishingrod
🥼 .upgrade armor

Harga upgrade:
💹 100000 Money
💎 1 Diamond
`.trim()

if (!type) {
return conn.sendMessage(m.chat,{
text:list
},{quoted: global.fstatus})
}

let hargaMoney = 100000
let hargaDiamond = 1

if (user.money < hargaMoney)
return conn.reply(m.chat,'Money tidak cukup',global.fstatus)

if (user.diamond < hargaDiamond)
return conn.reply(m.chat,'Diamond tidak cukup',global.fstatus)

switch(type){

case 'sword':
user.sword += 1
user.sworddurability += 50
break

case 'pickaxe':
user.pickaxe += 1
user.pickaxedurability += 50
break

case 'fishingrod':
user.fishingrod += 1
user.fishingroddurability += 50
break

case 'armor':
user.armor += 1
user.armordurability += 50
break

default:
return conn.reply(m.chat,'Tools tidak ditemukan',global.fstatus)

}

user.money -= hargaMoney
user.diamond -= hargaDiamond

let text = `
🌸 *ANYA RPG UPGRADE* ❀

Berhasil upgrade *${type}*

⚙️ Level : ${user[type]}
🔧 Durability : +50

-${hargaMoney} Money
-${hargaDiamond} Diamond
`.trim()

conn.sendMessage(m.chat,{
text
},{quoted: global.fstatus})

}

handler.help = ['upgrade']
handler.tags = ['rpg']
handler.command = /^(upgrade)$/i
handler.group = true

export default handler