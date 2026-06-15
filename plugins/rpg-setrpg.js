let handler = async (m,{conn,args})=>{

let user = global.db.data.users[m.sender]

let type = (args[0]||'').toLowerCase()

if(type !== 'anya')
return conn.reply(m.chat,'Gunakan:\n.setrpg anya',m)

if(user.anya)
return conn.reply(m.chat,'Kamu sudah menjadi Adventurer Anya',m)

user.anya = true

conn.reply(m.chat,`
🌸 *ANYA RPG* ❀

Selamat datang Adventurer!

Sekarang kamu bisa berburu monster dengan:
.huntanya
`,m)

}

handler.help = ['setrpg']
handler.tags = ['rpg']
handler.command = /^(setrpg)$/i
handler.group = true

export default handler