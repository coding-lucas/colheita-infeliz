export type Cultivo="wheat"|"corn"|"sugarcane";

export type Pedido={
  id:number;
  crop:Cultivo;
  quantity:number;
  rewardCoins:number;
  rewardCash:number;
};

export const ECONOMIA:Record<Cultivo,{nome:string;tempo:number;precoVenda:number;quantidadeColhida:number}>={
  wheat:{nome:"Trigo",tempo:8000,precoVenda:8,quantidadeColhida:3},
  corn:{nome:"Milho",tempo:18000,precoVenda:14,quantidadeColhida:4},
  sugarcane:{nome:"Cana",tempo:28000,precoVenda:20,quantidadeColhida:5}
};

export const PEDIDOS_INICIAIS:Pedido[]=[
  {id:1,crop:"wheat",quantity:6,rewardCoins:58,rewardCash:0},
  {id:2,crop:"corn",quantity:8,rewardCoins:145,rewardCash:0},
  {id:3,crop:"sugarcane",quantity:10,rewardCoins:280,rewardCash:1}
];

// Aqui eu gero pedidos previsíveis para a economia continuar equilibrada conforme o jogador avança.
export function criarPedido(id:number):Pedido{
  const cultivos=Object.keys(ECONOMIA) as Cultivo[];
  const crop=cultivos[(id-1)%cultivos.length];
  const quantidade=6+((id*2)%5);
  const recompensa=Math.round(quantidade*ECONOMIA[crop].precoVenda*1.25);
  return {id,crop,quantity:quantidade,rewardCoins:recompensa,rewardCash:id%5===0?1:0};
}
