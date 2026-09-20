import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { ALTURAS_PLANTAS, cantosCanteiro } from "./terreno";
import type { Cultivo } from "./economia";

export type Tool = "plant" | "harvest" | "till" | "water";
const names: Record<Tool,string> = {plant:"Plantar",harvest:"Colher",till:"Arar",water:"Regar"};

export function createTools(controls:HTMLElement,canvas:HTMLCanvasElement,world:Container,
 textures:Record<string,Texture[]>,indicadores:Container){
 let tool:Tool="plant";
 const toolbar=document.createElement("div");toolbar.className="tool-buttons";toolbar.setAttribute("role","group");toolbar.setAttribute("aria-label","Ferramentas");
 const detail=document.createElement("p");detail.className="plot-detail";detail.textContent="Passe sobre a terra para selecionar um canteiro.";
 controls.prepend(toolbar);controls.append(detail);
 const highlight=new Graphics();highlight.eventMode="none";indicadores.addChild(highlight);
 const marks=new Container();marks.eventMode="none";indicadores.addChild(marks);
 const effects=new Container();effects.eventMode="none";world.addChild(effects);
 const animations:Array<{node:Container;born:number;duration:number;update:(t:number)=>void}>=[];
 for(const key of Object.keys(names) as Tool[]){
   const button=document.createElement("button");button.innerHTML=`<img src="/assets/tools-v1/${key}.png" alt="" draggable="false"><span>${names[key]}</span>`;
   button.dataset.tool=key;button.setAttribute("aria-label",names[key]);button.setAttribute("aria-pressed",String(key===tool));
   button.onclick=()=>{tool=key;canvas.style.cursor=cursorUrls[key];toolbar.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tool===key)));};
   toolbar.append(button);
 }
 // Aqui eu uso a própria arte detalhada de cada ferramenta como cursor do jogador.
 const pontos:Record<Tool,string>={plant:"30 48",harvest:"19 49",till:"18 51",water:"17 47"};
 const cursorUrls=Object.fromEntries((Object.keys(names) as Tool[]).map(key=>[key,`url("/assets/tools-v1/cursors/${key}.png") ${pontos[key]}, crosshair`])) as Record<Tool,string>;
 function highlightPlot(index:number,valid:boolean,message:string){
   highlight.clear();detail.textContent=message;
   canvas.style.cursor=cursorUrls[tool];
   if(index<0)return;
   const cor=valid?0xffdf9b:0xd4b58a;
   // Aqui eu ilumino a superfície exata da célula selecionada, acompanhando a perspectiva do chão.
   const cantos=cantosCanteiro(index,.035);
   highlight.poly(cantos.flatMap(p=>[p.x,p.y])).fill({color:cor,alpha:valid?.20:.08});
   cantos.forEach((p,i)=>{
     const anterior=cantos[(i+3)%4],proximo=cantos[(i+1)%4];
     highlight.moveTo(p.x+(anterior.x-p.x)*.2,p.y+(anterior.y-p.y)*.2).lineTo(p.x,p.y)
       .lineTo(p.x+(proximo.x-p.x)*.2,p.y+(proximo.y-p.y)*.2).stroke({color:cor,width:1.1,alpha:valid?.8:.3});
   });
 }
 function mark(x:number,y:number,water:boolean){
   const g=new Graphics().ellipse(x,y,23,10).fill({color:water?0x214b52:0x523721,alpha:water?.22:.18});
   marks.addChild(g);
   animations.push({node:g,born:performance.now(),duration:2200,update:t=>{g.alpha=1-t}});
 }
 function harvest(crop:string,x:number,y:number,quantidade=1){
   const group=new Container();group.position.set(x,y);effects.addChild(group);
   const plant=new Sprite(textures[crop][2]);plant.anchor.set(.5,1);plant.scale.set(ALTURAS_PLANTAS[crop as Cultivo][2]/plant.texture.height);group.addChild(plant);
   const label=new Text({text:`+${quantidade} `+({wheat:"trigo",corn:"milho",sugarcane:"cana"}[crop]||crop),style:{fontFamily:"system-ui",fontSize:17,fontWeight:"bold",fill:0xfff4ca,stroke:{color:0x264437,width:3}}});label.anchor.set(.5);group.addChild(label);
   const particles=Array.from({length:crop==="wheat"?12:crop==="corn"?8:6},(_,i)=>{
     const g=new Graphics();
     if(crop==="wheat")g.ellipse(0,0,2,6).fill(0xffd975);
     else if(crop==="corn")g.roundRect(-4,-4,8,8,3).fill(i%2?0xffe296:0xf2b32a);
     else g.roundRect(-3,-10,6,20,2).fill(0x9ada69).moveTo(-3,0).lineTo(3,0).stroke({color:0xe8fbb4,width:2});
     group.addChild(g);return g;
   });
   animations.push({node:group,born:performance.now(),duration:1100,update:t=>{
     plant.alpha=1-Math.min(1,t*2);plant.y=-t*30;plant.rotation=crop==="wheat"?Math.sin(t*20)*.12:crop==="corn"?t*.4:-t*.3;
     label.y=-45-42*t;label.alpha=1-t*t;
     particles.forEach((p,i)=>{const angle=i/particles.length*Math.PI*2;p.x=Math.cos(angle)*t*(crop==="corn"?60:42);p.y=-25-Math.sin(Math.PI*t)*50+Math.sin(angle)*t*25;p.rotation=t*(i%2?3:-3);p.alpha=1-t});
   }});
 }
 function tick(){const now=performance.now();highlight.alpha=.86+Math.sin(now/210)*.12;for(let i=animations.length-1;i>=0;i--){const a=animations[i],t=Math.min(1,(now-a.born)/a.duration);a.update(t);if(t===1){a.node.destroy({children:true});animations.splice(i,1)}}}
 return {get tool(){return tool},selectTool(key:Tool){toolbar.querySelector<HTMLButtonElement>(`[data-tool="${key}"]`)!.click()},highlightPlot,harvest,mark,tick};
}
