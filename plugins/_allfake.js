import fs from 'fs'
import moment from 'moment-timezone'
import path from 'path'

let sharp
try {
  sharp = (await import('sharp')).default
} catch {}

let handler = m => m

handler.all = async function (m, { __dirname }) {

  global.wm = '❀ ᴀɴʏᴀ ᴍᴅ ❀'
  global.fsizedoc = 2024

  let thumb

  try {
    thumb = fs.readFileSync(
      path.resolve(__dirname, '../media/thumbnail.jpg')
    )
  } catch {
    thumb = Buffer.alloc(0)
  }

  global.thumb = thumb

  if (!this._autoFakePatched) {

    this._autoFakePatched = true

    const originalSend = this.sendMessage.bind(this)

    this.sendMessage = async (
      jid,
      content = {},
      options = {}
    ) => {

      if (Array.isArray(jid)) {

        let results = []

        for (let id of jid) {
          results.push(
            await this.sendMessage(
              id,
              content,
              options
            )
          )
        }

        return results
      }

      if (
        content.pin ||
        content.react ||
        content.delete ||
        content.poll ||
        content.protocolMessage ||
        content.contacts
      ) {
        return originalSend(jid, content, options)
      }

      if (
        content.text &&
        !content.linkPreview &&
        !content.image &&
        !content.video &&
        !content.audio &&
        !content.document &&
        !content.sticker &&
        !content.buttons &&
        !content.templateButtons &&
        !content.sections &&
        !content.nativeFlow &&
        !content.nativeFlowMessage &&
        !content.interactiveMessage
      ) {

        let resizedThumb = thumb

        if (sharp && thumb.length) {
          try {
            resizedThumb = await sharp(thumb)
              .resize(300, 300, {
                fit: 'cover'
              })
              .jpeg({
                quality: 85
              })
              .toBuffer()
          } catch {
            resizedThumb = thumb
          }
        }

        return originalSend(jid, {

          text: `https://github.com/hamm-r/${'\u2063'.repeat(500)}

${content.text}`,

          linkPreview: {
            'matched-text': 'https://github.com/hamm-r',

            title: '❀ ᴀɴʏᴀ ᴍᴅ ❀',

            description: momentGreeting(),

            previewType: 0,

            jpegThumbnail: resizedThumb
          }

        }, {
          ...options
        })
      }

      return originalSend(jid, content, options)
    }
  }
}

export default handler

function momentGreeting() {

  const hour = moment
    .tz('Asia/Jakarta')
    .hour()

  if (hour >= 4 && hour < 10) {
    return '🥜 Waku waku! Ohayou~'
  }

  if (hour >= 10 && hour < 15) {
    return '🌸 Konnichiwa! Anya siap membantu~'
  }

  if (hour >= 15 && hour < 18) {
    return '🍃 Sore yang indah desu~'
  }

  if (hour >= 18 && hour < 24) {
    return '🌙 Konbanwa! Jangan tidur kemalaman ya~'
  }

  return '💫 Oyasumi... mimpi indah~'
}