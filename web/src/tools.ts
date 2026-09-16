import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";

export type Tool = "plant" | "harvest" | "till" | "water";
const names: Record<Tool,string> = {plant:"Plantar",harvest:"Colher",till:"Arar",water:"Regar"};
const colors: Record<Tool,number> = {plant:0xbde582,harvest:0xffd269,till:0xe5b181,water:0x70d9ff};
// Aqui eu mantenho desenhos simples apenas para o cursor acompanhar a ferramenta escolhida.
const paths: Record<Tool,string> = {
 plant:'<path d="M16 27V15M16 19C5 19 4 10 5 7c9 0 12 5 11 12ZM16 15c0-8 5-12 12-11 0 8-5 12-12 11Z"/>',
 harvest:'<path d="M8 29l9-14M17 15C9 11 15 2 24 4c8 3 6 12-1 16 4-7 2-12-2-12"/>',
 till:'<path d="M6 28L23 6M17 7l12 9-5 6-11-10Z"/>',
 water:'<path d="M7 12h14v14H7ZM8 12V8h11v4M21 17l7-6 2 4-9 8M6 14C0 12 0 24 7 23"/><path d="M28 23v3M25 27v3"/>'
};
export const icon=(tool:Tool)=>'<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><g fill="#173e36" stroke="#fff0bd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+paths[tool]+'</g></svg>';

export function createTools(controls:HTMLElement,canvas:HTMLCanvasElement,world:Container,
 ground:(u:number,v:number)=>{x:number;y:number},textures:Record<string,Texture[]>){
 let tool:Tool="plant";
 const toolbar=document.createElement("div");toolbar.className="tool-buttons";toolbar.setAttribute("role","group");toolbar.setAttribute("aria-label","Ferramentas");
 const detail=document.createElement("p");detail.className="plot-detail";detail.textContent="Passe sobre a terra para selecionar um canteiro.";
 controls.prepend(toolbar);controls.append(detail);
 const highlight=new Graphics();highlight.eventMode="none";world.addChildAt(highlight,1);
 const marks=new Container();marks.eventMode="none";world.addChildAt(marks,1);
 const effects=new Container();effects.eventMode="none";world.addChild(effects);
 const animations:Array<{node:Container;born:number;duration:number;update:(t:number)=>void}>=[];
 for(const key of Object.keys(names) as Tool[]){
   const button=document.createElement("button");button.innerHTML=`<img src="/assets/tools-v1/${key}.png" alt="" draggable="false"><span>${names[key]}</span>`;
   button.dataset.tool=key;button.setAttribute("aria-label",names[key]);button.setAttribute("aria-pressed",String(key===tool));
   button.onclick=()=>{tool=key;toolbar.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tool===key)));};
   toolbar.append(button);
 }
 const cursorUrls=Object.fromEntries((Object.keys(names) as Tool[]).map(key=>[key,'url("data:image/svg+xml,'+encodeURIComponent(icon(key))+'") 8 28, crosshair']));
 function highlightPlot(index:number,valid:boolean,message:string){
   highlight.clear();detail.textContent=message;
   canvas.style.cursor=index<0?"default":valid?cursorUrls[tool]:"not-allowed";
   if(index<0)return;
   const c=index%8,r=Math.floor(index/8);
   const points=[[c/8,r/6],[(c+1)/8,r/6],[(c+1)/8,(r+1)/6],[c/8,(r+1)/6]].flatMap(([u,v])=>{const p=ground(u,v);return[p.x,p.y]});
   highlight.poly(points).fill({color:valid?colors[tool]:0xe58a75,alpha:.24}).stroke({color:valid?colors[tool]:0xe58a75,width:2});
 }
 const furrows=new Graphics();furrows.eventMode="none";marks.addChild(furrows);
 const prepared=new Set<number>();
 function till(index:number){
   if(prepared.has(index))return;
   prepared.add(index);
   const c=index%8,r=Math.floor(index/8);
   for(let line=1;line<=4;line++){
     const a=ground((c+.14)/8,(r+line/5)/6);
     const b=ground((c+.86)/8,(r+line/5)/6);
     furrows.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:0x57321d,width:3,alpha:.8,cap:"round"});
     furrows.moveTo(a.x,a.y+2).lineTo(b.x,b.y+2).stroke({color:0xd0a066,width:1,alpha:.65,cap:"round"});
   }
 }
 function mark(x:number,y:number,water:boolean){
   const g=new Graphics().ellipse(x,y,23,10).fill({color:water?0x214b52:0x523721,alpha:water?.22:.18});
   marks.addChild(g);
   animations.push({node:g,born:performance.now(),duration:2200,update:t=>{g.alpha=1-t}});
 }
 function harvest(crop:string,x:number,y:number){
   const group=new Container();group.position.set(x,y);effects.addChild(group);
   const plant=new Sprite(textures[crop][2]);plant.anchor.set(.5,crop==="wheat"?.77:.8);plant.scale.set(.12);group.addChild(plant);
   const label=new Text({text:"+1 "+({wheat:"trigo",corn:"milho",sugarcane:"cana"}[crop]||crop),style:{fontFamily:"system-ui",fontSize:17,fontWeight:"bold",fill:0xfff4ca,stroke:{color:0x264437,width:3}}});label.anchor.set(.5);group.addChild(label);
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
 function tick(){const now=performance.now();for(let i=animations.length-1;i>=0;i--){const a=animations[i],t=Math.min(1,(now-a.born)/a.duration);a.update(t);if(t===1){a.node.destroy({children:true});animations.splice(i,1)}}}
 return {get tool(){return tool},selectTool(key:Tool){toolbar.querySelector<HTMLButtonElement>(`[data-tool="${key}"]`)!.click()},highlightPlot,harvest,mark,till,tick};
}
