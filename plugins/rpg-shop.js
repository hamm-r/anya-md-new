let handler = async (m, { conn }) => {

	let e = global.rpg.emoticon
	let text = `
🌸 *ANYA RPG SHOP* ❀

━━━━━━━━━━━━━━
🛒 *ITEM SHOP*

${e('potion')} Potion : 5000
${e('sword')} Sword : 15000
${e('pickaxe')} Pickaxe : 10000
${e('fishingrod')} Fishing Rod : 12000
${e('armor')} Armor : 20000

🪱 Bait : 1000
🌱 Fertilizer : 2500

━━━━━━━━━━━━━━
📌 *Cara Membeli*

.buy nama_item jumlah

Contoh:
.buy potion
.buy potion 5
.buy sword

━━━━━━━━━━━━━━
✦ Anya RPG System
`.trim()

	await conn.sendMessage(m.chat, {
		text: text
	}, { quoted: m })

}

handler.help = ['shop']
handler.tags = ['rpg']
handler.command = /^(shop)$/i
handler.group = true

export default handler