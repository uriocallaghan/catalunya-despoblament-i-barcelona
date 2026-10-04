# CLAUDE.md

Projecte: **Terra i gent**, web estàtica de visualització de dades sobre el desequilibri de població a Catalunya. Autor: Uri O'Callaghan. Idioma de la web i dels commits: català.

## Desplegament
- Allotjament: Netlify (no GitHub Pages), desplegament continu des de la branca `main` del repositori `uriocallaghan/catalunya-despoblament-i-barcelona`, carpeta arrel (`/`). Configuració a `netlify.toml`.
- Domini: `catalunya.uriocallaghan.com`, configurat com a domini personalitzat al projecte de Netlify. Cal un registre DNS `CNAME catalunya -> <projecte>.netlify.app` al proveïdor DNS de uriocallaghan.com.
- No afegir pas de build.
- GitHub (`main`) és la font de veritat: publicar només fent push a `main`. No desplegar mai amb `netlify deploy` ni pujant fitxers a mà. Fer `git pull` abans de començar a editar, i commit i push en acabar.

## Codi
- `assets/app.js` carrega `data/catalunya.json` amb `fetch` i dibuixa totes les seccions amb D3 v7 (vendoritzat a `assets/vendor/`).
- Maquetació centrada. Els elements vermells apareixen en entrar a la pantalla (`onView` a app.js, classe `.rv` al CSS). El ressaltat en passar per sobre s'esborra en sortir del gràfic o en tocar fora (`hoverable`). Scroll suau amb Lenis (vendoritzat).
- Cartograma continu: `scripts/cartograma.mjs` (difusió de Gastner-Newman, malla 512, projecció azimutal d'àrea igual), un per any (1857–2025) calculats en paral·lel (`cartograma-worker.mjs`) i desats a `data/cartograma.json`, que app.js carrega a part. Població històrica per municipi: `data/raw/poblacio-municipis-1717-1991.csv` (Idescat, censos) i `data/raw/padro-municipis-<any>.csv` (padró; afegir-ne un altre any és posar-hi el fitxer i l'any a `YRS` de build-data.mjs), casada amb els municipis actuals a `scripts/historic.mjs`. `npm run build:data` triga uns 45 minuts (27 anys). Al web, el control avança any a any i interpola entre anys amb dades.
- Serveis (secció 14 d'app.js, `data/serveis.json`): `node scripts/serveis/dades.mjs` el regenera a partir de `data/raw/serveis-*.csv`. Per actualitzar les fonts (Dades obertes de Catalunya, GTFS, OSM, uns 80 MB que no es desen): `scripts/serveis/descarrega.sh`, `analitza.mjs`, `temps-hospital.mjs` (OSRM, uns 5 min) i `dades.mjs`, tots amb `SERVEIS=<carpeta temporal>`. Les dades d'atenció primària (CAP) i d'OSM (bancs, supermercats) són incompletes: no publicar-les.
- Subpàgina «Diners de paper» (`diners/index.html`, `assets/diners.js`, `assets/diners.css`, que s'afegeix a `style.css`): inflació, creació de diners, or i habitatge. Carrega `data/diners.json`, generat per `node scripts/diners/dades.mjs` a partir de `data/raw/diners-*.csv`. Per actualitzar les fonts (INE, BCE, FRED, Banc Mundial, Ministeri d'Habitatge, Incasòl, Eurostat): `python3 scripts/diners/descarrega.py` (cal `pip install xlrd`). Els textos es calculen a partir de les dades: no escriure xifres a mà a l'HTML.
- Subpàgines «Mesurat en or» (`or/index.html`, `assets/or.js`) i «La casa» (`habitatge/index.html`, `assets/habitatge.js`): també llegeixen `data/diners.json` i comparteixen utilitats a `assets/comu.js`. «Deu anys» (`estrategia/index.html`, `assets/estrategia.js`) s'adapta als ingressos nets que escriu el lector i hi combina les dades amb models de joc (entrada d'un pis, palanques, clients necessaris, vides simulades); els supòsits s'expliquen a les notes. Els preus legals de l'or abans del 1960 són a `goldPar` de `scripts/diners/dades.mjs`.
- Subpàgina «El nus» (`nus/index.html`, `assets/nus.js`, estils a `diners.css`): causes de l'encariment de l'habitatge. Llegeix `data/diners.json`, `data/catalunya.json` i `data/nus.json` (població municipal 1998–2025, generada per `node scripts/nus/dades.mjs` a partir de `data/cartograma.json`; cal tornar-lo a executar després de `npm run build:data`). Tots els textos es calculen a partir de les dades. Els fils sense dades oficials a la web (construcció, parc social, pisos turístics, llars) només surten com a nodes puntejats al diagrama: no afegir-hi xifres sense font descarregada.
- Menú superior: `assets/menu.js`, carregat just després de `<body>` a totes les pàgines; hi ha la llista d'articles (`ART`) i les icones. Per a una pàgina nova, afegir-la a `ART` i carregar-hi el script. Estils a la secció «Menú superior» de `style.css`.
- Vores dels municipis: `paint()` a app.js posa la variable CSS `--edge` (més fosca en colors molt clars). Usa-la sempre per pintar municipis.
- `data/raw/hipsometria.csv` (superfície per franges de 100 m) es genera amb `npm run build:hipso`, que descarrega el Copernicus DEM GLO-90 en una carpeta temporal i l'esborra.
- Colors a `:root` de `assets/style.css`: fons #F1F1EE, escala de vermells `--r0`…`--r7`, accent `--red` #E4401C. Només mode clar.
- Tipografia: Geist (Google Fonts), tracking negatiu.
- `data/catalunya.json` és generat: no editar a mà. Modificar `data/raw/` o `scripts/build-data.mjs` i executar `npm run build:data`.
- Xifres oficials verificades: 947 municipis, 8.124.126 habitants, 32.108 km² (Cens 2025, Idescat). Si canvies dades, comprova que els totals comarcals quadren.

## Provar
`npm run serve` i obrir http://localhost:4173. Revisar en mòbil (≈390 px) i escriptori.
