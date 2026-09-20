import { Assets, Container, Graphics, Mesh, MeshGeometry, Rectangle, Sprite, Texture } from "pixi.js";
import type { Cultivo } from "./economia";

export const COLUNAS = 8;
export const LINHAS = 6;
const PASSO_X = 48;
const PASSO_Y = 24;
const ORIGEM = { x: 472, y: 132 };

export type PontoTerreno = { x: number; y: number };
export type EstadoVisualCanteiro = {
  arado: boolean;
  cultivo?: Cultivo;
  estagio: number;
  regado?: boolean;
};

// Aqui eu uso a mesma projeção para os desenhos, as plantas e o clique do jogador.
export function mapearTerreno(u: number, v: number): PontoTerreno {
  const coluna = u * COLUNAS, linha = v * LINHAS;
  return { x: ORIGEM.x + (coluna - linha) * PASSO_X, y: ORIGEM.y + (coluna + linha) * PASSO_Y };
}

export function posicaoCanteiro(coluna: number, linha: number) {
  return mapearTerreno((coluna + .5) / COLUNAS, (linha + .5) / LINHAS);
}

export function cantosCanteiro(indice: number, margem = 0): PontoTerreno[] {
  const coluna = indice % COLUNAS, linha = Math.floor(indice / COLUNAS);
  return [[coluna + margem, linha + margem], [coluna + 1 - margem, linha + margem],
    [coluna + 1 - margem, linha + 1 - margem], [coluna + margem, linha + 1 - margem]]
    .map(([c, l]) => mapearTerreno(c / COLUNAS, l / LINHAS));
}

export function encontrarCanteiro(x: number, y: number): number | null {
  const dx = (x - ORIGEM.x) / PASSO_X, dy = (y - ORIGEM.y) / PASSO_Y;
  const coluna = (dx + dy) / 2, linha = (dy - dx) / 2;
  if (coluna < 0 || coluna >= COLUNAS || linha < 0 || linha >= LINHAS) return null;
  return Math.floor(linha) * COLUNAS + Math.floor(coluna);
}

function geometriaDoSolo(indice: number) {
  const partes = 6, coluna = indice % COLUNAS, linha = Math.floor(indice / COLUNAS);
  const pontos: number[] = [], coordenadas: number[] = [], triangulos: number[] = [];
  for (let y = 0; y <= partes; y++) {
    for (let x = 0; x <= partes; x++) {
      const c = coluna + x / partes, l = linha + y / partes;
      const p = mapearTerreno(c / COLUNAS, l / LINHAS);
      // Aqui eu recorto só o perímetro externo, com pequenas irregularidades naturais na terra.
      const recuo = 1.2 + Math.sin(c * 27.1 + l * 31.7) * .9 + Math.cos(c * 11.3 - l * 19.1) * .6;
      if (c === 0) { p.x += recuo * .45; p.y += recuo * .9; }
      if (c === COLUNAS) { p.x -= recuo * .45; p.y -= recuo * .9; }
      if (l === 0) { p.x -= recuo * .45; p.y += recuo * .9; }
      if (l === LINHAS) { p.x += recuo * .45; p.y -= recuo * .9; }
      pontos.push(p.x, p.y); coordenadas.push(x / partes, y / partes);
      if (x < partes && y < partes) {
        const a = y * (partes + 1) + x, b = a + partes + 1;
        triangulos.push(a, a + 1, b + 1, a, b + 1, b);
      }
    }
  }
  return new MeshGeometry({ positions: new Float32Array(pontos), uvs: new Float32Array(coordenadas), indices: new Uint32Array(triangulos) });
}

export const ALTURAS_PLANTAS: Record<Cultivo, number[]> = {
  wheat: [19, 43, 78], corn: [20, 52, 90], sugarcane: [23, 55, 98]
};

async function carregarVegetacao() {
  const imagem = new Image();
  imagem.src = "/assets/plantas/vegetacao-v3.png";
  await imagem.decode();
  const atlas = Texture.from(imagem);
  const leitura = document.createElement("canvas");
  leitura.width = imagem.width; leitura.height = imagem.height;
  const contexto = leitura.getContext("2d", { willReadFrequently: true })!;
  contexto.drawImage(imagem, 0, 0);
  const pixels = contexto.getImageData(0, 0, imagem.width, imagem.height).data;
  const cultivos: Cultivo[] = ["wheat", "corn", "sugarcane"];
  // Aqui eu recorto somente as margens transparentes; cada caule fica apoiado no chão.
  const limitesLinhas = [0, 385, 789, 1254].map(y => Math.round(y * imagem.height / 1254));
  const texturas = {} as Record<Cultivo, Texture[]>;
  cultivos.forEach((cultivo, linha) => {
    texturas[cultivo] = Array.from({ length: 3 }, (_, coluna) => {
      const inicioX = Math.floor(coluna * imagem.width / 3), fimX = Math.floor((coluna + 1) * imagem.width / 3);
      let esquerda = fimX, direita = inicioX, topo = limitesLinhas[linha + 1], base = limitesLinhas[linha];
      for (let y = limitesLinhas[linha]; y < limitesLinhas[linha + 1]; y++) {
        for (let x = inicioX; x < fimX; x++) {
          if (pixels[(y * imagem.width + x) * 4 + 3] < 48) continue;
          esquerda = Math.min(esquerda, x); direita = Math.max(direita, x);
          topo = Math.min(topo, y); base = Math.max(base, y);
        }
      }
      return new Texture({ source: atlas.source, frame: new Rectangle(esquerda, topo, direita - esquerda + 1, base - topo + 1) });
    });
  });
  return texturas;
}

export async function criarTerreno(mundo: Container) {
  const [atlasSolo, texturasPlantas, atlasGrama] = await Promise.all([
    Assets.load<Texture>("/assets/terreno/estados-solo-v3.png"), carregarVegetacao(),
    Assets.load<Texture>("/assets/terreno/bordas-grama-v3.png")
  ]);
  const lado = atlasSolo.width / 3;
  const solos = [0, 1, 2].map(i => new Texture({ source: atlasSolo.source, frame: new Rectangle(i * lado, 0, lado, atlasSolo.height) }));
  const chao = new Container(); chao.eventMode = "none";
  const indicadores = new Container(); indicadores.eventMode = "none";
  const vegetacao = new Container(); vegetacao.eventMode = "none"; vegetacao.sortableChildren = true;
  mundo.addChild(chao, indicadores, vegetacao);

  const contorno = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => mapearTerreno(u, v));

  const canteiros = Array.from({ length: COLUNAS * LINHAS }, (_, indice) => {
    // Aqui cada vértice coincide com o da célula vizinha, inclusive quando a textura muda.
    const geometria = geometriaDoSolo(indice);
    const solo = new Mesh({ geometry: geometria, texture: solos[0] });
    chao.addChild(solo);
    const ponto = posicaoCanteiro(indice % COLUNAS, Math.floor(indice / COLUNAS));
    const grupo = new Container(); grupo.position.set(ponto.x, ponto.y); grupo.zIndex = ponto.y;
    const sombra = new Graphics().ellipse(4, 2, 17, 6).fill({ color: 0x342611, alpha: .18 })
      .ellipse(1, 1, 8, 3).fill({ color: 0x2a2013, alpha: .23 });
    const planta = new Sprite(Texture.EMPTY); planta.anchor.set(.5, 1);
    grupo.addChild(sombra, planta); grupo.visible = false; vegetacao.addChild(grupo);
    return { solo, grupo, sombra, planta, assinatura: "" };
  });

  // Aqui eu deixo a grama avançar um pouco sobre a borda para a horta fazer parte do cenário.
  const franjas = Array.from({ length: 6 }, (_, i) => new Texture({
    source: atlasGrama.source,
    frame: new Rectangle(i * atlasGrama.width / 6, atlasGrama.height * .31, atlasGrama.width / 6, atlasGrama.height * .37)
  }));
  contorno.forEach((inicio, lado) => {
    const fim = contorno[(lado + 1) % 4], dx = fim.x - inicio.x, dy = fim.y - inicio.y;
    const comprimento = Math.hypot(dx, dy), quantidade = Math.ceil(comprimento / 11);
    for (let i = 0; i <= quantidade; i++) {
      const variacao = (Math.sin((i + lado * 29) * 78.23) + 1) / 2;
      const t = Math.min(1, Math.max(0, (i + (variacao - .5) * .7) / quantidade));
      const tufo = new Sprite(franjas[(i + lado * 2) % franjas.length]);
      tufo.anchor.set(.5, .92);
      const margem = lado === 0 || lado === 3 ? -3 : 1;
      tufo.position.set(inicio.x + dx * t + dy / comprimento * margem, inicio.y + dy * t - dx / comprimento * margem);
      tufo.width = 18 + variacao * 13; tufo.height = 13 + variacao * 5;
      tufo.zIndex = tufo.y + 2; vegetacao.addChild(tufo);
    }
  });

  function atualizar(indice: number, estado: EstadoVisualCanteiro) {
    const vista = canteiros[indice];
    const assinatura = `${estado.arado}/${estado.cultivo}/${estado.estagio}/${!!estado.regado}`;
    if (vista.assinatura === assinatura) return;
    vista.assinatura = assinatura;
    // Aqui eu substituo a textura de um único chão. A vegetação não traz outra base de terra.
    vista.solo.texture = solos[estado.cultivo && estado.estagio === 1 ? 2 : estado.arado ? 1 : 0];
    vista.solo.tint = estado.regado ? 0xc3b3a3 : 0xffffff;
    vista.grupo.visible = !!estado.cultivo && estado.estagio > 1;
    if (!estado.cultivo || estado.estagio < 2) return;
    const quadro = estado.estagio - 2;
    vista.planta.texture = texturasPlantas[estado.cultivo][quadro];
    vista.planta.scale.set(ALTURAS_PLANTAS[estado.cultivo][quadro] / vista.planta.texture.height);
    vista.sombra.scale.set([.4, .7, 1][quadro]);
  }

  function animar(tempo: number) {
    canteiros.forEach((vista, indice) => {
      if (vista.grupo.visible) vista.planta.skew.x = Math.sin(tempo / 950 + indice * .7) * .009;
    });
  }

  return { atualizar, animar, indicadores, texturasPlantas };
}
