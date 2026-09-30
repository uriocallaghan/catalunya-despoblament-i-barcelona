# Terra i gent

**On vivim a Catalunya.** Mapes i gràfics interactius sobre el desequilibri territorial i el despoblament, amb els 947 municipis i les 43 comarques.

🔗 https://catalunya.uriocallaghan.com

Barcelona té tants habitants com els 843 municipis més petits de Catalunya junts, que ocupen el 90% del territori. La meitat de la població viu en l’1,6% del sòl.

## Estructura

```
index.html                 pàgina
assets/style.css           estils
assets/app.js              tota la lògica dels gràfics (D3)
assets/vendor/             d3 7.8.5 i topojson-client 3.1.0 (sense CDN)
data/catalunya.json        dades i geometria ja processades (les carrega app.js)
data/raw/                  dades municipals oficials en CSV
scripts/build-data.mjs     regenera data/catalunya.json
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

L’script creua `data/raw/municipis-cens-2025.csv` amb els límits municipals d’es-atlas (IGN), calcula el mapa de bombolles i el mapa de punts (1 punt = 500 persones) i escriu `data/catalunya.json`.

## Fonts

- Idescat, *Altitud, superfície i població. Municipis*, 2025 (Cens de població anual).
- Idescat, *Densitat de població* i *Nombre de municipis i població*, comarques, 2025.
- Idescat, *Sèries històriques demogràfiques. Evolució de la població de fet*, 1857–1991.
- Idescat, *Estadística del grau d’urbanització 2025* (quadrícula d’1 km²).
- Límits municipals: Instituto Geográfico Nacional, via [es-atlas](https://github.com/martgnz/es-atlas).
