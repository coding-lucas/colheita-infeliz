import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import "./styles.css";
import { createTools } from "./tools";

const W=1040,H=560,COLS=8,ROWS=6,TW=112,TH=66,KEY="horta-horizonte-play-v2";
type Cultivo="wheat"|"corn"|"sugarcane"; type Canteiro={crop:Cultivo;plantedAt:number;watered?:boolean}|null; type EstadoJogo={coins:number;cash:number;tilled?:number[];plots:Canteiro[];seeds:Record<Cultivo,number>;fruits:Record<Cultivo,number>};
const TEMPOS:Record<Cultivo,number>={wheat:8000,corn:18000,sugarcane:28000};
const criarJogoNovo=():EstadoJogo=>({coins:100,cash:0,plots:Array.from({length:48},()=>null),seeds:{wheat:10,corn:10,sugarcane:10},fruits:{wheat:0,corn:0,sugarcane:0}});
const carregarJogo=():EstadoJogo=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x?.plots?.length!==48)return criarJogoNovo();if(typeof x.seeds!=="object"||!x.seeds)x.seeds={wheat:10,corn:10,sugarcane:10};x.coins=Number.isFinite(x.coins)?Math.max(0,x.coins):100;x.cash=Number.isFinite(x.cash)?Math.max(0,x.cash):Number.isFinite(x.sketch)?Math.max(0,x.sketch):0;delete x.sketch;localStorage.setItem(KEY,JSON.stringify(x));return x}catch{return criarJogoNovo()}};
// Aqui eu transformo a posição de cada canteiro nas coordenadas do terreno.
const mapearTerreno = (u:number,v:number) => ({
  x:520+340*u-340*v,
  y:148+151*u+140*v+10*u*v
});
const posicaoCanteiro=(c:number,r:number)=>mapearTerreno((c+.5)/COLS,(r+.5)/ROWS);
const encontrarCanteiro=(x:number,y:number)=>{
  let u=.5,v=.5;
  for(let step=0;step<8;step++){
    const p=mapearTerreno(u,v),dx=x-p.x,dy=y-p.y;
    const yu=151+10*v,yv=140+10*u,det=340*(yu+yv);
    u+=(yv*dx+340*dy)/det;v+=(-yu*dx+340*dy)/det;
  }
  if(u<0||u>=1||v<0||v>=1)return null;
  return Math.floor(v*ROWS)*COLS+Math.floor(u*COLS);
};
const estagioCrescimento=(p:Canteiro,n:number)=>{
  if(!p)return 0;
  const elapsed=Math.max(0,n-p.plantedAt),duration=TEMPOS[p.crop];
  if(elapsed>=duration)return 4;
  return elapsed<duration/3?1:elapsed<duration*2/3?2:3;
};
function recortarQuadro(src:Texture,cell:number,i:number){return new Texture({source:src.source,frame:new Rectangle(i*cell,0,cell,src.height)})}
async function start(){const root=document.querySelector<HTMLDivElement>("#root")!;const app=new Application();await app.init({resizeTo:root,background:"#0a2932",antialias:true,autoDensity:true});root.appendChild(app.canvas);const world=new Container();app.stage.addChild(world);const fit=()=>{const s=Math.max(app.screen.width/W,app.screen.height/H);world.scale.set(s);world.position.set((app.screen.width-W*s)/2,(app.screen.height-H*s)/2)};app.renderer.on("resize",fit);fit();const bgTex=await Assets.load<Texture>("/assets/cenario/fazenda.png");const bg=new Sprite(bgTex);bg.width=W;bg.height=H;world.addChild(bg);const sheets={wheat:await Assets.load<Texture>("/assets/plantas/trigo.png"),corn:await Assets.load<Texture>("/assets/plantas/milho.png"),sugarcane:await Assets.load<Texture>("/assets/plantas/cana.png")};const plots=new Container();plots.eventMode="static";plots.hitArea=new Rectangle(0,0,W,H);world.addChild(plots);let jogo=carregarJogo(),now=Date.now(),selected:Cultivo="wheat",hover=-1;
const names:Record<Cultivo,string>={wheat:"Trigo",corn:"Milho",sugarcane:"Cana"};
const crops:Cultivo[]=["wheat","corn","sugarcane"];
const controls=document.createElement("aside");controls.className="controls";
controls.innerHTML='<p id="notice" role="status">Abra o inventário e escolha uma semente.</p>';
root.appendChild(controls);
const notice=controls.querySelector("#notice")!;
const inventoryButton=document.createElement("button");inventoryButton.className="inventory-toggle";
inventoryButton.setAttribute("aria-label","Abrir inventário");inventoryButton.setAttribute("aria-expanded","false");inventoryButton.setAttribute("aria-controls","inventory");
inventoryButton.innerHTML='<span class="item-sprite crate" aria-hidden="true"></span><span class="button-label">Inventário</span>';
root.appendChild(inventoryButton);
const inventory=document.createElement("section");inventory.id="inventory";inventory.className="inventory";inventory.hidden=true;
inventory.setAttribute("aria-label","Inventário da fazenda");
inventory.innerHTML='<header><div><span class="eyebrow">SEU ESTOQUE</span><h2>Inventário</h2></div><button class="inventory-close" aria-label="Fechar inventário">×</button></header><div class="inventory-tabs" role="group" aria-label="Categorias"><button data-category="seeds" aria-pressed="true">Sementes</button><button data-category="harvest" aria-pressed="false">Colheita</button></div><p class="inventory-hint">Escolha uma semente para plantar.</p><div class="seed-slots"></div><div class="harvest-slots" hidden></div><footer>Progresso salvo automaticamente</footer>';
root.appendChild(inventory);
function toggleInventory(open:boolean){inventory.hidden=!open;inventoryButton.setAttribute("aria-expanded",String(open));if(open)(inventory.querySelector('[data-category][aria-pressed="true"]') as HTMLButtonElement)?.focus();else inventoryButton.focus()}
inventoryButton.onclick=()=>{fecharLoja();toggleInventory(inventory.hidden)};
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
const botaoLoja=document.createElement("button");botaoLoja.className="inventory-toggle shop-toggle";botaoLoja.setAttribute("aria-label","Abrir loja");botaoLoja.setAttribute("aria-expanded","false");botaoLoja.innerHTML='<span class="item-sprite shop-icon" aria-hidden="true"></span><span class="button-label">Loja</span>';root.appendChild(botaoLoja);
const loja=document.createElement("section");loja.className="inventory shop";loja.hidden=true;loja.setAttribute("aria-label","Loja de sementes");
loja.innerHTML='<header><h2>Loja de sementes</h2><button class="inventory-close" aria-label="Fechar loja">×</button></header><p>Cada semente custa 10 moedas.</p><div class="shop-items"></div><p class="shop-status" role="status"></p>';root.appendChild(loja);
function fecharLoja(){loja.hidden=true;botaoLoja.setAttribute("aria-expanded","false")}
botaoLoja.onclick=()=>{const abrir=loja.hidden;loja.hidden=!abrir;botaoLoja.setAttribute("aria-expanded",String(abrir));if(abrir){inventory.hidden=true;inventoryButton.setAttribute("aria-expanded","false")}};
loja.querySelector(".inventory-close")!.addEventListener("click",fecharLoja);
for(const crop of crops){
 const card=document.createElement("div");card.className="harvest-slot";
 card.innerHTML=`<span class="item-sprite ${crop}" aria-hidden="true"></span><strong>${names[crop]}</strong><button data-buy="${crop}" aria-label="Comprar semente de ${names[crop]} por 10 moedas">10 moedas</button>`;
 card.querySelector("button")!.onclick=()=>{if(jogo.coins<10){loja.querySelector(".shop-status")!.textContent="Moedas insuficientes.";return}jogo.coins-=10;jogo.seeds[crop]++;localStorage.setItem(KEY,JSON.stringify(jogo));sync();loja.querySelector(".shop-status")!.textContent=`+1 semente de ${names[crop].toLowerCase()} no inventário.`};
 loja.querySelector(".shop-items")!.appendChild(card);
}
const sync=()=>{
 saldo.querySelector("#coin-balance")!.textContent=String(jogo.coins);
 saldo.querySelector("#cash-balance")!.textContent=String(jogo.cash);
 loja.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach(button=>button.disabled=jogo.coins<10);
 for(const crop of crops){
  const item=harvested.querySelector<HTMLElement>(`[data-crop="${crop}"]`)!;
  item.querySelector(".quantity")!.textContent=jogo.fruits[crop]+"×";
  item.setAttribute("aria-label",`${names[crop]} colhido: ${jogo.fruits[crop]} unidades`);
  const button=slots.querySelector<HTMLButtonElement>(`[data-crop="${crop}"]`)!;
  button.disabled=jogo.seeds[crop]<=0;button.setAttribute("aria-pressed",String(selected===crop));
  button.setAttribute("aria-label",`Semente de ${names[crop]}, ${jogo.seeds[crop]} unidades`);
  button.querySelector(".quantity")!.textContent=jogo.seeds[crop]+"×";
 }

};

// Aqui eu reaproveito as texturas para o jogo continuar leve durante a animação.
plots.sortableChildren=true;
const textures={} as Record<Cultivo,Texture[]>;
for(const crop of ["wheat","corn","sugarcane"] as Cultivo[]){
  textures[crop]=[0,1,3].map(index=>recortarQuadro(sheets[crop],crop==="wheat"?512:543,index));
}
const views=jogo.plots.map((_,i)=>{
  const q=posicaoCanteiro(i%COLS,Math.floor(i/COLS));
  const holder=new Container(); holder.position.set(q.x,q.y);holder.zIndex=q.y;
  holder.eventMode="none";
  const seed=new Graphics().ellipse(-3,0,3,1.8).fill(0xdca550).ellipse(3,2,2.5,1.5).fill(0xb88139);
  const plant=new Sprite(Texture.EMPTY);plant.visible=false;
  holder.addChild(seed,plant);plots.addChild(holder);
  return {holder,seed,plant,last:""};
});
const draw=()=>{
  jogo.plots.forEach((p,i)=>{
    const view=views[i],st=estagioCrescimento(p,now),signature=p?p.crop+st:"empty";
    if(view.last===signature)return;
    view.last=signature;view.holder.visible=!!p;
    if(!p)return;
    view.seed.visible=st===1;view.plant.visible=st>1;
    if(st>1){
      view.plant.texture=textures[p.crop][st-2];
      // Aqui eu apoio a planta no centro do canteiro para ela não parecer flutuando.
      view.plant.anchor.set(.5,p.crop==="wheat"?.77:.80);
      view.plant.scale.set(.12);
    }
  });
};

const tools=createTools(controls,app.canvas,world,mapearTerreno,textures);
const tilled=new Set<number>(jogo.tilled??[]);
 // Aqui eu mantenho os plantios antigos com o solo já preparado.
 jogo.plots.forEach((plot,index)=>{if(plot)tilled.add(index)});
 tilled.forEach(index=>tools.till(index));
 jogo.tilled=[...tilled];
let selectedPlot=-1;
function describe(index:number){
  if(index<0){tools.highlightPlot(-1,false,"Passe sobre a terra para selecionar um canteiro.");return}
  const p=jogo.plots[index],ready=p&&estagioCrescimento(p,Date.now())===4;
  const valid=tools.tool==="plant"?!p&&tilled.has(index)&&jogo.seeds[selected]>0:tools.tool==="harvest"?!!ready:tools.tool==="till"?!p&&!tilled.has(index):!!p&&!ready&&!p.watered;
  const status=!p?(tilled.has(index)?"Arado · pronto para plantar":"Vazio"):ready?"Pronto para colher":`Crescendo · ${Math.max(0,Math.ceil((TEMPOS[p.crop]-Date.now()+p.plantedAt)/1000))}s`;
  tools.highlightPlot(index,valid,`Canteiro ${index+1} · ${status}${p?.watered?" · Regado":""}`);
}
function executarAcao(i:number){
  hover=i;selectedPlot=i;const p=jogo.plots[i],st=estagioCrescimento(p,Date.now()),center=posicaoCanteiro(i%COLS,Math.floor(i/COLS));
  if(tools.tool==="harvest"){
    if(p&&st===4){
      tools.harvest(p.crop,center.x,center.y);jogo.plots[i]=null;jogo.fruits[p.crop]++;
      const bonus=Math.random()<.30;if(bonus)jogo.seeds[p.crop]+=2;
      notice.textContent="Colheita adicionada ao inventário."+(bonus?" Você ganhou 2 sementes!":"");
    }else notice.textContent=p?"Aguarde a planta amadurecer.":"Não há planta para colher.";
  }else if(tools.tool==="plant"){
    if(!p&&tilled.has(i)&&jogo.seeds[selected]>0){jogo.plots[i]={crop:selected,plantedAt:Date.now()};jogo.seeds[selected]--;notice.textContent="Semente plantada na terra."}
    else notice.textContent=p?"Este canteiro já está ocupado.":!tilled.has(i)?"Are este canteiro uma vez antes de plantar.":`Sem sementes de ${names[selected].toLowerCase()}. Escolha outro tipo no inventário.`;
  }else if(tools.tool==="till"){
    if(tilled.has(i))notice.textContent="Este canteiro já está arado. Não precisa arar novamente.";
    else if(p)notice.textContent="Colha antes de arar este canteiro.";
    else{tilled.add(i);tools.till(i);notice.textContent="Terra arada e pronta para plantar. Os sulcos são permanentes."}
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
app.ticker.add(()=>{now=Date.now();draw();tools.tick();if(hover>=0)describe(hover)});sync()
}
start();
