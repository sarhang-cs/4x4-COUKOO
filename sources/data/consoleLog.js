import * as THREE from 'three/webgpu'

const text = `
╔═ 4X4 COUKOO ═════════════╗
║ Welcome to 4X4 COUKOO — an interactive 3D driving world.
║ If you are curious about the stack and how I built this project, here’s everything you need to know.
╚══════════════════════════╝

╔═ Socials ════════════════╗
║ Mail           ⇒ sarhang.pasha123@gmail.com
║ X              ⇒ https://x.com/PashaSarha1818
║ Instagram      ⇒ https://www.instagram.com/sarhang.io
║ Discord        ⇒ https://discord.gg/5JrmtR8wQS
║ Youtube        ⇒ https://youtube.com/@gamepixel1
║ Twitch         ⇒ https://twitch.tv/sarhangpasha1
║ GitHub         ⇒ https://github.com/sarhang-cs
║ LinkedIn       ⇒ https://www.linkedin.com/in/sarhang-pasha-8a9501351
╚══════════════════════════╝

╔═ Debug ══════════════════╗
║ You can access the debug mode by adding #debug at the end of the URL and reloading.
║ Press [V] to toggle the free camera.
╚══════════════════════════╝

╔═ Three.js ═══════════════╗
║ Three.js is the library I’m using to render this 3D world (release: ${THREE.REVISION})
║ https://threejs.org/
║ It was created by mr.doob (https://x.com/mrdoob, https://github.com/mrdoob),
║ followed by hundreds of awesome developers,
║ one of which being Sunag (https://x.com/sea3dformat, https://github.com/sunag) who added TSL,
║ enabling the use of both WebGL and WebGPU, making this driving world possible.
╚══════════════════════════╝

╔═ Devlogs ════════════════╗
║ I share progress, experiments and updates on my Youtube channel.
║ https://youtube.com/@gamepixel1
╚══════════════════════════╝

╔═ Source code ════════════╗
║ Public code, experiments and project updates are available on GitHub.
║ https://github.com/sarhang-cs
╚══════════════════════════╝

╔═ Contact ════════════════╗
║ Behance   ⇒ https://www.behance.net/sarhangsalah
║ Telegram  ⇒ https://t.me/sarhang_salah
║ WhatsApp  ⇒ https://wa.me/9647501504608
╚══════════════════════════╝

╔═ Some more links ════════╗
║ Rapier (Physics library)  ⇒ https://rapier.rs/
║ Howler.js (Audio library) ⇒ https://howlerjs.com/
║ Amatic SC (Fonts)         ⇒ https://fonts.google.com/specimen/Amatic+SC
║ Nunito (Fonts)            ⇒ https://fonts.google.com/specimen/Nunito?query=Nunito
╚══════════════════════════╝
`
let finalText = ''
let finalStyles = []
const stylesSet = {
    letter: 'color: #ffffff; font: 400 1em monospace;',
    pipe: 'color: #D66FFF; font: 400 1em monospace;',
}
let currentStyle = null
for(let i = 0; i < text.length; i++)
{
    const char = text[i]

    const style = char.match(/[╔║═╗╚╝╔╝]/) ? 'pipe' : 'letter'
    if(style !== currentStyle)
    {
        currentStyle = style
        finalText += '%c'

        finalStyles.push(stylesSet[currentStyle])
    }
    finalText += char
}

export default [finalText, ...finalStyles]
