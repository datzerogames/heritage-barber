(function(){
"use strict";
const CFG=window.APP_CONFIG||{};
const DEMO=window.APP_MODE==="demo"||/[?&]demo=1/.test(location.search);
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());

const BRL=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- Datas (sempre no fuso local) ---------- */
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseD=s=>{const p=s.split("-").map(Number);return new Date(p[0],p[1]-1,p[2]||1)};
let today=ymd(new Date());
const agoraHM=()=>{const d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes())};
const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const SEMANA=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
// Barbeiros de exemplo (só a DEMO usa). Na versão final o dono cadastra a equipe na aba Equipe.
const BARB_EXEMPLO=CFG.barbeirosDemo||CFG.barbeiros||["João","Marco","Rafael","Carlos"];
// Lista viva dos barbeiros ativos (atualizada a partir dos dados; o array é sempre o mesmo objeto)
const BARBEIROS=[];
function atualizaBarbeiros(){BARBEIROS.splice(0,BARBEIROS.length,...(data.barbeiros||[]).filter(b=>b.ativo!==false).map(b=>b.nome))}
const SERVICOS=CFG.servicos||[{nome:"Corte",v:50}];
const HORARIOS=CFG.horarios||["09:00","10:00","11:00","14:00","15:00","16:00","17:00"];
const FECHA=CFG.fechaAs||"18:00";
const DUR=CFG.duracaoMin||30;
const COMISSAO=CFG.comissao??0.3;
const MESES_FRENTE=CFG.mesesAFrente||12;
const METODOS=["Dinheiro","Pix","Débito","Crédito"];

function addDays(n,base){const d=parseD(base||today);d.setDate(d.getDate()+n);return ymd(d)}
function dayName(s){const d=parseD(s);return SEMANA[d.getDay()]+", "+d.getDate()+" de "+MESES[d.getMonth()]+" de "+d.getFullYear()}
const fmtData=s=>s.split("-").reverse().join("/");
function shiftMes(key,n){const d=parseD(key+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
const byDH=(a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora);
const diasEntre=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
const somaMin=(hm,n)=>{const p=hm.split(":").map(Number),t=p[0]*60+p[1]+n;return pad(Math.floor(t/60))+":"+pad(t%60)};

/* =============================================================
   DADOS — duas implementações com a mesma interface
   ============================================================= */
let data={agendamentos:[],recebimentos:[],usuarios:[],barbeiros:[]};
let ocup=[];          // horários ocupados (sem nomes) — cliente na versão completa
let user=null,isAdmin=false,isBarb=false;   // dono (admin), barbeiro ou cliente
const equipe=()=>isAdmin||isBarb;

/* ---------- Dados no aparelho (localStorage) ----------
   vazio=false → DEMO, com dados de exemplo.
   vazio=true  → versão final sem servidor: começa em branco e a primeira conta criada é a do dono. */
function LocalStore(vazio){
  const KEY=vazio?"heritage-v1":"heritage-demo-v1",UKEY=vazio?"heritage-user":"heritage-demo-user";
  function seed(){
    if(vazio)return{usuarios:[],agendamentos:[],recebimentos:[],barbeiros:[]};
    const A=(id,d,h,cid,cli,tel,b,svcs,st)=>({id,data:addDays(d),hora:h,clienteId:cid,cliente:cli,tel,barbeiro:b,servicos:svcs,servico:svcs.join(", "),v:svcs.reduce((s,n)=>s+((SERVICOS.find(x=>x.nome===n)||{}).v||0),0),status:st});
    const b=i=>BARB_EXEMPLO[i%BARB_EXEMPLO.length],h=i=>HORARIOS[i%HORARIOS.length],s=i=>SERVICOS[i%SERVICOS.length].nome;
    const ag=[
      A(1,0,h(0),2,"João Silva","(11) 98765-4321",b(0),[s(0)],"confirmado"),
      A(2,0,h(2),3,"Pedro Costa","(11) 99876-5432",b(1),[s(1)],"confirmado"),
      A(3,0,h(4),4,"Lucas Ferreira","(11) 97654-3210",b(2),[s(0)],"pendente"),
      A(4,0,h(7),null,"Ana Souza","(11) 96543-2109",b(3),[s(3)],"confirmado"),
      A(5,0,h(9),null,"Bruno Oliveira","(11) 95432-1098",b(0),[s(2)],"confirmado"),
      A(6,-30,h(3),5,"Cliente Teste","(11) 98888-8888",b(1),[s(1)],"concluido"),
      A(7,-40,h(5),null,"Felipe Gomes","(11) 94321-0987",b(1),[s(0)],"concluido"),
      A(8,-12,h(1),2,"João Silva","(11) 98765-4321",b(0),[s(0),s(4)],"concluido"),
      A(9,3,h(6),5,"Cliente Teste","(11) 98888-8888",b(0),[s(0)],"confirmado"),
      A(10,30,h(2),5,"Cliente Teste","(11) 98888-8888",b(2),[s(2)],"confirmado"),
      A(11,45,h(10),2,"João Silva","(11) 98765-4321",b(0),[s(0),s(4)],"confirmado"),
      A(12,70,h(1),null,"Ricardo Alves","(11) 93210-9876",b(1),[s(3)],"pendente"),
    ];
    return{
      usuarios:[
        {id:1,email:"admin@barber.com",senha:"admin",nome:"Arthur",tel:"(11) 99999-9999",tipo:"admin"},
        {id:2,email:"joao@email.com",senha:"123456",nome:"João Silva",tel:"(11) 98765-4321",tipo:"cliente"},
        {id:3,email:"pedro@email.com",senha:"123456",nome:"Pedro Costa",tel:"(11) 99876-5432",tipo:"cliente"},
        {id:4,email:"lucas@email.com",senha:"123456",nome:"Lucas Ferreira",tel:"(11) 97654-3210",tipo:"cliente"},
        {id:5,email:"teste@barber.com",senha:"teste123",nome:"Cliente Teste",tel:"(11) 98888-8888",tipo:"cliente"},
        {id:6,email:"barbeiro@barber.com",senha:"123456",nome:BARB_EXEMPLO[0],tel:"(11) 97777-0001",tipo:"barbeiro",barbeiro:BARB_EXEMPLO[0]},
      ],
      barbeiros:barbeirosExemplo(),
      agendamentos:ag,
      recebimentos:[
        {id:1,agendamentoId:6,data:addDays(-30),hora:somaMin(h(3),25),cliente:"Cliente Teste",barbeiro:b(1),servico:s(1),v:ag[5].v,metodo:"Pix"},
        {id:2,agendamentoId:7,data:addDays(-40),hora:somaMin(h(5),25),cliente:"Felipe Gomes",barbeiro:b(1),servico:s(0),v:ag[6].v,metodo:"Dinheiro"},
        {id:3,agendamentoId:8,data:addDays(-12),hora:somaMin(h(1),25),cliente:"João Silva",barbeiro:b(0),servico:ag[7].servico,v:ag[7].v,metodo:"Crédito"},
        {id:4,data:addDays(-1),hora:"10:20",cliente:"Marcos Paulo",barbeiro:b(2),servico:s(1),v:SERVICOS[1%SERVICOS.length].v,metodo:"Débito"},
        {id:5,data:addDays(-1),hora:"15:40",cliente:"Gustavo Lima",barbeiro:b(3),servico:s(0),v:SERVICOS[0].v,metodo:"Pix"},
      ]
    };
  }
  function barbeirosExemplo(){return BARB_EXEMPLO.map((n,i)=>({id:i+1,nome:n,tel:"(11) 97777-000"+(i+1),email:i===0?"barbeiro@barber.com":"",ativo:true}))}
  let db;
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}};
  const loadDb=()=>{try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(!db||!db.agendamentos){db=seed();persist()}
    if(!db.barbeiros){db.barbeiros=vazio?[]:barbeirosExemplo();persist()}};   // dados de versões antigas
  const nextId=arr=>Math.max(0,...arr.map(x=>+x.id||0))+1;
  const pub=u=>({id:u.id,nome:u.nome,email:u.email,tel:u.tel,tipo:u.tipo,barbeiro:u.barbeiro});
  const sync=()=>{data.agendamentos=db.agendamentos;data.recebimentos=db.recebimentos;data.usuarios=db.usuarios.map(pub);data.barbeiros=db.barbeiros;atualizaBarbeiros()};
  const mesmoEmail=(a,b)=>String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase();
  return{
    async init(){loadDb();sync();try{const id=JSON.parse(localStorage.getItem(UKEY));const u=db.usuarios.find(x=>x.id===id);return u?pub(u):null}catch(e){return null}},
    async login(email,senha){const u=db.usuarios.find(x=>mesmoEmail(x.email,email)&&x.senha===senha);if(!u)throw new Error("Email ou senha incorretos");try{localStorage.setItem(UKEY,JSON.stringify(u.id))}catch(e){}return pub(u)},
    async loginDemo(tipo){const u=db.usuarios.find(x=>x.tipo===tipo&&(tipo!=="cliente"||x.email==="teste@barber.com"))||db.usuarios.find(x=>x.tipo===tipo);if(!u)throw new Error("Conta de exemplo não encontrada. Toque em Restaurar exemplos.");try{localStorage.setItem(UKEY,JSON.stringify(u.id))}catch(e){}return pub(u)},
    async addBarbeiro({nome,tel,email,senha}){
      if(db.barbeiros.some(b=>b.nome.trim().toLowerCase()===nome.trim().toLowerCase()))throw new Error("Já existe um barbeiro com esse nome");
      if(email&&db.usuarios.some(x=>mesmoEmail(x.email,email)))throw new Error("Esse email já tem conta no app");
      db.barbeiros.push({id:nextId(db.barbeiros),nome,tel,email:email||"",ativo:true});
      if(email)db.usuarios.push({id:nextId(db.usuarios),email,senha,nome,tel,tipo:"barbeiro",barbeiro:nome});
      persist();sync();
    },
    async remBarbeiro(id){
      const b=db.barbeiros.find(x=>x.id===id);if(!b)return;
      db.barbeiros=db.barbeiros.filter(x=>x.id!==id);
      db.usuarios=db.usuarios.filter(x=>!(x.tipo==="barbeiro"&&x.barbeiro===b.nome));   // o login dele deixa de funcionar
      persist();sync();
    },
    semDono(){return vazio&&!db.usuarios.some(x=>x.tipo==="admin")},
    async signup({nome,email,tel,senha}){if(db.usuarios.some(x=>mesmoEmail(x.email,email)))throw new Error("Esse email já tem conta");const u={id:nextId(db.usuarios),email,senha,nome,tel,tipo:this.semDono()?"admin":"cliente"};db.usuarios.push(u);persist();sync();try{localStorage.setItem(UKEY,JSON.stringify(u.id))}catch(e){}return pub(u)},
    async logout(){try{localStorage.removeItem(UKEY)}catch(e){}},
    async load(){sync();if(user&&user.tipo==="barbeiro"&&!db.usuarios.some(x=>x.id===user.id))throw new Error("Seu acesso foi removido pelo dono da barbearia")},
    async ocupacao(){return []},
    async addAgd(a){if(ocupado(a.data,a.barbeiro,a.hora))throw new Error("Esse horário já está ocupado");const n={...a,id:nextId(db.agendamentos)};db.agendamentos.push(n);persist();sync();return n},
    async updAgd(id,p){const a=db.agendamentos.find(x=>x.id===id);if(!a)throw new Error("Agendamento não encontrado");Object.assign(a,p);persist();sync()},
    async delAgd(id){db.agendamentos=db.agendamentos.filter(x=>x.id!==id);persist();sync()},
    async addReceb(r){db.recebimentos.push({...r,id:nextId(db.recebimentos)});persist();sync()},
    async reset(){db=seed();persist();sync()},
    onChange(){}
  };
}

/* ---------- Versão COMPLETA: Supabase (online, compartilhado) ---------- */
function SupaStore(){
  const sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const toAgd=r=>({id:r.id,data:r.data,hora:r.hora,barbeiro:r.barbeiro,clienteId:r.cliente_id,cliente:r.cliente,tel:r.tel,servicos:r.servicos||[],servico:r.servico,v:Number(r.valor)||0,status:r.status});
  const fromAgd=a=>{const o={};const m={data:"data",hora:"hora",barbeiro:"barbeiro",clienteId:"cliente_id",cliente:"cliente",tel:"tel",servicos:"servicos",servico:"servico",v:"valor",status:"status"};for(const k in m)if(k in a)o[m[k]]=a[k]===undefined?null:a[k];return o};
  const toRec=r=>({id:r.id,agendamentoId:r.agendamento_id,data:r.data,hora:r.hora,cliente:r.cliente,barbeiro:r.barbeiro,servico:r.servico,v:Number(r.valor)||0,metodo:r.metodo});
  const erro=e=>{const m=String(e&&e.message||e);
    if(/barbeiros_nome/i.test(m))return new Error("Já existe um barbeiro com esse nome");
    if(/barbeiros_email/i.test(m))return new Error("Esse email já está cadastrado em outro barbeiro");
    if(/duplicate key|horario_unico/i.test(m))return new Error("Esse horário já está ocupado");
    if(/Invalid login/i.test(m))return new Error("Email ou senha incorretos");
    if(/already registered/i.test(m))return new Error("Esse email já tem conta");
    if(/Password should/i.test(m))return new Error("A senha precisa ter pelo menos 6 caracteres");
    if(/Email not confirmed/i.test(m))return new Error("Confirme seu email antes de entrar (veja sua caixa de entrada)");
    if(/Failed to fetch|NetworkError/i.test(m))return new Error("Sem conexão com a internet");
    return new Error(m)};
  const chk=({data:d,error})=>{if(error)throw erro(error);return d};
  async function perfil(uid){
    const p=chk(await sb.from("perfis").select("*").eq("id",uid).maybeSingle());
    if(!p)throw new Error("Perfil não encontrado. Rode o schema.sql no Supabase.");
    return{id:p.id,nome:p.nome||p.email,email:p.email,tel:p.tel,tipo:p.tipo,barbeiro:p.barbeiro};
  }
  async function carregaBarbeiros(){
    // o dono vê a ficha completa; os outros só nome (função do banco, sem emails)
    data.barbeiros=me&&me.tipo==="admin"
      ?chk(await sb.from("barbeiros").select("*").order("nome"))
      :chk(await sb.rpc("lista_barbeiros"));
    atualizaBarbeiros();
  }
  let me=null,cb=()=>{},canal=null;
  function ouvir(){
    if(canal)sb.removeChannel(canal);
    let t=null;const avisa=()=>{clearTimeout(t);t=setTimeout(()=>cb(),400)};
    canal=sb.channel("heritage").on("postgres_changes",{event:"*",schema:"public",table:"agendamentos"},avisa);
    if(me&&me.tipo==="admin")canal.on("postgres_changes",{event:"*",schema:"public",table:"recebimentos"},avisa).on("postgres_changes",{event:"*",schema:"public",table:"barbeiros"},avisa);
    canal.subscribe();
  }
  return{
    async init(){const s=chk(await sb.auth.getSession());if(!s.session)return null;me=await perfil(s.session.user.id);ouvir();return me},
    async login(email,senha){const r=chk(await sb.auth.signInWithPassword({email,password:senha}));me=await perfil(r.user.id);ouvir();return me},
    async signup({nome,email,tel,senha}){
      const r=chk(await sb.auth.signUp({email,password:senha,options:{data:{nome,tel}}}));
      if(!r.session)throw new Error("Conta criada! Confirme pelo link enviado ao seu email e depois entre.");
      me=await perfil(r.user.id);ouvir();return me},
    async logout(){if(canal){sb.removeChannel(canal);canal=null}await sb.auth.signOut();me=null},
    async load(){
      if(!me)return;
      me=await perfil(me.id);   // o dono pode ter mudado o papel desta conta (ex.: removeu o barbeiro)
      if(user&&me.tipo!==user.tipo)throw new Error("Seu acesso mudou. Saia e entre de novo.");
      await carregaBarbeiros();
      if(me.tipo==="barbeiro"){
        const ag=await sb.from("agendamentos").select("*").eq("barbeiro",me.barbeiro).gte("data",addDays(-180)).order("data").order("hora").limit(5000);
        data.agendamentos=chk(ag).map(toAgd);data.recebimentos=[];data.usuarios=[me];
        return;
      }
      if(me.tipo==="admin"){
        const [ag,rc,us]=await Promise.all([
          sb.from("agendamentos").select("*").gte("data",addDays(-180)).order("data").order("hora").limit(5000),
          sb.from("recebimentos").select("*").gte("data",addDays(-400)).order("data").limit(5000),
          sb.from("perfis").select("id,nome,email,tel,tipo").limit(5000)]);
        data.agendamentos=chk(ag).map(toAgd);data.recebimentos=chk(rc).map(toRec);data.usuarios=chk(us);
      }else{
        const [ag,oc]=await Promise.all([
          sb.from("agendamentos").select("*").eq("cliente_id",me.id).order("data",{ascending:false}).limit(500),
          sb.rpc("horarios_ocupados",{de:today,ate:addDays(31*MESES_FRENTE+31)})]);
        data.agendamentos=chk(ag).map(toAgd);ocup=chk(oc);data.recebimentos=[];data.usuarios=[me];
      }
    },
    async ocupacao(){if(!me)return[];ocup=chk(await sb.rpc("horarios_ocupados",{de:today,ate:addDays(31*MESES_FRENTE+31)}));return ocup},
    async addAgd(a){const r=chk(await sb.from("agendamentos").insert(fromAgd(a)).select().single());const n=toAgd(r);data.agendamentos.push(n);if(!isAdmin)ocup.push({id:n.id,data:n.data,hora:n.hora,barbeiro:n.barbeiro});return n},
    async updAgd(id,p){const r=chk(await sb.from("agendamentos").update(fromAgd(p)).eq("id",id).select().single());const i=data.agendamentos.findIndex(x=>x.id===id);if(i>=0)data.agendamentos[i]=toAgd(r)},
    async delAgd(id){chk(await sb.from("agendamentos").delete().eq("id",id));data.agendamentos=data.agendamentos.filter(x=>x.id!==id)},
    async addReceb(r){const row=chk(await sb.from("recebimentos").insert({agendamento_id:r.agendamentoId||null,data:r.data,hora:r.hora,cliente:r.cliente,barbeiro:r.barbeiro,servico:r.servico,valor:r.v,metodo:r.metodo}).select().single());data.recebimentos.push(toRec(row))},
    async addBarbeiro({nome,tel,email}){chk(await sb.from("barbeiros").insert({nome,tel,email:email||null}));await carregaBarbeiros()},
    async remBarbeiro(id){chk(await sb.from("barbeiros").delete().eq("id",id));await carregaBarbeiros()},
    onChange(f){cb=f}
  };
}

/* ---------- Escolha da versão ---------- */
const configurado=CFG.supabaseUrl&&/^https:\/\//.test(CFG.supabaseUrl)&&CFG.supabaseKey&&!/COLE_AQUI/.test(CFG.supabaseKey);
let Store=null;
if(DEMO)Store=LocalStore(false);
else if(configurado&&window.supabase)Store=SupaStore();
else Store=LocalStore(true);           // versão final ainda sem Supabase: funciona no aparelho
const LOCAL=DEMO||!(configurado&&window.supabase);
const VAZIO=!DEMO&&LOCAL;

/* =============================================================
   REGRAS DE AGENDA
   ============================================================= */
const fonteOcup=()=>(isAdmin||LOCAL)?data.agendamentos:ocup;
const ocupado=(d,b,h,ign)=>fonteOcup().some(a=>a.data===d&&a.barbeiro===b&&a.hora===h&&a.status!=="cancelado"&&a.id!==ign);
const passou=(d,h)=>d<today||(d===today&&h<=agoraHM());
const findHorarios=(d,b)=>HORARIOS.filter(h=>!ocupado(d,b,h)&&!passou(d,h));
const horaOpts=(d,b,sel,ign)=>HORARIOS.map(h=>{const oc=ocupado(d,b,h,ign);return `<option value="${h}" ${oc?"disabled":""} ${h===sel&&!oc?"selected":""}>${h}${oc?" — ocupado":""}</option>`}).join("");

function svcsDe(a){
  if(Array.isArray(a.servicos)&&a.servicos.length)return a.servicos;
  const out=[];
  String(a.servico||"").split(", ").forEach(chunk=>{
    const t=chunk.replace(/\s*\(R\$.*?\)/,"").split(" + ");let i=0;
    while(i<t.length){let ok=false;
      for(let k=t.length-i;k>0;k--){const n=t.slice(i,i+k).join(" + ");if(SERVICOS.some(s=>s.nome===n)){out.push(n);i+=k;ok=true;break}}
      if(!ok)i++;
    }
  });
  return out;
}
const svcChecks=(cls,sel=[])=>`<div class="checks">${SERVICOS.map(s=>`<label class="ck"><input type="checkbox" class="${cls}" value="${esc(s.nome)}" ${sel.includes(s.nome)?"checked":""}><span>${esc(s.nome)}</span><b style="margin-left:auto;color:var(--copper)">${BRL.format(s.v)}</b></label>`).join("")}</div>`;
const lerSvcs=(m,cls)=>[...m.querySelectorAll("."+cls+":checked")].map(c=>SERVICOS.find(s=>s.nome===c.value)).filter(Boolean);
const somaSvcs=l=>l.reduce((a,s)=>a+(s.v||0),0);

/* ---------- Clientes (calculados a partir dos cadastros e agendamentos) ---------- */
function listaClientes(){
  const m=new Map();
  const novo=(nome,tel)=>({nome,tel:tel||"",cortes:0,ultima:null,futuro:null,barbs:{}});
  data.usuarios.filter(u=>u.tipo==="cliente").forEach(u=>m.set(u.nome.trim().toLowerCase(),novo(u.nome,u.tel)));
  data.agendamentos.filter(a=>a.status!=="cancelado").forEach(a=>{
    const k=a.cliente.trim().toLowerCase();if(!m.has(k))m.set(k,novo(a.cliente,a.tel));
    const c=m.get(k);if(!c.tel&&a.tel)c.tel=a.tel;
    if(a.data<today||a.status==="concluido"){c.cortes++;if(!c.ultima||a.data>c.ultima)c.ultima=a.data}
    else if(!c.futuro||a.data<c.futuro)c.futuro=a.data;
    c.barbs[a.barbeiro]=(c.barbs[a.barbeiro]||0)+1;
  });
  return [...m.values()].map(c=>({...c,barbeiro:(Object.entries(c.barbs).sort((x,y)=>y[1]-x[1])[0]||["—"])[0]}));
}
const quando=d=>{if(!d)return "nunca";const n=diasEntre(d,today);return n<=0?"hoje":n===1?"ontem":"há "+n+" dias"};
function waLink(tel,msg){let n=String(tel||"").replace(/\D/g,"");if(n.length===10||n.length===11)n="55"+n;return "https://wa.me/"+n+(msg?"?text="+encodeURIComponent(msg):"")}
function abrirLink(url){if(NATIVE)location.href=url;else window.open(url,"_blank","noopener")}

/* =============================================================
   INTERFACE
   ============================================================= */
let view="dash",qa="",qc="",filterBarb="todos";
let agModo="mes",agMes=today.slice(0,7),agAno=+today.slice(0,4),agDia=null;
let cliMes=today.slice(0,7);
let retencaoDispensada=false;

function toast(m,sub){
  const t=document.createElement("div");t.className="toast";
  t.innerHTML=`<span class="msi fill">content_cut</span><div>${esc(m)}${sub?`<small>${esc(sub)}</small>`:""}</div>`;
  $("#toasts").appendChild(t);setTimeout(()=>t.remove(),4200);
}
async function tentar(fn,okMsg,okSub){
  try{await fn();if(okMsg)toast(okMsg,okSub);return true}
  catch(e){toast(e.message||"Algo deu errado");return false}
}

const stPill=s=>`<span class="pill ${s==="confirmado"?"s-ok":s==="cancelado"?"s-crit":s==="concluido"?"s-copper":"s-warn"}">${s==="concluido"?"concluído":esc(s)}</span>`;
const iniciais=n=>String(n||"?").trim().split(/\s+/).filter(Boolean).map(p=>p[0]).slice(0,2).join("").toUpperCase();
function agdCard(a,comData,extra=""){
  return `<button type="button" class="agd-item st-${a.status} ${extra}" data-agd-open="${a.id}">
    <span class="time">${comData?`<small>${fmtData(a.data)}</small>`:""}${a.hora}</span>
    <span class="av">${esc(iniciais(a.cliente))}</span>
    <div class="info"><b>${esc(a.cliente)}</b><small>${esc(a.barbeiro)} · ${esc(a.servico)}</small></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${stPill(a.status)}<small style="color:var(--copper);font-weight:600">${BRL.format(a.v)}</small></div>
  </button>`;
}
function listaAgrupada(arr){
  if(!arr.length)return `<div class="empty">Nenhum agendamento neste período.</div>`;
  const dias=[...new Set(arr.map(a=>a.data))];
  return dias.map(d=>`<div class="agd-day"><h3>${dayName(d)}${d===today?" · hoje":""}</h3><div class="agd-list">${arr.filter(a=>a.data===d).map(a=>agdCard(a)).join("")}</div></div>`).join("");
}
const emAtendimento=(a,ag)=>a.data===today&&a.status!=="cancelado"&&a.status!=="concluido"&&a.hora<=ag&&ag<somaMin(a.hora,DUR);

/* ---------- Painel ---------- */
function renderDash(){
  const agora=new Date(),ag=agoraHM();
  const hoje=data.agendamentos.filter(a=>a.data===today).sort(byDH);
  const ativos=hoje.filter(a=>a.status!=="cancelado");
  const naCadeira=ativos.filter(a=>emAtendimento(a,ag));
  const feitos=ativos.filter(a=>a.status==="concluido"||somaMin(a.hora,DUR)<=ag).length;
  const restantes=Math.max(0,ativos.length-feitos-naCadeira.length);
  const fatDia=d=>data.recebimentos.filter(r=>r.data===d).reduce((s,r)=>s+r.v,0);
  const faturado=fatDia(today),fatOntem=fatDia(addDays(-1));
  const previsto=somaSvcs(ativos);
  const pct=previsto?Math.min(100,Math.round(faturado/previsto*100)):0;
  const trend=fatOntem?Math.round((faturado-fatOntem)/fatOntem*100):null;
  const ticket=ativos.length?previsto/ativos.length:0;
  const prox30=data.agendamentos.filter(a=>a.data>today&&a.data<=addDays(30)&&a.status!=="cancelado").length;
  const prox=data.agendamentos.filter(a=>a.data>today&&a.status!=="cancelado").sort(byDH);
  const hr=agora.getHours(),saud=hr<12?"Bom dia":hr<18?"Boa tarde":"Boa noite";
  let dataLonga=agora.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  dataLonga=dataLonga.charAt(0).toUpperCase()+dataLonga.slice(1);
  const aberto=ag>=HORARIOS[0]&&ag<FECHA;

  const chairs=BARBEIROS.map((b,i)=>{
    const at=naCadeira.find(a=>a.barbeiro===b),px=ativos.find(a=>a.barbeiro===b&&a.hora>ag&&a.status!=="concluido");
    return at
      ?`<div class="chair"><b><span class="dot"></span>C${i+1} • ${esc(b.slice(0,3))}</b><small>${esc(at.cliente)}</small></div>`
      :`<div class="chair livre"><b><span class="dot off"></span>C${i+1} • ${esc(b.slice(0,3))}</b><small>${px?"Próx. "+px.hora:"Livre"}</small></div>`;
  }).join("");

  const sumidos=listaClientes().filter(c=>!c.futuro&&c.ultima&&diasEntre(c.ultima,today)>=25);

  $("#dashList").innerHTML=`
    <section class="hero" aria-label="Resumo do dia">
      <span class="msi wm" aria-hidden="true">content_cut</span>
      <div class="st"><span class="dot ${aberto?"":"off"}"></span>${aberto?`Barbearia aberta${BARBEIROS.length?` • ${naCadeira.length} de ${BARBEIROS.length} cadeiras ocupadas`:""}`:`Barbearia fechada • abre às ${HORARIOS[0]}`}</div>
      <h1>${saud}, ${esc(String(user.nome).split(" ")[0])}</h1>
      <p><span class="msi">calendar_month</span>${esc(dataLonga)} • ${ag}</p>
    </section>

    ${BARBEIROS.length?`<div class="ribbon">
      <div class="hd"><span><span class="msi">chair</span>Cadeiras</span><span>${naCadeira.length} de ${BARBEIROS.length} ocupadas</span></div>
      <div class="chairs" style="grid-template-columns:repeat(${Math.min(BARBEIROS.length,4)},minmax(0,1fr))">${chairs}</div>
    </div>`:`<div class="retain" style="margin-top:12px">
      <span class="ic" style="background:rgba(53,79,61,.6);color:var(--green)"><span class="msi">group_add</span></span>
      <div style="flex:1;min-width:0">
        <div class="tt" style="color:var(--green)">Primeiro passo</div>
        <p style="font-size:15px;font-weight:600">Cadastre os barbeiros da sua equipe.</p>
        <p style="color:var(--muted);font-size:12.5px">Cada um ganha um login para ver e organizar a própria agenda. Os clientes só conseguem marcar horário depois disso.</p>
        <div class="acts"><button class="btn btn-p" type="button" data-qa="equipe"><span class="msi">person_add</span>Adicionar barbeiro</button></div>
      </div>
    </div>`}

    <div class="bento">
      <div class="bcard big">
        <div class="lb"><span>Livro caixa • hoje</span>${trend===null?"":`<span class="trend ${trend<0?"neg":""}"><span class="msi">${trend>=0?"trending_up":"trending_down"}</span>${trend>=0?"+":""}${trend}%</span>`}</div>
        <div class="big-v">${BRL.format(faturado)}</div>
        <div class="sub"><span>Previsto na agenda: ${BRL.format(previsto)} (${pct}%)</span><span style="color:var(--copper)">vs ${BRL.format(fatOntem)} ontem</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
      <div class="bcard">
        <div class="lb"><span>Cortes &amp; barba</span><span class="msi">schedule</span></div>
        <div class="mid-v">${ativos.length}<small>agendados</small></div>
        <div class="sub"><span><span class="dot" style="width:6px;height:6px"></span> ${feitos} feitos</span><span><span class="dot" style="width:6px;height:6px;background:var(--copper)"></span> ${naCadeira.length} na cadeira</span><span style="width:100%;color:var(--outline)">${restantes} restantes hoje</span></div>
      </div>
      <div class="bcard">
        <div class="lb"><span>Ticket médio</span><span class="msi" style="color:var(--leather)">diamond</span></div>
        <div class="mid-v" style="color:var(--copper)">${BRL.format(ticket)}</div>
        <div class="sub"><span style="color:var(--green)">${prox30} agendamentos nos próximos 30 dias</span></div>
      </div>
    </div>

    <div class="foil" aria-hidden="true"><i></i><span class="msi fill">star</span><i></i></div>

    <div class="sec-row"><h2 class="sec">Operações expressas</h2><small>Bancada ativa</small></div>
    <div class="quick">
      <button type="button" class="qa" data-qa="novo"><span class="ic gold"><span class="msi">more_time</span></span>Novo agend.</button>
      <button type="button" class="qa" data-qa="agenda"><span class="ic green"><span class="msi">calendar_month</span></span>Agenda</button>
      <button type="button" class="qa" data-qa="clientes"><span class="ic"><span class="msi">badge</span></span>Clientes</button>
      <button type="button" class="qa" data-qa="caixa"><span class="ic" style="color:var(--text)"><span class="msi">point_of_sale</span></span>Ver caixa</button>
    </div>

    <div class="sec-row"><h2 class="sec">Na cadeira agora &amp; fila</h2><small style="color:var(--copper)">Hoje</small></div>
    ${hoje.length?`<div class="agd-list">${hoje.map(a=>agdCard(a,false,emAtendimento(a,ag)?"st-agora":"")).join("")}</div>`:`<div class="empty">Nenhum agendamento para hoje.</div>`}

    <div class="sec-row"><h2 class="sec">Próximos agendamentos</h2><small>${prox.length} marcados</small></div>
    ${prox.length?`<div class="agd-list">${prox.slice(0,10).map(a=>agdCard(a,true)).join("")}</div>`:`<div class="empty">Nenhum agendamento futuro.</div>`}
    <button class="btn" type="button" id="verAgenda" style="margin-top:12px;width:100%"><span class="msi">calendar_month</span>Ver agenda completa (mês / ano)</button>

    ${sumidos.length&&!retencaoDispensada?`<div class="retain">
      <span class="ic"><span class="msi">contact_phone</span></span>
      <div style="flex:1;min-width:0">
        <div class="tt">Oportunidade de retenção</div>
        <p style="font-size:15px;font-weight:600">${sumidos.length} cliente${sumidos.length>1?"s":""} sem voltar há mais de 25 dias.</p>
        <p style="color:var(--muted);font-size:12.5px">${esc(sumidos.slice(0,3).map(c=>c.nome).join(", "))}${sumidos.length>3?" e outros":""}. Toque em Clientes para chamar cada um no WhatsApp.</p>
        <div class="acts"><button class="btn btn-p" type="button" data-qa="clientes"><span class="msi">send</span>Chamar no WhatsApp</button><button class="btn" type="button" id="dispensaRet">Dispensar</button></div>
      </div>
    </div>`:""}

    <div class="quote"><span class="msi" aria-hidden="true">content_cut</span><q>A arte do ofício com a honra da tradição.</q><small>${esc(CFG.nome||"Heritage Barber")}</small></div>`;
}

/* ---------- Agenda (mês / ano) ---------- */
function agFiltrados(){
  const q=qa.trim().toLowerCase();
  return data.agendamentos.filter(a=>(filterBarb==="todos"||a.barbeiro===filterBarb)&&(!q||a.cliente.toLowerCase().includes(q)||a.barbeiro.toLowerCase().includes(q)||String(a.tel||"").includes(q)));
}
function renderAgenda(){
  if(isBarb)filterBarb=user.barbeiro;                         // barbeiro só vê a própria agenda
  else if(filterBarb!=="todos"&&!BARBEIROS.includes(filterBarb))filterBarb="todos";
  $("#chips").hidden=isBarb||BARBEIROS.length<2;
  $("#chips").innerHTML=["todos",...BARBEIROS].map(b=>`<button class="chip" type="button" data-b="${esc(b)}" aria-pressed="${filterBarb===b}">${b==="todos"?"Todos":esc(b)}</button>`).join("");
  if(!BARBEIROS.length&&!data.agendamentos.length){
    $("#agenda").innerHTML=`<div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:12px"><span class="msi" style="font-size:40px;color:var(--copper)">group_add</span><b style="color:var(--text);font-size:16px">A agenda começa quando a equipe estiver cadastrada</b><span>Adicione os barbeiros e cada um ganha uma coluna aqui.</span><button class="btn btn-p" type="button" data-ir="equipe"><span class="msi">person_add</span>Adicionar barbeiro</button></div>`;
    return;
  }
  const lista=agFiltrados();
  const [y,mo]=agMes.split("-").map(Number);
  const titulo=agModo==="ano"?String(agAno):MESES[mo-1]+" de "+y;

  let h=`<div class="cal-head">
      <button class="btn ic" type="button" id="agPrev" aria-label="Anterior"><span class="msi">chevron_left</span></button>
      <h3>${titulo}</h3>
      <button class="btn ic" type="button" id="agNext" aria-label="Próximo"><span class="msi">chevron_right</span></button>
    </div>
    <div class="cal-modes">
      <button class="chip" type="button" data-modo="mes" aria-pressed="${agModo==="mes"}">Mês</button>
      <button class="chip" type="button" data-modo="ano" aria-pressed="${agModo==="ano"}">Ano</button>
      <button class="chip" type="button" id="agHoje">Hoje</button>
    </div>`;

  if(agModo==="ano"){
    h+=`<div class="ano-grid">`;
    for(let m=0;m<12;m++){
      const key=agAno+"-"+pad(m+1);
      const ag=lista.filter(a=>a.data.startsWith(key)&&a.status!=="cancelado");
      h+=`<button type="button" class="mes-card ${key===today.slice(0,7)?"cur":""}" data-mes="${key}"><b>${MESES[m]}</b><span class="n">${ag.length}</span><small>${ag.length===1?"agendamento":"agendamentos"} · ${BRL.format(somaSvcs(ag))}</small></button>`;
    }
    h+=`</div>`;
    const doAno=lista.filter(a=>a.data.startsWith(agAno+"-")).sort(byDH);
    h+=`<h3 class="sec">Todos os agendamentos de ${agAno} (${doAno.length})</h3>`+listaAgrupada(doAno);
  }else{
    const first=new Date(y,mo-1,1).getDay(),dias=new Date(y,mo,0).getDate();
    h+=`<div class="cal">`+SEMANA.map(d=>`<div class="dow">${d}</div>`).join("")+"<div></div>".repeat(first);
    for(let d=1;d<=dias;d++){
      const ds=agMes+"-"+pad(d);
      const n=lista.filter(a=>a.data===ds&&a.status!=="cancelado").length;
      h+=`<button type="button" class="cal-d ${ds===today?"hoje":""} ${ds===agDia?"sel":""} ${n?"tem":""}" data-day="${ds}"><span>${d}</span>${n?`<small>${n}</small>`:""}</button>`;
    }
    h+=`</div>`;

    if(agDia&&agDia.startsWith(agMes)){
      const agdDia=lista.filter(a=>a.data===agDia);
      h+=`<div class="cal-head" style="margin-top:8px"><h3 style="text-align:left;font-size:16px">${dayName(agDia)}</h3>
        <button class="btn" type="button" data-day-clear style="height:40px"><span class="msi">view_list</span>Mês inteiro</button>
        <button class="btn btn-p" type="button" data-novo-dia style="height:40px"><span class="msi">add</span>Agendar</button></div>`;
      (filterBarb==="todos"?BARBEIROS:[filterBarb]).forEach(barb=>{
        const doBarb=agdDia.filter(a=>a.barbeiro===barb);
        const horas=[...new Set([...HORARIOS,...doBarb.map(a=>a.hora)])].sort();
        h+=`<div class="agd-day"><h3>${esc(barb)}</h3><div class="agd-list">`+horas.map(hora=>{
          const a=doBarb.find(x=>x.hora===hora&&x.status!=="cancelado")||doBarb.find(x=>x.hora===hora);
          return a?agdCard(a):`<div class="agd-item livre"><span class="time">${hora}</span><div class="info"><b>Livre</b></div></div>`;
        }).join("")+`</div></div>`;
      });
    }else{
      const doMes=lista.filter(a=>a.data.startsWith(agMes)).sort(byDH);
      h+=`<h3 class="sec">${MESES[mo-1]} • ${doMes.length} agendamento${doMes.length===1?"":"s"}</h3><p class="hint">Toque num dia para ver os horários livres e ocupados.</p>`+listaAgrupada(doMes);
    }
  }
  $("#agenda").innerHTML=h;
}

/* ---------- Clientes ---------- */
function renderClientes(){
  const q=qc.toLowerCase().trim(),qd=q.replace(/\D/g,"");
  const list=listaClientes().filter(c=>!q||c.nome.toLowerCase().includes(q)||(qd&&c.tel.replace(/\D/g,"").includes(qd))).sort((a,b)=>b.cortes-a.cortes||a.nome.localeCompare(b.nome));
  if(!list.length){$("#cGrid").innerHTML=`<div class="empty">${q?"Nenhum cliente encontrado.":"Nenhum cliente ainda. Eles aparecem aqui quando se cadastram no app ou quando você cria um agendamento."}</div>`;return}
  $("#cGrid").innerHTML=list.map((c,i)=>`<article class="card">
    <div class="c-body">
      <div class="c-row"><span class="av" style="margin:0">${esc(iniciais(c.nome))}</span><b style="font-size:17px;flex:1">${esc(c.nome)}</b><span class="pill s-copper">${c.cortes} ${c.cortes===1?"visita":"visitas"}</span></div>
      <div class="c-tech"><span class="msi">call</span>${esc(c.tel||"sem telefone")}</div>
      <div class="c-tech"><span class="msi">content_cut</span>Barbeiro: ${esc(c.barbeiro)}</div>
      <div class="c-tech"><span class="msi">history</span>Última visita: ${quando(c.ultima)}</div>
      <div class="c-tech"><span class="msi">event</span>${c.futuro?"Próximo: "+fmtData(c.futuro):"Sem horário marcado"}</div>
    </div>
    <div class="c-foot"><div></div><div style="display:flex;gap:6px">
      ${c.tel?`<button class="btn wa" type="button" data-wa="${i}" style="height:42px;padding:0 12px"><span class="msi">chat</span>WhatsApp</button>`:""}
      <button class="btn btn-p" type="button" data-agendar="${i}" style="height:42px"><span class="msi">add</span>Agendar</button>
    </div></div>
  </article>`).join("");
  $("#cGrid")._lista=list;
}

/* ---------- Caixa ---------- */
function renderFinanceiro(){
  const receb=data.recebimentos.filter(r=>r.data===today).sort((a,b)=>String(b.hora).localeCompare(String(a.hora)));
  const mes=today.slice(0,7),doMes=data.recebimentos.filter(r=>r.data.startsWith(mes));
  const total_dia=receb.reduce((a,r)=>a+r.v,0),total_mes=doMes.reduce((a,r)=>a+r.v,0);
  $("#fKpis").innerHTML=`
    <div class="kpi"><div class="lab">Hoje<span class="msi">payments</span></div><div class="val">${BRL.format(total_dia)}</div></div>
    <div class="kpi"><div class="lab">${MESES[+mes.slice(5)-1]}<span class="msi">calendar_month</span></div><div class="val">${BRL.format(total_mes)}</div></div>
    <div class="kpi"><div class="lab">Atendimentos hoje<span class="msi">list</span></div><div class="val">${receb.length}</div></div>
    <div class="kpi"><div class="lab">Ticket do mês<span class="msi">diamond</span></div><div class="val">${BRL.format(doMes.length?total_mes/doMes.length:0)}</div></div>`;
  $("#fHojeQtd").textContent=receb.length+" recebimento"+(receb.length===1?"":"s");
  $("#fGrid").innerHTML=receb.length?receb.map(r=>`<article class="card">
    <div class="c-body">
      <div class="c-row"><b style="flex:1">${esc(r.servico)}</b><span class="pill s-ok">${BRL.format(r.v)}</span></div>
      <div class="c-tech"><span class="msi">person</span>${esc(r.cliente)}</div>
      <div class="c-tech"><span class="msi">content_cut</span>${esc(r.barbeiro)}</div>
      <div class="c-tech"><span class="msi">credit_card</span>${esc(r.metodo)} · ${esc(r.hora||"")}</div>
    </div>
  </article>`).join(""):`<div class="empty">Nenhum recebimento hoje. Para registrar, abra um agendamento e toque em "Concluir e receber".</div>`;
  const nomesCaixa=[...new Set([...BARBEIROS,...doMes.map(r=>r.barbeiro)])];
  $("#fBarb").innerHTML=nomesCaixa.length?nomesCaixa.map(b=>{const v=doMes.filter(r=>r.barbeiro===b).reduce((s,r)=>s+r.v,0),n=doMes.filter(r=>r.barbeiro===b).length;
    return `<div class="agd-item"><span class="av" style="margin:0">${esc(iniciais(b))}</span><div class="info"><b>${esc(b)}</b><small>${n} atendimento${n===1?"":"s"} · comissão ${BRL.format(v*COMISSAO)}</small></div><b style="color:var(--copper)">${BRL.format(v)}</b></div>`}).join(""):`<div class="empty">Os barbeiros aparecem aqui depois de cadastrados na aba Equipe.</div>`;
}

/* ---------- Equipe (só o dono) ---------- */
function temLogin(b){return data.usuarios.some(u=>u.tipo==="barbeiro"&&u.barbeiro===b.nome)}
function renderEquipe(){
  const lista=(data.barbeiros||[]).slice().sort((a,b)=>a.nome.localeCompare(b.nome));
  const hoje=data.agendamentos.filter(a=>a.data===today&&a.status!=="cancelado");
  const futuros=data.agendamentos.filter(a=>a.data>=today&&a.status!=="cancelado"&&a.status!=="concluido");
  $("#eqQtd").textContent=lista.length?lista.length+" barbeiro"+(lista.length===1?"":"s"):"";
  $("#eqLista").innerHTML=lista.length?lista.map(b=>{
    const n=hoje.filter(a=>a.barbeiro===b.nome).length,f=futuros.filter(a=>a.barbeiro===b.nome).length;
    const acesso=temLogin(b)?`<span class="pill s-ok">Login ativo</span>`:b.email?`<span class="pill s-warn">Aguardando 1º acesso</span>`:`<span class="pill s-mute">Sem login</span>`;
    return `<article class="card">
      <div class="c-body">
        <div class="c-row"><span class="av" style="margin:0">${esc(iniciais(b.nome))}</span><b style="font-size:17px;flex:1;min-width:0">${esc(b.nome)}</b>${acesso}</div>
        <div class="c-tech"><span class="msi">mail</span>${b.email?esc(b.email):"Não entra no app"}</div>
        <div class="c-tech"><span class="msi">call</span>${esc(b.tel||"sem telefone")}</div>
        <div class="c-tech"><span class="msi">event</span>${n} hoje · ${f} marcado${f===1?"":"s"} daqui pra frente</div>
      </div>
      <div class="c-foot"><div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${b.tel&&b.email?`<button class="btn wa" type="button" data-eq-wa="${b.id}" style="height:42px;padding:0 12px"><span class="msi">chat</span>Enviar acesso</button>`:""}
        <button class="btn btn-t" type="button" data-eq-rem="${b.id}" style="height:42px;padding:0 12px"><span class="msi">person_remove</span>Remover</button>
      </div></div>
    </article>`}).join(""):`<div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:10px"><span class="msi" style="font-size:40px;color:var(--copper)">groups</span><b style="color:var(--text);font-size:16px">Nenhum barbeiro ainda</b><span>Adicione quem atende na barbearia. Se você também corta, adicione você mesmo.</span></div>`;
}
function msgAcesso(b,senha){
  const app=CFG.nome||"Heritage Barber";
  return `Olá, ${b.nome.split(" ")[0]}! Você foi adicionado à equipe da ${app}.\n\nBaixe o app ${app} e entre com:\nEmail: ${b.email}\n`+
    (LOCAL?`Senha: ${senha||"(a que eu te passar)"}\n\nVocê vai ver a sua agenda e os seus clientes do dia.`:`\nNo primeiro acesso, toque em "Não tenho conta — criar agora" e crie a sua senha usando este mesmo email. Você vai ver a sua agenda e os seus clientes do dia.`);
}
function addBarbeiroModal(){
  const senhaSug="hb"+Math.floor(1000+Math.random()*9000);
  const jaSouBarbeiro=(data.barbeiros||[]).some(b=>b.nome.trim().toLowerCase()===String(user.nome).trim().toLowerCase());
  const m=openModal(`
    <div class="sh-head"><span class="msi" style="color:var(--copper)">person_add</span><h3>Adicionar barbeiro</h3><button class="x" type="button" data-close aria-label="Fechar"><span class="msi" data-close>close</span></button></div>
    <form class="sh-body" id="fb" novalidate>
      ${jaSouBarbeiro?"":`<label class="ck"><input type="checkbox" id="bEu"><span>Sou eu: o dono também atende (sem login separado)</span></label>`}
      <div class="fgrid">
        <div class="f"><label for="bNome">Nome (como aparece na agenda)</label><input id="bNome" autocomplete="off" placeholder="Ex.: Rafael"></div>
        <div class="f"><label for="bTel">WhatsApp</label><input id="bTel" inputmode="tel" placeholder="(11) 9XXXX-XXXX"></div>
      </div>
      <div class="box" id="bAcesso">
        <h4><span class="msi">key</span>Acesso ao app</h4>
        <p class="hint" style="margin-top:-4px">Com o login, o barbeiro vê e organiza só a agenda dele. Ele não vê o Caixa nem a lista de clientes.</p>
        <div class="fgrid">
          <div class="f ${LOCAL?"":"full"}"><label for="bEmail">Email do barbeiro (login)</label><input id="bEmail" type="email" inputmode="email" autocomplete="off" placeholder="rafael@email.com"></div>
          ${LOCAL?`<div class="f"><label for="bSenha">Senha inicial</label><input id="bSenha" autocomplete="off" value="${senhaSug}"></div>`:""}
        </div>
        ${LOCAL?"":`<p class="hint">No primeiro acesso ele toca em "Não tenho conta" e cria a própria senha com este email.</p>`}
      </div>
    </form>
    <div class="sh-foot"><button class="btn" type="button" data-close>Cancelar</button><button class="btn btn-p" type="submit" form="fb"><span class="msi">check</span>Adicionar à equipe</button></div>`);
  const eu=m.querySelector("#bEu");
  if(eu)eu.addEventListener("change",()=>{
    m.querySelector("#bAcesso").hidden=eu.checked;
    if(eu.checked){m.querySelector("#bNome").value=user.nome;m.querySelector("#bTel").value=user.tel||""}
  });
  m.querySelector("#bNome").focus();
  m.querySelector("#fb").addEventListener("submit",async e=>{
    e.preventDefault();
    const souEu=eu&&eu.checked;
    const nome=m.querySelector("#bNome").value.trim(),tel=m.querySelector("#bTel").value.trim();
    const email=souEu?"":m.querySelector("#bEmail").value.trim();
    const senha=souEu||!LOCAL?"":m.querySelector("#bSenha").value.trim();
    if(!nome){toast("Informe o nome do barbeiro");return}
    if(!souEu&&!email){toast("Informe o email do barbeiro para ele ter login");return}
    if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast("Esse email não parece válido");return}
    if(LOCAL&&!souEu&&senha.length<6){toast("A senha inicial precisa ter pelo menos 6 caracteres");return}
    const btn=m.querySelector("[form=fb]");ocupadoBtn(btn,true,"Adicionando…");
    const ok=await tentar(()=>Store.addBarbeiro({nome,tel,email,senha}),nome+" entrou na equipe");
    if(!ok){ocupadoBtn(btn,false);return}
    closeModal();render();
    if(email)mostraAcesso({nome,tel,email},senha);
  });
}
function mostraAcesso(b,senha){
  const msg=msgAcesso(b,senha);
  const m=openModal(`
    <div class="sh-head"><span class="msi" style="color:var(--green)">verified_user</span><h3>Acesso de ${esc(b.nome.split(" ")[0])}</h3><button class="x" type="button" data-close aria-label="Fechar"><span class="msi" data-close>close</span></button></div>
    <div class="sh-body">
      <p class="hint" style="font-size:13.5px;color:var(--muted)">Passe estes dados para ${esc(b.nome.split(" ")[0])}. Ele entra no mesmo app ${LOCAL?"(neste aparelho)":"pelo próprio celular"} e já cai direto na agenda dele.</p>
      <div class="box" style="gap:8px">
        <div><small style="color:var(--muted)">EMAIL</small><div style="font-weight:600;word-break:break-all">${esc(b.email)}</div></div>
        <div><small style="color:var(--muted)">SENHA</small><div style="font-weight:600">${LOCAL?esc(senha):"Ele cria no primeiro acesso"}</div></div>
      </div>
    </div>
    <div class="sh-foot">
      <button class="btn" type="button" id="aCopiar"><span class="msi">content_copy</span>Copiar mensagem</button>
      ${b.tel?`<button class="btn btn-p" type="button" id="aWa"><span class="msi">chat</span>Enviar no WhatsApp</button>`:""}
    </div>`);
  m.querySelector("#aCopiar").addEventListener("click",()=>{navigator.clipboard.writeText(msg).then(()=>toast("Mensagem copiada")).catch(()=>toast("Não foi possível copiar"))});
  const wa=m.querySelector("#aWa");if(wa)wa.addEventListener("click",()=>abrirLink(waLink(b.tel,msg)));
}

/* ---------- Meu dia (barbeiro) ---------- */
function renderBarbDia(){
  const meu=user.barbeiro,ag=agoraHM(),hr=new Date().getHours();
  const meus=data.agendamentos.filter(a=>a.barbeiro===meu&&a.status!=="cancelado");
  const hoje=meus.filter(a=>a.data===today).sort(byDH);
  const prox=meus.filter(a=>a.data>today).sort(byDH);
  const semana=prox.filter(a=>a.data<=addDays(7)).length;
  const feitos=hoje.filter(a=>a.status==="concluido").length;
  const agora=hoje.find(a=>emAtendimento(a,ag)),seguinte=hoje.find(a=>a.hora>ag&&a.status!=="concluido");
  let dataLonga=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});dataLonga=dataLonga.charAt(0).toUpperCase()+dataLonga.slice(1);
  $("#barbDiaList").innerHTML=`
    <section class="hero" aria-label="Meu dia">
      <span class="msi wm" aria-hidden="true">content_cut</span>
      <div class="st"><span class="dot ${agora?"":"off"}"></span>${agora?"Na cadeira: "+esc(agora.cliente):seguinte?"Próximo às "+seguinte.hora+" • "+esc(seguinte.cliente):"Sem mais clientes hoje"}</div>
      <h1>${hr<12?"Bom dia":hr<18?"Boa tarde":"Boa noite"}, ${esc(String(user.nome).split(" ")[0])}</h1>
      <p><span class="msi">calendar_month</span>${esc(dataLonga)} • ${ag}</p>
    </section>
    <div class="bento" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="bcard"><div class="lb"><span>Hoje</span><span class="msi">schedule</span></div><div class="mid-v">${hoje.length}</div></div>
      <div class="bcard"><div class="lb"><span>Feitos</span><span class="msi">task_alt</span></div><div class="mid-v">${feitos}</div></div>
      <div class="bcard"><div class="lb"><span>7 dias</span><span class="msi">date_range</span></div><div class="mid-v">${semana}</div></div>
    </div>
    <div class="sec-row"><h2 class="sec">Minha agenda de hoje</h2><small style="color:var(--copper)">${esc(meu)}</small></div>
    ${hoje.length?`<div class="agd-list">${hoje.map(a=>agdCard(a,false,emAtendimento(a,ag)?"st-agora":"")).join("")}</div>`:`<div class="empty">Nenhum cliente marcado para hoje.</div>`}
    <div class="sec-row"><h2 class="sec">Próximos</h2><small>${prox.length} marcados</small></div>
    ${prox.length?`<div class="agd-list">${prox.slice(0,10).map(a=>agdCard(a,true)).join("")}</div>`:`<div class="empty">Nenhum horário marcado nos próximos dias.</div>`}
    <button class="btn" type="button" data-ir="agenda" style="margin-top:12px;width:100%"><span class="msi">calendar_month</span>Ver minha agenda do mês</button>`;
}

/* ---------- Área do cliente ---------- */
function cliCard(a){
  return `<div class="agd-item st-${a.status}"><span class="time"><small>${fmtData(a.data)}</small>${a.hora}</span>
    <div class="info"><b>${esc(a.servico)}</b><small>com ${esc(a.barbeiro)}</small></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${stPill(a.status)}<small style="color:var(--copper);font-weight:600">${BRL.format(a.v)}</small></div></div>`;
}
function renderClienteAgenda(){
  const minMes=today.slice(0,7),maxMes=shiftMes(minMes,MESES_FRENTE-1);
  if(cliMes<minMes)cliMes=minMes;
  const [y,mo]=cliMes.split("-").map(Number);
  const first=new Date(y,mo-1,1).getDay(),dias=new Date(y,mo,0).getDate();
  let h=`<div class="cal-head">
      <button class="btn ic" type="button" id="cliPrev" aria-label="Mês anterior" ${cliMes<=minMes?"disabled":""}><span class="msi">chevron_left</span></button>
      <h3>${MESES[mo-1]} de ${y}</h3>
      <button class="btn ic" type="button" id="cliNext" aria-label="Próximo mês" ${cliMes>=maxMes?"disabled":""}><span class="msi">chevron_right</span></button>
    </div>
    <div class="cal">`+SEMANA.map(d=>`<div class="dow">${d}</div>`).join("")+"<div></div>".repeat(first);
  for(let d=1;d<=dias;d++){
    const ds=cliMes+"-"+pad(d);
    const livre=ds>=today&&BARBEIROS.some(b=>findHorarios(ds,b).length>0);
    h+=`<button type="button" class="cal-d ${livre?"tem":""} ${ds===today?"hoje":""}" data-cday="${ds}" ${livre?"":"disabled"}><span>${d}</span></button>`;
  }
  h+=`</div><p class="legend">${BARBEIROS.length?"Dias em cinza estão lotados ou já passaram.":"A barbearia ainda está montando a agenda. Volte em breve para marcar o seu horário."}</p>`;
  const meus=data.agendamentos.filter(a=>a.clienteId===user.id&&a.data>=today&&a.status!=="cancelado"&&a.status!=="concluido").sort(byDH);
  h+=`<div class="sec-row"><h2 class="sec">Meus próximos horários</h2></div>`+(meus.length?`<div class="agd-list">${meus.map(cliCard).join("")}</div>`:`<div class="empty">Você não tem horários marcados.</div>`);
  $("#calAgenda").innerHTML=h;
}
function renderClientePerfil(){
  const agds=data.agendamentos.filter(a=>a.clienteId===user.id);
  $("#perfilNome").textContent=user.nome;
  $("#perfilEmail").textContent=user.email||"—";
  $("#perfilTel").textContent=user.tel||"—";
  $("#perfilAgendamentos").textContent=agds.length+" agendamento"+(agds.length!==1?"s":"");
  const hist=agds.slice().sort((a,b)=>byDH(b,a));
  $("#perfilHist").innerHTML=hist.length?`<div class="agd-list">${hist.map(cliCard).join("")}</div>`:`<div class="empty">Você ainda não tem agendamentos.</div>`;
}

/* ---------- Render geral ---------- */
const NOMES_V={dash:"Painel",agenda:"Agenda",clientes:"Clientes",financeiro:"Caixa",equipe:"Equipe",barbDia:"Meu dia",clienteAgenda:"Agendar",clientePerfil:"Meu perfil"};
// telas que cada papel pode abrir
const PODE={admin:["dash","agenda","clientes","financeiro","equipe"],barbeiro:["barbDia","agenda"],cliente:["clienteAgenda","clientePerfil"]};
function render(){
  if(!user)return;
  today=ymd(new Date());
  if(!(PODE[user.tipo]||PODE.cliente).includes(view))view=home();
  ["dash","agenda","clientes","financeiro","equipe","barbDia","clienteAgenda","clientePerfil"].forEach(v=>{$("#v"+v.charAt(0).toUpperCase()+v.slice(1)).hidden=view!==v});
  $("#titleTop").textContent="Barber CRM • "+(NOMES_V[view]||"");
  document.querySelectorAll("[data-v]").forEach(b=>{const c=b.dataset.v===view;b.classList.toggle("cur",c);b.querySelector(".msi").classList.toggle("fill",c)});
  if(view==="dash")renderDash();
  else if(view==="agenda")renderAgenda();
  else if(view==="clientes")renderClientes();
  else if(view==="financeiro")renderFinanceiro();
  else if(view==="clienteAgenda")renderClienteAgenda();
  else if(view==="clientePerfil")renderClientePerfil();
  else if(view==="equipe")renderEquipe();
  else if(view==="barbDia")renderBarbDia();
}
const home=()=>isAdmin?"dash":isBarb?"barbDia":"clienteAgenda";
function go(v){view=v;render();window.scrollTo(0,0)}

/* ---------- Modal ---------- */
let lastFocus=null;
function openModal(html){
  lastFocus=document.activeElement;
  $("#modal").innerHTML=`<div class="scrim" data-close><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.style.overflow="hidden";
  const x=$("#modal .x");x&&x.focus();
  return $("#modal .sheet");
}
function closeModal(){$("#modal").innerHTML="";document.body.style.overflow="";lastFocus&&lastFocus.focus&&lastFocus.focus()}
$("#modal").addEventListener("click",e=>{if(e.target.hasAttribute&&e.target.hasAttribute("data-close"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#modal").innerHTML)closeModal()});
function ocupadoBtn(b,on,txt){
  if(!b)return;
  if(on){if(b.dataset.txt==null)b.dataset.txt=b.innerHTML;b.disabled=true;if(txt)b.innerHTML=txt}
  else{b.disabled=false;if(b.dataset.txt!=null){b.innerHTML=b.dataset.txt;delete b.dataset.txt}}
}

function irPara(ds){agModo="mes";agMes=ds.slice(0,7);agAno=+ds.slice(0,4);agDia=ds}

/* ---------- Editar agendamento (barbeiro) ---------- */
function editAgendamento(id){
  const agd=data.agendamentos.find(a=>a.id===id);if(!agd)return;
  const jaPago=data.recebimentos.some(r=>r.agendamentoId===id);
  const m=openModal(`<div class="sh-head"><span class="msi" style="color:var(--copper)">edit_calendar</span><h3>${esc(agd.cliente)}</h3><button class="x" type="button" data-close aria-label="Fechar"><span class="msi" data-close>close</span></button></div>
    <form class="sh-body" id="ef" novalidate>
      ${agd.status!=="concluido"&&agd.status!=="cancelado"?`<div class="box"><h4><span class="msi">point_of_sale</span>Concluir atendimento</h4>
        <div class="pay"><div class="f"><label for="eMetodo">Pagamento</label><select id="eMetodo">${METODOS.map(x=>`<option>${x}</option>`).join("")}</select></div>
        <button class="btn btn-ok" type="button" id="eReceber"><span class="msi">task_alt</span>Concluir e receber ${BRL.format(agd.v)}</button></div></div>`:""}
      <div class="fgrid">
        <div class="f"><label for="eCliente">Cliente</label><input id="eCliente" value="${esc(agd.cliente)}"></div>
        <div class="f"><label for="eTel">WhatsApp</label><input id="eTel" inputmode="tel" value="${esc(agd.tel||"")}"></div>
        <div class="f full"><label for="eData">Dia, mês e ano</label><input type="date" id="eData" value="${agd.data}"></div>
        <div class="f"><label for="eBarbeiro">Barbeiro</label><select id="eBarbeiro" ${isBarb?"disabled":""}>${opcoesBarb(agd.barbeiro).map(b=>`<option ${b===agd.barbeiro?"selected":""}>${esc(b)}</option>`).join("")}</select></div>
        <div class="f"><label for="eHora">Horário</label><select id="eHora">${horaOpts(agd.data,agd.barbeiro,agd.hora,id)}</select></div>
        <div class="f full"><label for="eStatus">Status</label><select id="eStatus">${["confirmado","pendente","concluido","cancelado"].map(s=>`<option value="${s}" ${s===agd.status?"selected":""}>${s==="concluido"?"concluído":s}</option>`).join("")}</select></div>
      </div>
      <div class="f full"><label>Serviços (escolha um ou mais)</label>${svcChecks("eSvc",svcsDe(agd))}</div>
      <p class="resumo" id="eTotal"></p>
      ${agd.tel?`<button class="btn wa" type="button" id="eWa"><span class="msi">chat</span>Mandar mensagem no WhatsApp</button>`:""}
      ${jaPago?`<p class="hint">✓ Pagamento já registrado no caixa.</p>`:""}
    </form>
    <div class="sh-foot"><button class="btn btn-t" type="button" id="delAgd"><span class="msi">delete</span>Excluir</button><button class="btn" type="button" data-close>Cancelar</button><button class="btn btn-p" type="submit" form="ef"><span class="msi">save</span>Salvar</button></div>`);
  const upH=()=>{m.querySelector("#eHora").innerHTML=horaOpts(m.querySelector("#eData").value,m.querySelector("#eBarbeiro").value,agd.hora,id)};
  const upT=()=>{const s=lerSvcs(m,"eSvc");m.querySelector("#eTotal").textContent=s.length?"Total: "+BRL.format(somaSvcs(s)):"Nenhum serviço selecionado"};
  upT();
  m.querySelector("#eData").addEventListener("change",upH);
  m.querySelector("#eBarbeiro").addEventListener("change",upH);
  m.querySelectorAll(".eSvc").forEach(c=>c.addEventListener("change",upT));
  const wa=m.querySelector("#eWa");
  if(wa)wa.addEventListener("click",()=>abrirLink(waLink(agd.tel,`Olá, ${agd.cliente.split(" ")[0]}! Aqui é da ${CFG.nome||"barbearia"}. Seu horário: ${fmtData(agd.data)} às ${agd.hora} com ${agd.barbeiro}.`)));
  const rec=m.querySelector("#eReceber");
  if(rec)rec.addEventListener("click",async()=>{
    ocupadoBtn(rec,true,"Registrando…");
    const ok=await tentar(async()=>{
      await Store.addReceb({agendamentoId:id,data:today,hora:agoraHM(),cliente:agd.cliente,barbeiro:agd.barbeiro,servico:agd.servico,v:agd.v,metodo:m.querySelector("#eMetodo").value});
      await Store.updAgd(id,{status:"concluido"});
    },"Atendimento concluído",BRL.format(agd.v)+" no caixa");
    if(ok){closeModal();render()}else ocupadoBtn(rec,false);
  });
  m.querySelector("#ef").addEventListener("submit",async e=>{
    e.preventDefault();
    const d=m.querySelector("#eData").value,b=m.querySelector("#eBarbeiro").value,h=m.querySelector("#eHora").value,st=m.querySelector("#eStatus").value;
    const svcs=lerSvcs(m,"eSvc");
    if(!d||!h){toast("Escolha o dia e o horário");return}
    if(!svcs.length){toast("Escolha pelo menos um serviço");return}
    if(st!=="cancelado"&&ocupado(d,b,h,id)){toast("Esse horário já está ocupado",b+" · "+fmtData(d)+" · "+h);return}
    const btn=m.querySelector("[form=ef]");ocupadoBtn(btn,true,"Salvando…");
    const nomes=svcs.map(s=>s.nome);
    const ok=await tentar(()=>Store.updAgd(id,{cliente:m.querySelector("#eCliente").value.trim()||agd.cliente,tel:m.querySelector("#eTel").value.trim(),data:d,barbeiro:b,hora:h,status:st,servicos:nomes,servico:nomes.join(", "),v:somaSvcs(svcs)}),"Agendamento atualizado",fmtData(d)+" · "+h+" · "+b);
    if(ok){closeModal();irPara(d);render()}else ocupadoBtn(btn,false);
  });
  m.querySelector("#delAgd").addEventListener("click",async()=>{
    if(!confirm("Excluir o agendamento de "+agd.cliente+"?"))return;
    if(await tentar(()=>Store.delAgd(id),"Agendamento excluído")){closeModal();render()}
  });
}

/* ---------- Novo agendamento (barbeiro) ---------- */
// barbeiros que aparecem nos formulários: o barbeiro logado só vê ele mesmo
function opcoesBarb(atual){const l=isBarb?[user.barbeiro]:BARBEIROS.slice();if(atual&&!l.includes(atual))l.push(atual);return l}
function newAgendamento(pre={}){
  if(isAdmin&&!BARBEIROS.length){toast("Cadastre um barbeiro primeiro","Aba Equipe → Adicionar barbeiro");go("equipe");return}
  const nomes=listaClientes().map(c=>c.nome);
  const m=openModal(`
    <div class="sh-head"><span class="msi" style="color:var(--copper)">more_time</span><h3>Novo agendamento</h3><button class="x" type="button" data-close aria-label="Fechar"><span class="msi" data-close>close</span></button></div>
    <form class="sh-body" id="f" novalidate>
      <div class="fgrid">
        <div class="f"><label for="nCliente">Cliente</label><input id="nCliente" list="nClientes" placeholder="Nome" value="${esc(pre.cliente||"")}"><datalist id="nClientes">${nomes.map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
        <div class="f"><label for="nTel">WhatsApp</label><input id="nTel" inputmode="tel" placeholder="(11) 9XXXX-XXXX" value="${esc(pre.tel||"")}"></div>
        <div class="f full"><label for="nData">Dia, mês e ano</label><input type="date" id="nData" value="${pre.data||today}"></div>
        <div class="f"><label for="nBarbeiro">Barbeiro</label><select id="nBarbeiro" ${isBarb?"disabled":""}>${opcoesBarb().map(b=>`<option>${esc(b)}</option>`).join("")}</select></div>
        <div class="f"><label for="nHora">Horário</label><select id="nHora"></select></div>
      </div>
      <div class="f full"><label>Serviços (escolha um ou mais)</label>${svcChecks("nSvc")}</div>
      <p class="resumo" id="nTotal"></p>
      <label class="ck"><input type="checkbox" id="nConfirm" checked><span>Marcar como confirmado</span></label>
    </form>
    <div class="sh-foot"><button class="btn" type="button" data-close>Cancelar</button><button class="btn btn-p" type="submit" form="f"><span class="msi">save</span>Agendar</button></div>
  `);
  const upH=()=>{m.querySelector("#nHora").innerHTML=horaOpts(m.querySelector("#nData").value,m.querySelector("#nBarbeiro").value,"")};
  const upT=()=>{const s=lerSvcs(m,"nSvc");m.querySelector("#nTotal").textContent=s.length?"Total: "+BRL.format(somaSvcs(s))+" · "+s.length+" serviço"+(s.length>1?"s":""):"Nenhum serviço selecionado"};
  upH();upT();
  m.querySelector("#nData").addEventListener("change",upH);
  m.querySelector("#nBarbeiro").addEventListener("change",upH);
  m.querySelectorAll(".nSvc").forEach(c=>c.addEventListener("change",upT));
  m.querySelector("#nCliente").addEventListener("change",()=>{
    const n=m.querySelector("#nCliente").value.trim().toLowerCase();
    const c=listaClientes().find(x=>x.nome.toLowerCase()===n);
    if(c&&c.tel&&!m.querySelector("#nTel").value)m.querySelector("#nTel").value=c.tel;
  });
  m.querySelector("#f").addEventListener("submit",async e=>{
    e.preventDefault();
    const cli=m.querySelector("#nCliente").value.trim(),tel=m.querySelector("#nTel").value.trim();
    const ds=m.querySelector("#nData").value,barb=m.querySelector("#nBarbeiro").value,hora=m.querySelector("#nHora").value;
    const svcs=lerSvcs(m,"nSvc");
    if(!cli||!ds||!hora||!svcs.length){toast("Preencha cliente, dia, horário e pelo menos um serviço");return}
    if(ocupado(ds,barb,hora)){toast("Esse horário já está ocupado",barb+" · "+fmtData(ds)+" · "+hora);return}
    const u=data.usuarios.find(x=>x.tipo==="cliente"&&x.nome.trim().toLowerCase()===cli.toLowerCase());
    const n=svcs.map(s=>s.nome);
    const btn=m.querySelector("[form=f]");ocupadoBtn(btn,true,"Salvando…");
    const ok=await tentar(()=>Store.addAgd({data:ds,hora,clienteId:u?u.id:null,cliente:cli,tel:tel||(u&&u.tel)||"",barbeiro:barb,servicos:n,servico:n.join(", "),v:somaSvcs(svcs),status:m.querySelector("#nConfirm").checked?"confirmado":"pendente"}),"Agendamento criado",fmtData(ds)+" · "+hora+" · "+barb);
    if(ok){closeModal();irPara(ds);render()}else ocupadoBtn(btn,false);
  });
}

/* ---------- Cliente marca horário ---------- */
async function openClienteDia(ds){
  if(!LOCAL){try{await Store.ocupacao()}catch(e){}}
  let barb=BARBEIROS.find(b=>findHorarios(ds,b).length)||BARBEIROS[0],hora="";
  const m=openModal(`
    <div class="sh-head"><span class="msi" style="color:var(--copper)">event_available</span><h3>Marcar horário</h3><button class="x" type="button" data-close aria-label="Fechar"><span class="msi" data-close>close</span></button></div>
    <form class="sh-body" id="fCli" novalidate>
      <p style="margin:0;color:var(--muted)">📅 ${dayName(ds)}</p>
      <div class="f full"><label>Serviços (escolha um ou mais)</label>${svcChecks("cSvc")}</div>
      <div class="f full"><label>Barbeiro</label><div class="chips" id="cBarbs"></div></div>
      <div class="f full"><label>Horário</label><div class="slots" id="cSlots"></div><span class="legend">Horários em cinza já estão ocupados.</span></div>
      <p class="resumo" id="cResumo"></p>
    </form>
    <div class="sh-foot"><button class="btn" type="button" data-close>Cancelar</button><button class="btn btn-p" type="submit" form="fCli"><span class="msi">check</span>Confirmar agendamento</button></div>
  `);
  const pint=()=>{
    m.querySelector("#cBarbs").innerHTML=BARBEIROS.map(b=>`<button type="button" class="chip" data-cb="${esc(b)}" aria-pressed="${b===barb}">${esc(b)} · ${findHorarios(ds,b).length} livres</button>`).join("");
    const livres=findHorarios(ds,barb);
    m.querySelector("#cSlots").innerHTML=HORARIOS.map(h=>{const ok=livres.includes(h);return `<button type="button" class="slot ${ok?"":"full"}" data-ch="${h}" ${ok?"":"disabled"} aria-selected="${h===hora}">${h}</button>`}).join("");
    const s=lerSvcs(m,"cSvc");
    m.querySelector("#cResumo").textContent=(hora?"✓ "+hora+" com "+barb:"Selecione um horário")+(s.length?" · Total "+BRL.format(somaSvcs(s)):"");
  };
  pint();
  m.addEventListener("click",e=>{
    const b=e.target.closest("[data-cb]");if(b){barb=b.dataset.cb;hora="";pint();return}
    const s=e.target.closest("[data-ch]");if(s&&!s.disabled){hora=s.dataset.ch;pint()}
  });
  m.querySelectorAll(".cSvc").forEach(c=>c.addEventListener("change",pint));
  m.querySelector("#fCli").addEventListener("submit",async e=>{
    e.preventDefault();
    const svcs=lerSvcs(m,"cSvc");
    if(!svcs.length){toast("Escolha pelo menos um serviço");return}
    if(!hora){toast("Selecione um horário");return}
    if(ocupado(ds,barb,hora)||passou(ds,hora)){toast("Esse horário acabou de ser ocupado, escolha outro");hora="";pint();return}
    const n=svcs.map(s=>s.nome);
    const btn=m.querySelector("[form=fCli]");ocupadoBtn(btn,true,"Confirmando…");
    const ok=await tentar(()=>Store.addAgd({data:ds,hora,clienteId:user.id,cliente:user.nome,tel:user.tel||"",barbeiro:barb,servicos:n,servico:n.join(", "),v:somaSvcs(svcs),status:"confirmado"}),"Agendamento confirmado!",fmtData(ds)+" · "+hora+" com "+barb);
    if(ok){closeModal();render()}
    else{ocupadoBtn(btn,false);if(!LOCAL){try{await Store.ocupacao()}catch(_){}}hora="";pint()}
  });
}

/* =============================================================
   LOGIN / SESSÃO
   ============================================================= */
function showAuth(){
  $("#boot").hidden=true;$("#vAuth").hidden=false;$("#app").hidden=true;$(".nav").hidden=true;$("#newBtn").hidden=true;
  $("#authForm").reset();$("#authForm2").reset();$("#authForm2").hidden=true;$("#authForm").hidden=false;
  $("#demoBtns").hidden=!DEMO;
  $("#authSub").textContent=DEMO?"Barber CRM • Demonstração":"Barber CRM";
  $("#authNote").textContent=DEMO?"Demo: entre como Dono, Barbeiro ou Cliente com um toque. Os dados são fictícios.":"";
  const primeiro=VAZIO&&Store.semDono&&Store.semDono();
  $("#signNote").hidden=!primeiro;$("#backLogin").hidden=primeiro;
  if(primeiro){$("#authForm").hidden=true;$("#authForm2").hidden=false;$("#authSub").textContent="Primeiro acesso"}
}
function showApp(){
  $("#boot").hidden=true;$("#vAuth").hidden=true;$("#app").hidden=false;$(".nav").hidden=false;$("#newBtn").hidden=!equipe();
  $("#navAdmin").hidden=!isAdmin;$("#navBarb").hidden=!isBarb;$("#navCliente").hidden=equipe();
  $("#demoBar").hidden=!(DEMO||(VAZIO&&isAdmin));$("#reset").hidden=!DEMO;
  if(VAZIO)$("#demoBar .msi").textContent="cloud_off",$("#demoBar .t").innerHTML="<b>Dados salvos só neste aparelho.</b> Para os clientes agendarem pelo próprio celular, falta ligar o servidor online (Supabase).";
  view=home();render();window.scrollTo(0,0);
}
async function entrar(u){
  user=u;isAdmin=u.tipo==="admin";isBarb=u.tipo==="barbeiro";
  try{await Store.load()}catch(e){toast(e.message||"Erro ao carregar dados");if(isBarb&&/removido|mudou/.test(e.message||"")){await sair();return}}
  filterBarb="todos";agDia=null;
  showApp();
}
async function sair(){try{await Store.logout()}catch(e){}user=null;isAdmin=false;isBarb=false;data={agendamentos:[],recebimentos:[],usuarios:[],barbeiros:[]};atualizaBarbeiros();ocup=[];showAuth()}

$("#toggleAuth").addEventListener("click",()=>{$("#authForm").hidden=true;$("#authForm2").hidden=false;$("#signNome").focus()});
$("#backLogin").addEventListener("click",()=>{$("#authForm2").hidden=true;$("#authForm").hidden=false;$("#authForm2").reset()});
$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#authEmail").value.trim(),senha=$("#authPass").value;
  if(!email||!senha){toast("Informe email e senha");return}
  const btn=e.target.querySelector("[type=submit]");ocupadoBtn(btn,true,"Entrando…");
  try{const u=await Store.login(email,senha);await entrar(u);toast("Bem-vindo, "+u.nome.split(" ")[0])}
  catch(err){toast(err.message)}
  finally{ocupadoBtn(btn,false)}
});
$("#authForm2").addEventListener("submit",async e=>{
  e.preventDefault();
  const nome=$("#signNome").value.trim(),email=$("#signEmail").value.trim(),tel=$("#signTel").value.trim(),senha=$("#signPass").value;
  if(!nome||!email||!tel||!senha){toast("Preencha todos os campos");return}
  if(senha.length<6){toast("A senha precisa ter pelo menos 6 caracteres");return}
  const btn=e.target.querySelector("[type=submit]");ocupadoBtn(btn,true,"Criando…");
  try{const u=await Store.signup({nome,email,tel,senha});await entrar(u);toast("Conta criada! Bem-vindo, "+nome.split(" ")[0])}
  catch(err){toast(err.message);if(/Confirme/.test(err.message)){$("#authForm2").hidden=true;$("#authForm").hidden=false;$("#authEmail").value=email}}
  finally{ocupadoBtn(btn,false)}
});
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-demo-login]");if(!b||!DEMO)return;
  try{const u=await Store.loginDemo(b.dataset.demoLogin);await entrar(u);toast("Entrando como "+({admin:"dono",barbeiro:"barbeiro",cliente:"cliente"}[u.tipo]),u.nome)}catch(err){toast(err.message)}
});
$("#logoutBtn").addEventListener("click",async()=>{if(confirm("Sair da conta?")){await sair();toast("Você saiu da conta")}});

/* ---------- Navegação e eventos ---------- */
$("#logoBtn").addEventListener("click",()=>go(home()));
document.querySelectorAll("[data-v]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.v)));
$("#newBtn").addEventListener("click",()=>newAgendamento(view==="agenda"&&agDia?{data:agDia}:{}));
$("#qa").addEventListener("input",e=>{qa=e.target.value;renderAgenda()});
$("#qc").addEventListener("input",e=>{qc=e.target.value;renderClientes()});
$("#chips").addEventListener("click",e=>{const b=e.target.closest("[data-b]");if(b){filterBarb=b.dataset.b;renderAgenda()}});

$("#vDash").addEventListener("click",e=>{
  const t=e.target;
  if(t.closest("#verAgenda"))return go("agenda");
  const q=t.closest("[data-qa]");
  if(q){const k=q.dataset.qa;if(k==="novo")newAgendamento();else go(k==="caixa"?"financeiro":k);return}
  if(t.closest("#dispensaRet")){retencaoDispensada=true;renderDash()}
});

$("#agenda").addEventListener("click",e=>{
  const t=e.target;
  const day=t.closest("[data-day]");
  if(day){agDia=agDia===day.dataset.day?null:day.dataset.day;renderAgenda();return}
  if(t.closest("#agPrev")||t.closest("#agNext")){
    const n=t.closest("#agPrev")?-1:1;
    if(agModo==="ano")agAno+=n;else{agMes=shiftMes(agMes,n);agAno=+agMes.slice(0,4)}
    agDia=null;renderAgenda();return;
  }
  const modo=t.closest("[data-modo]");
  if(modo){agModo=modo.dataset.modo;if(agModo==="ano")agAno=+agMes.slice(0,4);agDia=null;renderAgenda();return}
  if(t.closest("#agHoje")){irPara(today);renderAgenda();return}
  const mes=t.closest("[data-mes]");
  if(mes){agModo="mes";agMes=mes.dataset.mes;agDia=null;renderAgenda();window.scrollTo(0,0);return}
  if(t.closest("[data-day-clear]")){agDia=null;renderAgenda();return}
  if(t.closest("[data-novo-dia]")){newAgendamento({data:agDia})}
});

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-agd-open]");
  if(!b||!equipe())return;
  editAgendamento(+b.dataset.agdOpen);
});

$("#cGrid").addEventListener("click",e=>{
  const lista=$("#cGrid")._lista||[];
  const w=e.target.closest("[data-wa]"),a=e.target.closest("[data-agendar]");
  if(w){const c=lista[+w.dataset.wa];abrirLink(waLink(c.tel,`Olá, ${c.nome.split(" ")[0]}! Aqui é da ${CFG.nome||"barbearia"}. Faz um tempinho que você não aparece — que tal marcar seu próximo horário? ✂️`))}
  if(a){const c=lista[+a.dataset.agendar];newAgendamento({cliente:c.nome,tel:c.tel})}
});

$("#calAgenda").addEventListener("click",e=>{
  const t=e.target;
  if(t.closest("#cliPrev")){cliMes=shiftMes(cliMes,-1);renderClienteAgenda();return}
  if(t.closest("#cliNext")){cliMes=shiftMes(cliMes,1);renderClienteAgenda();return}
  const d=t.closest("[data-cday]");
  if(d&&!d.disabled)openClienteDia(d.dataset.cday);
});

/* Botões "ir para" (atalhos dentro das telas) */
document.addEventListener("click",e=>{const b=e.target.closest("[data-ir]");if(b&&user)go(b.dataset.ir)});

/* Equipe */
$("#vEquipe").addEventListener("click",async e=>{
  if(e.target.closest("#eqAdd"))return addBarbeiroModal();
  const wa=e.target.closest("[data-eq-wa]");
  if(wa){const b=data.barbeiros.find(x=>String(x.id)===wa.dataset.eqWa);if(b)abrirLink(waLink(b.tel,msgAcesso(b,"")));return}
  const rem=e.target.closest("[data-eq-rem]");
  if(rem){
    const b=data.barbeiros.find(x=>String(x.id)===rem.dataset.eqRem);if(!b)return;
    const fut=data.agendamentos.filter(a=>a.barbeiro===b.nome&&a.data>=today&&a.status!=="cancelado"&&a.status!=="concluido").length;
    if(!confirm(`Remover ${b.nome} da equipe?\n\n${b.email?"O login dele para de funcionar. ":""}Os atendimentos antigos continuam no histórico.${fut?`\n\nAtenção: ${b.nome} tem ${fut} horário${fut>1?"s":""} marcado${fut>1?"s":""}. Passe para outro barbeiro na Agenda.`:""}`))return;
    if(await tentar(()=>Store.remBarbeiro(b.id),b.nome+" saiu da equipe"))render();
  }
});

$("#reset").addEventListener("click",async()=>{
  if(!DEMO||!confirm("Apagar o que você criou e voltar aos dados de exemplo?"))return;
  await Store.reset();render();toast("Exemplos restaurados");
});

/* Botão "voltar" do Android */
const CapApp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;
if(CapApp)CapApp.addListener("backButton",()=>{
  if($("#modal").innerHTML)closeModal();
  else if(user&&view!==home())go(home());
  else if(!$("#authForm2").hidden)$("#backLogin").click();
  else CapApp.exitApp();
});

/* Atualiza o relógio do painel e os dados quando o app volta para a tela */
setInterval(()=>{if(user&&!$("#modal").innerHTML&&(view==="dash"||view==="clienteAgenda"))render()},60000);
async function recarregar(){if(!user)return;try{await Store.load();if(!$("#modal").innerHTML)render()}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!LOCAL)recarregar()});

/* =============================================================
   INÍCIO
   ============================================================= */
(async function(){
  if(!Store){
    $("#bootMsg").innerHTML=!window.supabase
      ?"Não foi possível carregar a biblioteca do Supabase (<code>vendor/supabase.js</code>)."
      :"Falta configurar o servidor.<br>Abra <code>www/config.js</code> e cole a <b>Project URL</b> e a chave <b>anon public</b> do seu projeto Supabase.";
    document.querySelector("#boot .msi").style.animation="none";
    return;
  }
  Store.onChange(recarregar);
  try{const u=await Store.init();if(u)await entrar(u);else showAuth()}
  catch(e){toast(e.message||"Erro ao iniciar");showAuth()}
})();
})();
