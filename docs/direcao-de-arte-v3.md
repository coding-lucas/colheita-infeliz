# Direção de arte — cenário e terreno v3

Eu montei a horta numa projeção ortográfica única: cada célula avança 48 unidades na horizontal e 24 na vertical. As 8 colunas e 6 linhas compartilham as mesmas bordas. O cenário tem somente grama no centro; o solo pertence às células do jogo.

Eu troco a textura da mesma célula entre terra fofa, terra arada e terra semeada. As plantas contêm apenas vegetação e ficam ancoradas na base, com sombra de contato. Depois de colher, a célula volta para terra fofa. Regar escurece somente o solo daquela célula. A grama cobre discretamente o perímetro irregular da horta.

Os arquivos anteriores foram preservados. Não alterei o formato nem a chave do salvamento, os saldos, os tempos de crescimento ou a versão 0.0.1 nesta etapa.

## Especificações utilizadas para as artes

### Cenário

Arquivo: `web/public/assets/cenario/fazenda-isometrica-v3.png`.

Use case: stylized-concept. Asset: final background for a browser farming game, landscape 16:9. Redesign the supplied farm illustration to use a fixed ORTHOGRAPHIC ISOMETRIC camera looking down at approximately 30 degrees, with parallel ground directions, no perspective vanishing point, no horizon and no sky. Retain its warm hand-painted storybook art, rich but natural colors, soft upper-left sunshine and charming rural materials. The central 75 percent of the image must be a spacious uninterrupted quiet grassy meadow, relatively flat olive/sage grass texture, with NO soil field, NO diamond shape, NO tiles, NO planting beds, NO grid and NO plants/crops baked into the middle. This empty meadow will receive independent game terrain tiles. Place scenery only around the outer margins: a small cozy farmhouse and wood fence near the upper-left margin, a little pond with reeds at the far upper-right margin, distant boundary trees across the top, a slim dirt walking path along the outer lower/left edge, a few restrained rocks and wildflowers on the edges. Match the scale of a small isometric farm plot, keep scenery subordinate and uncluttered. The entire central lower-middle area must remain open grass. No text, UI, labels, logos, humans, tools, floating islands, thick vignette or decorative frame. High quality finished game illustration.

### Estados do solo

Arquivo: `web/public/assets/terreno/estados-solo-v3.png`.

Use case: stylized-concept. Asset: production game material atlas, EXACTLY three equal square textures edge-to-edge in one horizontal row, 3:1 canvas, no gutters. Camera for this atlas is DIRECTLY TOP DOWN 90 degrees, absolutely NO perspective and NO isometric diamond: the game engine will project these square textures onto its isometric tile geometry. Left square = freshly loosened warm brown soil, fine organic clumps, subtle varied detail, no furrows. Middle square = the same exact soil after hoeing, with exactly THREE subtle parallel furrows running VERTICALLY from the TOP edge all the way to the BOTTOM edge, evenly spaced at 1/6, 1/2, 5/6 of the square width. Right square = the exact same hoed soil with a few tiny planted seed holes and small half-buried seeds in the three furrows. Each square fills its area completely with opaque soil; NO transparency, border, rim, grass, stone outline, lighting gradient, vignette, tall mound or floating clod border. Textures must be SEAMLESS TILEABLE; furrows continue without end caps at top and bottom so adjacent squares form continuous planting rows. Use the same warm ochre umber color and small-scale hand-painted detail in all three squares. Low subtle relief with small interior contact shadows, soft upper-left lighting, harmonious beautiful cozy farming game style. No plants or shoots yet. No text, labels, separator lines, UI, margins or background. Finished usable textures, not an illustration of three objects.

### Plantas sem base de terra

Arquivo: `web/public/assets/plantas/vegetacao-v3.png`.

Use case: stylized-concept. Asset: production PNG sprite atlas for a cozy isometric farming browser game. Create exactly NINE isolated PLANT-ONLY sprites on a genuinely transparent background in an evenly spaced 3 by 3 grid, square canvas. Each grid cell is identical in size. Rows are crop types; columns are growth ages. Row 1: wheat — a tiny two-leaf seedling, a medium young green cluster, a fully mature graceful golden wheat cluster with grain heads. Row 2: corn — a tiny green seedling, a medium leafy corn stalk, mature green corn stalks with golden ears. Row 3: sugarcane — a tiny thin shoot, a medium green leafy cane, mature tall jointed pale green sugarcanes. All nine have bases consistently aligned at 85 percent of the height of their respective cell, centered at half cell width, with clear transparent spacing. The small stages must be physically much smaller than the mature stage, not each filling its cell. Camera: all seen from the exact same fixed orthographic isometric 3/4 camera looking down at 30 degrees, soft light from upper left. Style: beautiful detailed hand-painted semi-realistic storybook game assets, warm natural colors, lively smooth foliage, clean readable silhouettes. CRITICAL: render vegetation ONLY, cut cleanly at ground contact. NO dirt, NO brown earth, NO mound, NO pot, NO tile, NO grass patch, NO rocks, NO pedestal, NO roots, NO cast shadow, NO background glow. The plants must be compositable onto separate soil tiles. No words, gridlines, frames, numbers, interface or duplicate extra sprites.

### Acabamento de grama

Arquivo: `web/public/assets/terreno/bordas-grama-v3.png`.

Use case: stylized-concept. Asset: small transparent grass fringe sprites for a hand-painted isometric farming game. Create SIX separate low irregular clusters of short olive-green and warm yellow-green meadow grass, arranged evenly in a single horizontal row, each clearly isolated with generous transparent padding. Ground camera is fixed orthographic isometric 3/4 looking down 30 degrees. Each cluster is low and wide, a few tiny soft overlapping curved grass blades of different heights, dense at the base, natural clean cutout edge. Three clusters lean gently left and three gently right. Rich storybook hand-painted finish, fine restrained detail, warm soft sunshine from upper left, muted chartreuse and sage palette. The sprites will be displayed very small along the edge where brown farming soil meets a grassy field, so prioritize soft natural silhouettes without hard outlines. GENUINELY transparent background with alpha. No soil, no platform, no brown bases, no flowers, no rocks, no shadow backdrop, no checkerboard, no labels, no frames or text. Landscape atlas, six equal square cells side by side.

## Validação

- Build de produção do Vite.
- 240 pontos internos, limites externos e bordas compartilhadas da projeção.
- Fluxo no navegador: arar por arraste, comprar sementes, plantar trigo/milho/cana, crescer, colher por arraste, exigir nova aragem, replantar e regar.
- Conferência visual em tela larga e no painel estreito do jogo.
- Teste interativo em `localhost:5173`, separado do salvamento de `127.0.0.1:5173`.
