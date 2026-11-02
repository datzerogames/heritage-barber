// Servidor local para baixar os APKs pelo celular (mesmo Wi-Fi).
// Uso: node scripts/servidor.js   → abre a página com o QR code no computador.
const http=require("http"),fs=require("fs"),path=require("path"),os=require("os"),QR=require("qrcode");
const RAIZ=path.join(__dirname,"..");
const PORTA=+process.env.PORTA||8080;

const ip=Object.values(os.networkInterfaces()).flat().find(i=>i&&i.family==="IPv4"&&!i.internal&&!/^169\.254\./.test(i.address));
const IP=ip?ip.address:"localhost";
// Com URL_PUBLICA (ex.: endereço do túnel da Cloudflare) o QR aponta para a internet
const URL_CEL=process.env.URL_PUBLICA?process.env.URL_PUBLICA.replace(/\/?$/,"/"):`http://${IP}:${PORTA}/`;

const TIPOS={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".apk":"application/vnd.android.package-archive"};
const APKS=[
  {arq:"Heritage-Barber.apk",nome:"Heritage Barber",rotulo:"Versão final",desc:"Começa em branco, para uso real. A primeira conta criada é a do dono da barbearia.",destaque:true},
  {arq:"Heritage-Barber-DEMO.apk",nome:"Heritage Demo",rotulo:"Versão demo",desc:"Com clientes e agendamentos de exemplo, para mostrar o sistema. Entra com um toque."}
];
const tam=a=>{try{return (fs.statSync(path.join(RAIZ,"APKs",a)).size/1048576).toFixed(1)+" MB"}catch(e){return "não gerado"}};

const estilo=`<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;background:#19120b;color:#f0e0d4;font:15px/1.5 "Plus Jakarta Sans",system-ui,sans-serif;padding:24px 16px 40px}
.w{max-width:480px;margin:0 auto}
h1{font:700 34px/40px "Playfair Display",Georgia,serif;color:#e9c176;margin:8px 0 0;text-align:center}
.sub{text-align:center;color:#9a8f80;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin-bottom:24px}
.c{background:#261e17;border:1px solid rgba(197,160,89,.25);border-radius:8px;padding:16px;margin-top:12px}
.c.d{border-color:#c5a059}
.c b{font:600 20px "Playfair Display",Georgia,serif;color:#e9c176}
.c p{margin:4px 0 12px;color:#b3a796;font-size:13.5px}
a.bt{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:4px;background:#c5a059;color:#1a140f;font-weight:700;text-decoration:none}
a.bt.s{background:transparent;color:#f0e0d4;border:1px solid rgba(197,160,89,.5)}
small.t{color:#9a8f80}
ol{color:#b3a796;font-size:13.5px;padding-left:20px}
.qr{background:#fff;border-radius:8px;padding:14px;width:300px;height:300px;margin:0 auto}
.qr img{width:100%;height:100%;display:block}
.url{text-align:center;font:600 18px ui-monospace,Consolas,monospace;color:#e9c176;margin:14px 0 4px}
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap">`;

function paginaDownload(){
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baixar Heritage Barber</title>${estilo}</head><body><div class="w">
  <h1>✂ Heritage</h1><div class="sub">Barber CRM • Download</div>
  ${APKS.map(a=>`<div class="c ${a.destaque?"d":""}"><b>${a.nome}</b> <small class="t">· ${tam(a.arq)}</small><p>${a.desc}</p><a class="bt" href="/apks/${a.arq}" download>⬇ Baixar app Android</a></div>`).join("")}
  <div class="c"><b>Testar no navegador</b><p>Abre a versão demo aqui mesmo, sem instalar nada.</p><a class="bt s" href="/app/index.html?demo=1">Abrir demo no navegador</a></div>
  <div class="c"><b>Como instalar</b><ol><li>Toque em <b style="font:inherit;color:#e9c176">Baixar app Android</b>.</li><li>Abra o arquivo baixado (aviso na barra de notificações ou na pasta Downloads).</li><li>Se aparecer "instalação bloqueada", toque em <i>Configurações</i> e ative <i>Permitir desta fonte</i>.</li><li>Toque em <i>Instalar</i>.</li></ol></div>
  </div></body></html>`;
}
// QR code que baixa o APK direto (um por versão)
const linkApk=a=>URL_CEL+"apks/"+a.arq;
async function paginaQR(){
  const cards=[];
  for(const a of APKS){
    const qr=await QR.toDataURL(linkApk(a),{margin:1,width:600,color:{dark:"#19120b",light:"#ffffff"}});
    cards.push(`<div class="c ${a.destaque?"d":""}" style="text-align:center;flex:1 1 300px;max-width:380px"><div class="sub" style="margin:0 0 4px">${a.rotulo}</div><b>${a.nome}</b><p>${a.desc}</p><div class="qr"><img src="${qr}" alt="QR code para baixar ${a.nome}"></div><small class="t" style="display:block;margin-top:10px;word-break:break-all">${linkApk(a)}</small></div>`);
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR — Heritage Barber</title>${estilo}</head><body><div style="max-width:820px;margin:0 auto;text-align:center">
  <h1>✂ Heritage</h1><div class="sub">Aponte a câmera do celular para baixar</div>
  <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center">${cards.join("")}</div>
  <div class="url" style="font-size:14px">Página com as duas opções: ${URL_CEL}</div><small class="t">${process.env.URL_PUBLICA?"Funciona de qualquer lugar, com internet (Wi-Fi ou 4G).<br>O link só funciona enquanto este computador estiver ligado com o servidor aberto.":"O celular precisa estar no mesmo Wi-Fi deste computador.<br>Deixe a janela preta do servidor aberta enquanto baixa."}</small>
  </div></body></html>`;
}

function arquivo(res,p,baixar){
  fs.readFile(p,(e,buf)=>{
    if(e){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});return res.end("Não encontrado")}
    const h={"Content-Type":TIPOS[path.extname(p).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"};
    if(baixar)h["Content-Disposition"]=`attachment; filename="${path.basename(p)}"`;
    res.writeHead(200,h);res.end(buf);
  });
}

http.createServer(async(req,res)=>{
  const u=decodeURIComponent(new URL(req.url,"http://x").pathname);
  console.log(new Date().toLocaleTimeString("pt-BR"),req.socket.remoteAddress,u);
  if(u==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(paginaDownload())}
  if(u==="/qr"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(await paginaQR())}
  if(u.startsWith("/apks/")){const n=path.basename(u);if(APKS.some(a=>a.arq===n))return arquivo(res,path.join(RAIZ,"APKs",n),true)}
  if(u.startsWith("/app/")){const p=path.normalize(path.join(RAIZ,"www",u.slice(5)));if(p.startsWith(path.join(RAIZ,"www")))return arquivo(res,p.endsWith(path.sep)?path.join(p,"index.html"):p)}
  res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});res.end("Não encontrado");
}).listen(PORTA,"0.0.0.0",()=>{
  console.log(`\n  Heritage Barber — servidor de download ligado\n  No celular (mesmo Wi-Fi): ${URL_CEL}\n  QR code: http://localhost:${PORTA}/qr\n  Para desligar: feche esta janela.\n`);
});
