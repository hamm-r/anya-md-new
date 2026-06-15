let handler = async (m, { conn }) => {

  let anyaQuotes = [
    'Waku waku~ Anya datang! 🥜✨',
    'Hehe~ Anya dipanggil ya? (≧▽≦)',
    'Anya tahu kamu manggil Anya~ 🥜',
    'Chi chi~ Anya siap membantu!',
    'Yor mama cantik... Loid papa keren... 😌',
    'Anya suka kacang dan starlight ⭐',
    'Eh? Ada misi baru buat Anya? 👀',
    'Waku waku intensifies!! ✨'
  ]

  let text = anyaQuotes[Math.floor(Math.random() * anyaQuotes.length)]

  await conn.sendMessage(
    m.chat,
    {
      text
    },
    {
      quoted: {
        key: {
          fromMe: false,
          participant: '0@s.whatsapp.net',
          remoteJid: 'status@broadcast'
        },
        message: {
          conversation: '🌸 Anya MD - Spy x Family 🌸'
        }
      }
    }
  )
}

handler.customPrefix = /^(anya|bot|tes|test)$/i
handler.command = new RegExp

export default handler