import { Application, Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import "./styles.css";
import { createTools } from "./tools";
import { criarPedido, ECONOMIA, PEDIDOS_INICIAIS, type Cultivo, type Pedido } from "./economia";
import { COLUNAS as COLS, criarTerreno, encontrarCanteiro, posicaoCanteiro } from "./terreno";

const KEY="colheita-infeliz-play-v8";
type Canteiro={crop:Cultivo;plantedAt:number;watered?:boolean}|null; type EstadoJogo={coins:number;cash:number;tilled?:number[];plots:Canteiro[];seeds:Record<Cultivo,number>;fruits:Record<Cultivo,number>;orders:Pedido[];nextOrderId:number};
const TEMPOS:Record<Cultivo,number>={wheat:ECONOMIA.wheat.tempo,corn:ECONOMIA.corn.tempo,sugarcane:ECONOMIA.sugarcane.tempo};
const PRECO_MOEDAS=20,PRECO_CASH=5;
const criarJogoNovo=():EstadoJogo=>({coins:100,cash:100,tilled:[],plots:Array.from({length:48},()=>null),seeds:{wheat:0,corn:0,sugarcane:0},fruits:{wheat:0,corn:0,sugarcane:0},orders:PEDIDOS_INICIAIS.map(p=>({...p})),nextOrderId:4});
const carregarJogo=():EstadoJogo=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x?.plots?.length!==48)return criarJogoNovo();if(typeof x.seeds!=="object"||!x.seeds)x.seeds={wheat:0,corn:0,sugarcane:0};if(typeof x.fruits!=="object"||!x.fruits)x.fruits={wheat:0,corn:0,sugarcane:0};if(!Array.isArray(x.orders))x.orders=PEDIDOS_INICIAIS.map(p=>({...p}));x.nextOrderId=Number.isFinite(x.nextOrderId)?x.nextOrderId:4;x.coins=Number.isFinite(x.coins)?Math.max(0,x.coins):100;x.cash=Number.isFinite(x.cash)?Math.max(0,x.cash):100;localStorage.setItem(KEY,JSON.stringify(x));return x}catch{return criarJogoNovo()}};
const estagioCrescimento=(p:Canteiro,n:number)=>{
  if(!p)return 0;
  const elapsed=Math.max(0,n-p.plantedAt),duration=TEMPOS[p.crop];
  if(elapsed>=duration)return 4;
  return elapsed<duration/3?1:elapsed<duration*2/3?2:3;
};
async function start(){
const root=document.querySelector<HTMLDivElement>("#root")!;
const app=new Application();
await app.init({resizeTo:root,background:"#849447",antialias:true,autoDensity:true,resolution:Math.min(window.devicePixelRatio,2)});
root.appendChild(app.canvas);
const bg=new Sprite(await Assets.load<Texture>("/assets/cenario/fazenda-isometrica-v3.png"));
const world=new Container();app.stage.addChild(bg,world);
const fit=()=>{
  // Aqui eu preencho a tela com o cenário e reservo espaço para as ferramentas abaixo da horta.
  const fundoEscala=Math.max(app.screen.width/bg.texture.width,app.screen.height/bg.texture.height);
  bg.scale.set(fundoEscala);bg.position.set((app.screen.width-bg.width)/2,(app.screen.height-bg.height)/2);
  const alturaLivre=Math.max(180,app.screen.height-118);
  const escala=Math.min((app.screen.width-30)/740,alturaLivre/480,1.8);
  world.scale.set(escala);world.position.set(app.screen.width/2-520*escala,alturaLivre/2+24-300*escala);
};
app.renderer.on("resize",fit);fit();
const terreno=await criarTerreno(world);
const plots=new Container();plots.eventMode="static";plots.hitArea=new Rectangle(-2000,-2000,5000,5000);world.addChild(plots);
let jogo=carregarJogo(),now=Date.now(),selected:Cultivo="wheat",hover=-1;
const names:Record<Cultivo,string>={wheat:ECONOMIA.wheat.nome,corn:ECONOMIA.corn.nome,sugarcane:ECONOMIA.sugarcane.nome};
const crops:Cultivo[]=["wheat","corn","sugarcane"];
const controls=document.createElement("aside");controls.className="controls";
controls.innerHTML='<p id="notice" role="status">Abra o inventário e escolha uma semente.</p>';
root.appendChild(controls);
const notice=controls.querySelector("#notice")!;
const menuDock=document.createElement("nav");menuDock.className="menu-dock";menuDock.setAttribute("aria-label","Menu da fazenda");root.appendChild(menuDock);
const inventoryButton=document.createElement("button");inventoryButton.className="inventory-toggle";
inventoryButton.setAttribute("aria-label","Abrir inventário");inventoryButton.setAttribute("aria-expanded","false");inventoryButton.setAttribute("aria-controls","inventory");
inventoryButton.innerHTML='<span class="item-sprite crate" aria-hidden="true"></span><span class="button-label">Inventário</span>';
menuDock.appendChild(inventoryButton);
const inventory=document.createElement("section");inventory.id="inventory";inventory.className="inventory";inventory.hidden=true;
inventory.setAttribute("aria-label","Inventário da fazenda");
inventory.innerHTML='<header><div><span class="eyebrow">SEU ESTOQUE</span><h2>Inventário</h2></div><button class="inventory-close" aria-label="Fechar inventário">×</button></header><div class="inventory-tabs" role="group" aria-label="Categorias"><button data-category="seeds" aria-pressed="true">Sementes</button><button data-category="harvest" aria-pressed="false">Colheita</button></div><p class="inventory-hint">Escolha uma semente para plantar.</p><div class="seed-slots"></div><div class="harvest-slots" hidden></div><footer>Progresso salvo automaticamente</footer>';
root.appendChild(inventory);
function toggleInventory(open:boolean){inventory.hidden=!open;inventoryButton.setAttribute("aria-expanded",String(open));if(open)(inventory.querySelector('[data-category][aria-pressed="true"]') as HTMLButtonElement)?.focus();else inventoryButton.focus()}
inventoryButton.onclick=()=>{fecharLoja();fecharCeleiro();toggleInventory(inventory.hidden)};
inventory.querySelector(".inventory-close")!.addEventListener("click",()=>toggleInventory(false));
inventory.addEventListener("keydown",e=>{if(e.key==="Escape")toggleInventory(false)});
const slots=inventory.querySelector(".seed-slots")!;
const harvested=inventory.querySelector(".harvest-slots")!;
for(const crop of crops){
 const item=document.createElement("div");item.className="harvest-slot";item.dataset.crop=crop;
 item.innerHTML=`<span class="item-sprite ${crop}" aria-hidden="true"></span><strong>${names[crop]}</strong><small>Colhido</small><b class="quantity"></b>`;harvested.appendChild(item);
}
inventory.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(button=>button.onclick=()=>{
 const seeds=button.dataset.category==="seeds";
 (slots as HTMLElement).hidden=!seeds;(harvested as HTMLElement).hidden=seeds;
 inventory.querySelector(".inventory-hint")!.textContent=seeds?"Escolha uma semente para plantar.":"Produtos que você colheu na fazenda.";
 inventory.querySelectorAll("[data-category]").forEach(tab=>tab.setAttribute("aria-pressed",String(tab===button)));
});
for(const crop of crops){
 const button=document.createElement("button");button.className="seed-slot";button.dataset.crop=crop;
 button.innerHTML=`<span class="item-sprite ${crop}" aria-hidden="true"></span><strong>${names[crop]}</strong><small>${TEMPOS[crop]/1000}s para crescer</small><b class="quantity"></b>`;
 button.onclick=()=>{selected=crop;tools.selectTool("plant");sync();toggleInventory(false);notice.textContent=`Semente de ${names[crop].toLowerCase()} selecionada. Clique em um canteiro arado.`;describe(selectedPlot)};
 slots.appendChild(button);
}
const saldo=document.createElement("div");saldo.className="wallet";
saldo.innerHTML='<div><span class="coin-icon" aria-hidden="true"></span><span>Moedas<b id="coin-balance"></b></span></div><div><span class="banknote" aria-hidden="true">$</span><span>Cash<b id="cash-balance"></b></span></div>';root.appendChild(saldo);
const botaoLoja=document.createElement("button");botaoLoja.className="inventory-toggle shop-toggle";botaoLoja.setAttribute("aria-label","Abrir loja");botaoLoja.setAttribute("aria-expanded","false");botaoLoja.innerHTML='<span class="item-sprite shop-icon" aria-hidden="true"></span><span class="button-label">Loja</span>';menuDock.appendChild(botaoLoja);
const loja=document.createElement("section");loja.className="inventory shop";loja.hidden=true;loja.setAttribute("aria-label","Loja de sementes");
loja.innerHTML='<header><h2>Loja de sementes</h2><button class="inventory-close" aria-label="Fechar loja">×</button></header><p>Escolha como pagar. O preço em Cash é menor.</p><div class="shop-items"></div><p class="shop-status" role="status"></p>';root.appendChild(loja);
function fecharLoja(){loja.hidden=true;botaoLoja.setAttribute("aria-expanded","false")}
botaoLoja.onclick=()=>{const abrir=loja.hidden;loja.hidden=!abrir;botaoLoja.setAttribute("aria-expanded",String(abrir));if(abrir){fecharCeleiro();inventory.hidden=true;inventoryButton.setAttribute("aria-expanded","false")}};
loja.querySelector(".inventory-close")!.addEventListener("click",fecharLoja);
for(const crop of crops){
 const card=document.createElement("div");card.className="harvest-slot";
 card.innerHTML=`<span class="item-sprite ${crop}" aria-hidden="true"></span><strong>${names[crop]}</strong><div class="buy-options"><button data-buy="${crop}" data-payment="coins" aria-label="Comprar semente de ${names[crop]} por ${PRECO_MOEDAS} moedas">${PRECO_MOEDAS} moedas</button><button data-buy="${crop}" data-payment="cash" aria-label="Comprar semente de ${names[crop]} por ${PRECO_CASH} Cash">${PRECO_CASH} Cash</button></div>`;
 card.querySelectorAll<HTMLButtonElement>("button").forEach(button=>button.onclick=()=>{
  const pagamento=button.dataset.payment;
  if(pagamento==="cash"){
   if(jogo.cash<PRECO_CASH){loja.querySelector(".shop-status")!.textContent="Cash insuficiente.";return}
   jogo.cash-=PRECO_CASH;
  }else{
   if(jogo.coins<PRECO_MOEDAS){loja.querySelector(".shop-status")!.textContent="Moedas insuficientes.";return}
   jogo.coins-=PRECO_MOEDAS;
  }
  jogo.seeds[crop]++;localStorage.setItem(KEY,JSON.stringify(jogo));sync();loja.querySelector(".shop-status")!.textContent=`+1 semente de ${names[crop].toLowerCase()} comprada com ${pagamento==="cash"?"Cash":"moedas"}.`;
 });
 loja.querySelector(".shop-items")!.appendChild(card);
}
const botaoCeleiro=document.createElement("button");botaoCeleiro.className="inventory-toggle barn-toggle";botaoCeleiro.setAttribute("aria-label","Abrir celeiro");botaoCeleiro.setAttribute("aria-expanded","false");botaoCeleiro.innerHTML='<span class="item-sprite barn-icon" aria-hidden="true"></span><span class="button-label">Celeiro</span>';menuDock.appendChild(botaoCeleiro);
const celeiro=document.createElement("section");celeiro.className="inventory barn";celeiro.hidden=true;celeiro.setAttribute("aria-label","Celeiro e pedidos");
celeiro.innerHTML='<header><div><span class="eyebrow">ECONOMIA DA FAZENDA</span><h2>Celeiro</h2></div><button class="inventory-close" aria-label="Fechar celeiro">×</button></header><div class="inventory-tabs barn-tabs" role="group" aria-label="Áreas do celeiro"><button data-barn-category="sell" aria-pressed="true">Vender</button><button data-barn-category="orders" aria-pressed="false">Pedidos</button></div><p class="barn-hint">Venda sua colheita diretamente por moedas.</p><div class="sell-items"></div><p class="empty-sale" hidden>Seu celeiro está vazio. Colha alguma plantação para começar a vender.</p><div class="order-items" hidden></div><p class="barn-status" role="status"></p>';
root.appendChild(celeiro);
function fecharCeleiro(){celeiro.hidden=true;botaoCeleiro.setAttribute("aria-expanded","false")}
botaoCeleiro.onclick=()=>{const abrir=celeiro.hidden;celeiro.hidden=!abrir;botaoCeleiro.setAttribute("aria-expanded",String(abrir));if(abrir){fecharLoja();inventory.hidden=true;inventoryButton.setAttribute("aria-expanded","false")}};
celeiro.querySelector(".inventory-close")!.addEventListener("click",fecharCeleiro);
celeiro.addEventListener("keydown",e=>{if(e.key==="Escape")fecharCeleiro()});
const itensVenda=celeiro.querySelector(".sell-items")!;
const avisoCeleiroVazio=celeiro.querySelector<HTMLElement>(".empty-sale")!;
const listaPedidos=celeiro.querySelector(".order-items")!;
celeiro.querySelectorAll<HTMLButtonElement>("[data-barn-category]").forEach(button=>button.onclick=()=>{
 const vender=button.dataset.barnCategory==="sell";
 (itensVenda as HTMLElement).hidden=!vender;(listaPedidos as HTMLElement).hidden=vender;
 celeiro.querySelector(".barn-hint")!.textContent=vender?"Venda sua colheita diretamente por moedas.":"Pedidos pagam melhor. Alguns também recompensam Cash.";
 celeiro.querySelectorAll("[data-barn-category]").forEach(tab=>tab.setAttribute("aria-pressed",String(tab===button)));
});
for(const crop of crops){
 const card=document.createElement("div");card.className="sell-card";card.dataset.crop=crop;
 card.innerHTML=`<span class="item-sprite ${crop}" aria-hidden="true"></span><div class="sell-info"><strong>${names[crop]}</strong><small>${ECONOMIA[crop].precoVenda} moedas por unidade</small><b class="stock"></b></div><div class="sell-actions"><button data-sell="one">Vender 1</button><button data-sell="all">Vender tudo</button></div>`;
 card.querySelectorAll<HTMLButtonElement>("[data-sell]").forEach(button=>button.onclick=()=>{
  const quantidade=button.dataset.sell==="all"?jogo.fruits[crop]:Math.min(1,jogo.fruits[crop]);
  if(quantidade<=0){celeiro.querySelector(".barn-status")!.textContent=`Você não tem ${names[crop].toLowerCase()} para vender.`;return}
  const recebido=quantidade*ECONOMIA[crop].precoVenda;jogo.fruits[crop]-=quantidade;jogo.coins+=recebido;
  localStorage.setItem(KEY,JSON.stringify(jogo));sync();celeiro.querySelector(".barn-status")!.textContent=`${quantidade}× ${names[crop].toLowerCase()} vendido por ${recebido} moedas.`;
 });
 itensVenda.appendChild(card);
}
function desenharPedidos(){
 listaPedidos.innerHTML="";
 for(const pedido of jogo.orders){
  const card=document.createElement("article");card.className="order-card";
  const disponivel=jogo.fruits[pedido.crop],completo=disponivel>=pedido.quantity;
  card.innerHTML=`<span class="item-sprite ${pedido.crop}" aria-hidden="true"></span><div><strong>Pedido de ${names[pedido.crop]}</strong><small>Entregue ${pedido.quantity} unidades</small><span class="order-progress">${Math.min(disponivel,pedido.quantity)}/${pedido.quantity}</span></div><button ${completo?"":"disabled"}>Entregar · ${pedido.rewardCoins} moedas${pedido.rewardCash?` + ${pedido.rewardCash} Cash`:""}</button>`;
  card.querySelector("button")!.onclick=()=>{
   if(jogo.fruits[pedido.crop]<pedido.quantity)return;
   jogo.fruits[pedido.crop]-=pedido.quantity;jogo.coins+=pedido.rewardCoins;jogo.cash+=pedido.rewardCash;
   jogo.orders=jogo.orders.filter(item=>item.id!==pedido.id);jogo.orders.push(criarPedido(jogo.nextOrderId++));
   localStorage.setItem(KEY,JSON.stringify(jogo));sync();celeiro.querySelector(".barn-status")!.textContent=`Pedido entregue: +${pedido.rewardCoins} moedas${pedido.rewardCash?` e +${pedido.rewardCash} Cash`:""}.`;
  };
  listaPedidos.appendChild(card);
 }
}
const sync=()=>{
 saldo.querySelector("#coin-balance")!.textContent=String(jogo.coins);
 saldo.querySelector("#cash-balance")!.textContent=String(jogo.cash);
 loja.querySelectorAll<HTMLButtonElement>('[data-payment="coins"]').forEach(button=>button.disabled=jogo.coins<PRECO_MOEDAS);
 loja.querySelectorAll<HTMLButtonElement>('[data-payment="cash"]').forEach(button=>button.disabled=jogo.cash<PRECO_CASH);
 for(const crop of crops){
  const item=harvested.querySelector<HTMLElement>(`[data-crop="${crop}"]`)!;
  item.querySelector(".quantity")!.textContent=jogo.fruits[crop]+"×";
  item.setAttribute("aria-label",`${names[crop]} colhido: ${jogo.fruits[crop]} unidades`);
  const button=slots.querySelector<HTMLButtonElement>(`[data-crop="${crop}"]`)!;
  button.disabled=jogo.seeds[crop]<=0;button.setAttribute("aria-pressed",String(selected===crop));
  button.setAttribute("aria-label",`Semente de ${names[crop]}, ${jogo.seeds[crop]} unidades`);
  button.querySelector(".quantity")!.textContent=jogo.seeds[crop]+"×";
  const venda=itensVenda.querySelector<HTMLElement>(`[data-crop="${crop}"]`)!;
  venda.hidden=jogo.fruits[crop]<=0;
  venda.querySelector(".stock")!.textContent=`No estoque: ${jogo.fruits[crop]}×`;
  venda.querySelectorAll<HTMLButtonElement>("button").forEach(botao=>botao.disabled=jogo.fruits[crop]<=0);
  const botaoTudo=venda.querySelector<HTMLButtonElement>('[data-sell="all"]')!;
  botaoTudo.textContent=jogo.fruits[crop]>0?`Vender tudo · +${jogo.fruits[crop]*ECONOMIA[crop].precoVenda}`:"Vender tudo";
 }
 avisoCeleiroVazio.hidden=crops.some(crop=>jogo.fruits[crop]>0);
 desenharPedidos();
};

const tilled=new Set<number>(jogo.tilled??[]);
// Aqui eu mantenho os plantios antigos com o solo já preparado.
jogo.plots.forEach((plot,index)=>{if(plot)tilled.add(index)});
jogo.tilled=[...tilled];
const draw=()=>{
  jogo.plots.forEach((p,i)=>{
    terreno.atualizar(i,{arado:tilled.has(i),cultivo:p?.crop,estagio:estagioCrescimento(p,now),regado:p?.watered});
  });
};

const tools=createTools(controls,app.canvas,world,terreno.texturasPlantas,terreno.indicadores);
let selectedPlot=-1;
function describe(index:number){
  if(index<0){tools.highlightPlot(-1,false,"Passe sobre a terra para selecionar um canteiro.");return}
  const p=jogo.plots[index],ready=p&&estagioCrescimento(p,Date.now())===4;
  const valid=tools.tool==="plant"?!p&&tilled.has(index)&&jogo.seeds[selected]>0:tools.tool==="harvest"?!!ready:tools.tool==="till"?!p&&!tilled.has(index):!!p&&!ready&&!p.watered;
  const status=!p?(tilled.has(index)?"Arado · pronto para plantar":"Terra fofa · precisa arar"):ready?"Pronto para colher":`Crescendo · ${Math.max(0,Math.ceil((TEMPOS[p.crop]-Date.now()+p.plantedAt)/1000))}s`;
  tools.highlightPlot(index,valid,`Canteiro ${index+1} · ${status}${p?.watered?" · Regado":""}`);
}
function executarAcao(i:number){
  hover=i;selectedPlot=i;const p=jogo.plots[i],st=estagioCrescimento(p,Date.now()),center=posicaoCanteiro(i%COLS,Math.floor(i/COLS));
  if(tools.tool==="harvest"){
    if(p&&st===4){
      const quantidade=ECONOMIA[p.crop].quantidadeColhida;
      tools.harvest(p.crop,center.x,center.y,quantidade);jogo.plots[i]=null;jogo.fruits[p.crop]+=quantidade;
      // Aqui eu devolvo o canteiro para terra fofa, obrigando um novo preparo antes de plantar.
      tilled.delete(i);
      const bonus=Math.random()<.30;if(bonus)jogo.seeds[p.crop]+=2;
      notice.textContent=`${quantidade} unidades de ${names[p.crop].toLowerCase()} adicionadas ao inventário.`+(bonus?" Você ganhou 2 sementes!":"");
    }else notice.textContent=p?"Aguarde a planta amadurecer.":"Não há planta para colher.";
  }else if(tools.tool==="plant"){
    if(!p&&tilled.has(i)&&jogo.seeds[selected]>0){jogo.plots[i]={crop:selected,plantedAt:Date.now()};jogo.seeds[selected]--;notice.textContent="Semente plantada na terra."}
    else notice.textContent=p?"Este canteiro já está ocupado.":!tilled.has(i)?"Are este canteiro uma vez antes de plantar.":`Sem sementes de ${names[selected].toLowerCase()}. Escolha outro tipo no inventário.`;
  }else if(tools.tool==="till"){
    if(tilled.has(i))notice.textContent="Este canteiro já está arado. Não precisa arar novamente.";
    else if(p)notice.textContent="Colha antes de arar este canteiro.";
    else{tilled.add(i);notice.textContent="Terra arada e pronta para plantar."}
  }else{
    if(!p)notice.textContent="Plante antes de regar.";
    else if(st===4)notice.textContent="Esta planta já está pronta para colher.";
    else if(p.watered)notice.textContent="Este canteiro já foi regado.";
    else{p.watered=true;p.plantedAt-=TEMPOS[p.crop]*.15;tools.mark(center.x,center.y,true);notice.textContent="Regado: crescimento adiantado em 15%."}
  }
  jogo.tilled=[...tilled];localStorage.setItem(KEY,JSON.stringify(jogo));sync();draw();describe(i);
}
// Aqui eu garanto que cada canteiro receba apenas uma ação durante o mesmo arraste.
let arrastando=false,ultimoPonto:{x:number;y:number}|null=null;
const canteirosVisitados=new Set<number>();
const pararArraste=()=>{arrastando=false;ultimoPonto=null;canteirosVisitados.clear()};
function percorrerArraste(q:{x:number;y:number}){
 const origem=ultimoPonto??q,passos=Math.max(1,Math.ceil(Math.hypot(q.x-origem.x,q.y-origem.y)/5));
 for(let passo=0;passo<=passos;passo++){
  const t=passo/passos,i=encontrarCanteiro(origem.x+(q.x-origem.x)*t,origem.y+(q.y-origem.y)*t);
  if(i===null||canteirosVisitados.has(i))continue;canteirosVisitados.add(i);
  const p=jogo.plots[i],pronto=p&&estagioCrescimento(p,Date.now())===4;
  const valido=tools.tool==="plant"?!p&&tilled.has(i)&&jogo.seeds[selected]>0:tools.tool==="harvest"?!!pronto:tools.tool==="till"?!p&&!tilled.has(i):!!p&&!pronto&&!p.watered;
  if(valido)executarAcao(i);
 }
 ultimoPonto=q;
}
plots.on("pointerdown",(e:any)=>{
 if(e.button!==0)return;pararArraste();arrastando=true;
 const q=world.toLocal(e.global),i=encontrarCanteiro(q.x,q.y);
 if(i!==null){canteirosVisitados.add(i);executarAcao(i)}ultimoPonto=q;
}).on("pointermove",(e:any)=>{
 const q=world.toLocal(e.global);hover=encontrarCanteiro(q.x,q.y)??-1;
 if(arrastando&&(e.buttons&1))percorrerArraste(q);else if(arrastando)pararArraste();
 describe(hover);
}).on("pointerleave",()=>{pararArraste();hover=-1;describe(selectedPlot);app.canvas.style.cursor="default"});
window.addEventListener("pointerup",pararArraste);
window.addEventListener("pointercancel",pararArraste);
window.addEventListener("blur",pararArraste);
app.canvas.style.touchAction="none";
app.ticker.add(()=>{now=Date.now();draw();terreno.animar(performance.now());tools.tick();if(hover>=0)describe(hover)});sync()
}
start().catch(erro=>{console.error("Não foi possível carregar a fazenda.",erro);document.querySelector("#root")!.insertAdjacentHTML("beforeend",'<p role="alert">Não foi possível carregar a fazenda. Atualize a página para tentar novamente.</p>')});
