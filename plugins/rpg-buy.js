let handler = async (m, { conn, args }) => {

	let user = global.db.data.users[m.sender]
	let e = global.rpg.emoticon
	let item = (args[0] || '').toLowerCase()
	let jumlah = parseInt(args[1])

	if (isNaN(jumlah)) jumlah = 1

	let shop = {
		potion: 5000,
		sword: 15000,
		pickaxe: 10000,
		fishingrod: 12000,
		armor: 20000,
		bait: 1000,
		fertilizer: 2500,
		limit: 25000
	}

	if (!(item in shop))
		return conn.sendMessage(m.chat, {
			text: `
🌸 *ANYA RPG SHOP* ❀

${e('potion')} Potion : 5000
${e('sword')} Sword : 15000
${e('pickaxe')} Pickaxe : 10000
${e('fishingrod')} Fishing Rod : 12000
${e('armor')} Armor : 20000
🪱 Bait : 1000
🌱 Fertilizer : 2500
🎫 Limit : 25000

Gunakan:
.buy nama_item jumlah

Contoh:
.buy potion 2
.buy limit 5
.buy sword
`.trim()
		}, { quoted: m })

	let total = shop[item] * jumlah

	if (user.money < total)
		return m.reply(`${e('money')} Money kamu tidak cukup`)

	user.money -= total
	if (item === 'limit') {
		user.limit += jumlah
	} else {
		user[item] += jumlah
	}

	await conn.sendMessage(m.chat, {
		text: `
❀ *PEMBELIAN BERHASIL* ❀

Item : ${item}
Jumlah : ${jumlah}

${e('money')} Sisa Money : ${user.money}
`.trim()
	}, { quoted: m })

}

handler.help = ['buy']
handler.tags = ['rpg']
handler.command = /^(buy)$/i
handler.group = true

export default handler