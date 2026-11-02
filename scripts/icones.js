// Gera as imagens-fonte do ícone e da tela de abertura (assets/*.png)
// Uso: node scripts/icones.js [demo]
const sharp=require("sharp"),fs=require("fs"),path=require("path");
const demo=process.argv[2]==="demo";
const out=path.join(__dirname,"..","assets");fs.mkdirSync(out,{recursive:true});

const TESOURA="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z";
const faixa=demo?`<g transform="rotate(-35 512 512)"><rect x="-200" y="700" width="1424" height="120" fill="#e98f58"/><text x="512" y="785" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="78" letter-spacing="14" text-anchor="middle" fill="#321200">DEMO</text></g>`:"";

// Primeiro plano (tesoura dentro do anel de latão), centrado na área segura do ícone adaptativo
const frente=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <circle cx="512" cy="512" r="300" fill="none" stroke="#c5a059" stroke-width="14"/>
  <circle cx="512" cy="512" r="274" fill="none" stroke="#c5a059" stroke-opacity=".35" stroke-width="4"/>
  <g transform="translate(512 512) scale(17) translate(-12 -12)"><path d="${TESOURA}" fill="#e9c176"/></g>
  ${faixa}
</svg>`;
const fundo=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#3c332b"/><stop offset="1" stop-color="#19120b"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/></svg>`;
const completo=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${fundo.replace(/^<svg[^>]*>|<\/svg>$/g,"")}${frente.replace(/^<svg[^>]*>|<\/svg>$/g,"")}</svg>`;
const splash=`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="#19120b"/>
  <g transform="translate(1366 1250) scale(.55) translate(-512 -512)">${frente.replace(/^<svg[^>]*>|<\/svg>$/g,"")}</g>
  <text x="1366" y="1660" font-family="Georgia,serif" font-weight="700" font-size="150" text-anchor="middle" fill="#e9c176">Heritage</text>
  <text x="1366" y="1760" font-family="Arial,sans-serif" font-weight="600" font-size="54" letter-spacing="18" text-anchor="middle" fill="#9a8f80">${demo?"BARBER CRM • DEMO":"BARBER CRM"}</text></svg>`;

(async()=>{
  await sharp(Buffer.from(frente)).png().toFile(path.join(out,"icon-foreground.png"));
  await sharp(Buffer.from(fundo)).png().toFile(path.join(out,"icon-background.png"));
  await sharp(Buffer.from(completo)).png().toFile(path.join(out,"icon-only.png"));
  await sharp(Buffer.from(splash)).png().toFile(path.join(out,"splash.png"));
  await sharp(Buffer.from(splash)).png().toFile(path.join(out,"splash-dark.png"));
  console.log("ícones "+(demo?"DEMO":"completos")+" gerados em assets/");
})();
