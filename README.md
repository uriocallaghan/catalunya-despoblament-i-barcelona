# Terra i gent

**On vivim a Catalunya.** Mapes i gràfics interactius sobre el desequilibri territorial i el despoblament, amb els 947 municipis i les 43 comarques.

🔗 https://catalunya.uriocallaghan.com

Barcelona té tants habitants com els 843 municipis més petits de Catalunya junts, que ocupen el 90% del territori. La meitat de la població viu en l’1,6% del sòl.

## Estructura

```
index.html                 pàgina
assets/style.css           estils
assets/app.js              tota la lògica dels gràfics (D3)
assets/vendor/             d3 7.8.5, topojson-client 3.1.0 i lenis 1.3.26 (sense CDN)
data/catalunya.json        dades i geometria ja processades (les carrega app.js)
data/cartograma.json       cartogrames 1857–2025 (generat)
data/raw/                  dades municipals oficials en CSV
scripts/build-data.mjs     regenera data/catalunya.json
scripts/cartograma.mjs     cartograma continu per difusió (Gastner i Newman, 2004)
scripts/historic.mjs       població municipal 1857–1991 sobre els municipis actuals
scripts/serveis/           descàrrega i anàlisi de serveis (escoles, farmàcies, hospitals, tren…)
data/serveis.json          serveis per municipi, temps a urgències i alumnat (generat)
scripts/hipsometria.mjs    superfície per franges d’altitud des del Copernicus DEM
diners/index.html          subpàgina «Diners de paper» (inflació, diners, or i habitatge)
assets/diners.js           gràfics de la subpàgina
data/diners.json           sèries de preus, diners, or, sous i habitatge (generat)
scripts/diners/            descàrrega de fonts i generació de data/diners.json
netlify.toml               configuració de desplegament a Netlify
```

Web estàtica, sense framework ni pas de compilació. Per provar-la en local:

```bash
npm run serve        # o bé: python3 -m http.server
```

Cal servir-la per HTTP: obrir `index.html` directament amb `file://` no carrega les dades.

## Regenerar les dades

```bash
npm install
npm run build:data
```

L’script creua `data/raw/municipis-cens-2025.csv` amb els límits municipals d’es-atlas (IGN), calcula el mapa de punts (1 punt = 500 persones) i el cartograma continu, i escriu `data/catalunya.json`. Els cartogrames (17 anys, de 1857 a 2025) triguen uns 25 minuts.

La distribució del territori per altitud (`data/raw/hipsometria.csv`) es genera a part, perquè descarrega el model d’elevacions (unes 10 rajoles GeoTIFF) a una carpeta temporal que s’esborra en acabar:

```bash
npm run build:hipso
```

## Serveis

```bash
node scripts/serveis/dades.mjs      # regenera data/serveis.json des de data/raw/serveis-*.csv
```

Per actualitzar les fonts, vegeu `scripts/serveis/descarrega.sh`.

## Diners de paper

```bash
python3 scripts/diners/descarrega.py   # descarrega les fonts a data/raw/diners-*.csv (cal: pip install xlrd)
node scripts/diners/dades.mjs          # regenera data/diners.json i mostra les xifres clau
```

Fonts: INE (IPC des del 1961 i Enquesta trimestral de cost laboral), BCE (M3, efectiu, balanç de l'Eurosistema i canvi dòlar/euro), FRED (balanç de la Reserva Federal i M2), Banc de la Reserva Federal de Minneapolis (IPC dels EUA des del 1800), Banc Mundial (preu de l'or), Ministeri d'Habitatge (valor taxat de l'habitatge), Incasòl (lloguer a Barcelona) i Eurostat (edat d'emancipació).

## Fonts

- Idescat, *Altitud, superfície i població. Municipis*, 2025 (Cens de població anual).
- Idescat, *Densitat de població* i *Nombre de municipis i població*, comarques, 2025.
- Idescat, *Sèries històriques demogràfiques. Evolució de la població de fet*, comarques i municipis, 1857–1991.
- Idescat, *Padró municipal d’habitants. Població a 1 de gener*, municipis, 2001, 2011 i 2021.
- Idescat, *Estadística del grau d’urbanització 2025* (quadrícula d’1 km²).
- Límits municipals: Instituto Geográfico Nacional, via [es-atlas](https://github.com/martgnz/es-atlas).
- Altituds: Copernicus DEM GLO-90 (ESA).
- Serveis: Dades obertes de Catalunya (centres docents, equipaments, establiments sanitaris, equipaments culturals, instal·lacions esportives, alumnat universitari), GTFS de Renfe i FGC, límits de l'ICGC. Temps en cotxe amb OSRM (OpenStreetMap).
- Cartograma: Gastner i Newman, *Diffusion-based method for producing density-equalizing maps*, PNAS 101 (2004).
