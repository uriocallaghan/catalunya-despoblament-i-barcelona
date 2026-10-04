# Terra i gent

**On vivim a Catalunya.** Mapes i gràfics interactius sobre el desequilibri territorial i el despoblament, amb els 947 municipis i les 42 comarques i Aran.

🔗 https://catalunya.uriocallaghan.com

Barcelona té tants habitants com els 843 municipis més petits de Catalunya junts, que ocupen el 90% del territori. La meitat de la població viu en municipis que ocupen l’1,6% del territori.

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
scripts/historic.mjs       població municipal 1857–1991 i imputacions sobre els termes actuals
scripts/serveis/           descàrrega i anàlisi de serveis (escoles, farmàcies, hospitals, tren…)
data/serveis.json          serveis per municipi, temps a urgències i alumnat (generat)
scripts/hipsometria.mjs    superfície per franges d’altitud des del Copernicus DEM
diners/index.html          subpàgina «Diners de paper» (inflació, diners, or i habitatge)
assets/diners.js           gràfics de la subpàgina
data/diners.json           sèries de preus, diners, or, sous i habitatge (generat)
scripts/diners/            descàrrega de fonts i generació de data/diners.json
or/, habitatge/, estrategia/ subpàgines «Mesurat en or», «La casa» i «Deu anys» (llegeixen data/diners.json)
nus/index.html             subpàgina «El nus»: tots els fils que han encarit l’habitatge
assets/nus.js              gràfics de «El nus» (data/diners.json, data/catalunya.json i data/nus.json)
data/nus.json              població municipal 1998–2025 per a «El nus» (generat per scripts/nus/dades.mjs)
assets/menu.js             menú superior comú a totes les pàgines (llista d’articles)
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

L’script creua `data/raw/municipis-cens-2025.csv` amb els límits municipals d’es-atlas (IGN), calcula el mapa de punts (aproximadament 500 persones per punt) i el cartograma continu, i escriu `data/catalunya.json`. Els cartogrames (27 anys amb dades, de 1857 a 2025) triguen uns 45 minuts.

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

## El nus

```bash
node scripts/nus/dades.mjs   # regenera data/nus.json a partir de data/cartograma.json (després de npm run build:data)
```

La resta de dades de la pàgina surten de `data/diners.json`. Els fils sense dades a la web (construcció d’habitatge nou, parc social, pisos turístics, mida de les llars) apareixen al diagrama com a puntejats fins que s’hi afegeixin fonts oficials.

## Fonts

- Idescat, *Altitud, superfície i població. Municipis*, 2025 (Cens de població anual).
- Idescat, *Densitat de població* i *Nombre de municipis i població*, comarques, 2025.
- Idescat, *Sèries històriques demogràfiques. Evolució de la població de fet*, comarques i municipis, 1857–1991.
- Idescat, *Padró municipal d’habitants. Població a 1 de gener*, municipis, 1998, 2001, 2006, 2011, 2016 i 2021.
- Idescat, *Estadística del grau d’urbanització 2025* (quadrícula d’1 km²).
- Límits municipals: Instituto Geográfico Nacional, via [es-atlas](https://github.com/martgnz/es-atlas).
- Altituds: Copernicus DEM GLO-90 (ESA).
- Serveis: Dades obertes de Catalunya (centres docents, equipaments, establiments sanitaris, equipaments culturals, instal·lacions esportives, alumnat universitari), GTFS de Renfe i FGC, límits de l'ICGC. Temps en cotxe amb OSRM (OpenStreetMap).
- Cartograma: Gastner i Newman, *Diffusion-based method for producing density-equalizing maps*, PNAS 101 (2004).

## Precisió dels indicadors

Les dades originals i els models es distingeixen a les notes de cada gràfic. El cartograma imputa buits històrics per superfície dins de grups documentats o inferits; no reconstrueix exactament totes les genealogies municipals. L’error d’àrea es mesura sobre les geometries finals. Els temps OSRM són indicadors municipals per a dispositius amb menció d’urgències 24 h, incloent CUAP i urgències especialitzades; no són temps individuals. La matrícula universitària suma només subtotals i el gràfic exclou els centres fora de Catalunya.

Proves de regressió de la imputació històrica i del recompte universitari:

```bash
node --test scripts/historic.test.mjs scripts/serveis/matricula.test.mjs
```

Si només canvien les marques d’imputació, `node scripts/build-data.mjs --metadata-only` les actualitza sense recalcular les formes. Rebutja l’operació si difereix qualsevol any o població; en aquest cas cal executar el procés complet.
