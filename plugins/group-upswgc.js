import * as baileys from "@itsliaaa/baileys";
import crypto from "node:crypto";
import { PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";

let handler = async (m, { conn, text }) => {

  let args = (text || '').split('|').map(v => v.trim()).filter(v => v);
  let teks = '', warna = '';

  if (args.length > 0) teks = args[0];
  if (args.length > 1) warna = args[1];

  let id = m.chat; // ✅ selalu ke grup saat ini

  const quoted = m.quoted || m;
  const mime = quoted?.mimetype || '';
  const caption = quoted?.caption || teks || '';

  const warnaMap = {
    biru:'#34B7F1',
    hijau:'#25D366',
    kuning:'#FFD700',
    jingga:'#FF8C00',
    merah:'#FF3B30',
    ungu:'#9C27B0',
    abu:'#9E9E9E',
    hitam:'#000000',
    putih:'#FFFFFF',
    cyan:'#00BCD4'
  };

  const bgColor = warnaMap[warna?.toLowerCase()];

  // ❌ validasi
  if (!caption && !m.quoted) {
    return m.reply(`✨ *SW Grup*

Contoh:
.swgc halo
.swgc halo|merah

Reply media:
.swgc

Warna:
biru hijau kuning merah ungu hitam putih cyan`);
  }

  // =========================
  // 📦 MEDIA
  // =========================
  if (/image|video|audio/.test(mime)) {
    const buffer = await quoted.download().catch(() => null);
    if (!buffer) return m.reply('⚠️ Gagal ambil media');

    let content = {};

    if (/image/.test(mime)) {
      content = { image: buffer, caption };
    } else if (/video/.test(mime)) {
      content = { video: buffer, caption };
    } else if (/audio/.test(mime)) {
      const vn = await toVN(buffer);
      content = {
        audio: vn,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      };
    }

    await groupStatus(conn, id, content);
    return m.reply(`✅ Media jadi status grup`);
  }

  // =========================
  // 📝 TEXT
  // =========================
  let content = bgColor
    ? { text: caption, backgroundColor: bgColor }
    : { text: caption };

  await groupStatus(conn, id, content);
  return m.reply(`✅ Status grup terkirim`);
};

// =========================
// 🚀 SEND STATUS
// =========================
async function groupStatus(conn, jid, content) {
  const { backgroundColor } = content;
  delete content.backgroundColor;

  const inside = await baileys.generateWAMessageContent(content, {
    upload: conn.waUploadToServer,
    backgroundColor
  });

  const secret = crypto.randomBytes(32);

  const msg = baileys.generateWAMessageFromContent(jid, {
    messageContextInfo: { messageSecret: secret },
    groupStatusMessageV2: {
      message: {
        ...inside,
        messageContextInfo: { messageSecret: secret }
      }
    }
  }, {});

  await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
  return msg;
}

// =========================
// 🎧 AUDIO → VN
// =========================
async function toVN(buffer) {
  return new Promise((resolve, reject) => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks = [];

    input.end(buffer);

    ffmpeg(input)
      .noVideo()
      .audioCodec('libopus')
      .format('ogg')
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe(output);

    output.on('data', c => chunks.push(c));
  });
}

handler.help = ['swgc','upswgc'];
handler.tags = ['group'];
handler.command = /^swgc|upswgc$/i;
handler.admin = true;

export default handler;