let handler = async (m) => {
	global.db.data.chats[m.chat].isBanned = true;
	m.reply('Done!');
};
handler.help = ['banchat2'];
handler.tags = ['owner'];
handler.command = /^(banchat2|bnc2)$/i;
handler.owner = true;

export default handler;