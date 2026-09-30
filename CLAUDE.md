# CLAUDE.md

Projecte: **Terra i gent**, web estàtica de visualització de dades sobre el desequilibri de població a Catalunya. Autor: Uri O'Callaghan. Idioma de la web i dels commits: català.

## Desplegament
- Allotjament: Netlify (no GitHub Pages), desplegament continu des de la branca `main` del repositori `uriocallaghan/catalunya-despoblament-i-barcelona`, carpeta arrel (`/`). Configuració a `netlify.toml`.
- Domini: `catalunya.uriocallaghan.com`, configurat com a domini personalitzat al projecte de Netlify. Cal un registre DNS `CNAME catalunya -> <projecte>.netlify.app` al proveïdor DNS de uriocallaghan.com.
- No afegir pas de build.

## Codi
- `assets/app.js` carrega `data/catalunya.json` amb `fetch` i dibuixa totes les seccions amb D3 v7 (vendoritzat a `assets/vendor/`).
- Colors a `:root` de `assets/style.css`: fons #F1F1EE, escala de vermells `--r0`…`--r7`, accent `--red` #E4401C. Només mode clar.
- Tipografia: Geist (Google Fonts), tracking negatiu.
- `data/catalunya.json` és generat: no editar a mà. Modificar `data/raw/` o `scripts/build-data.mjs` i executar `npm run build:data`.
- Xifres oficials verificades: 947 municipis, 8.124.126 habitants, 32.108 km² (Cens 2025, Idescat). Si canvies dades, comprova que els totals comarcals quadren.

## Provar
`npm run serve` i obrir http://localhost:4173. Revisar en mòbil (≈390 px) i escriptori.
