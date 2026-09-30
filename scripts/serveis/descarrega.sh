#!/bin/sh
# Descarrega les fonts de serveis a una carpeta temporal (uns 80 MB; no es desen al repositori).
# Ús: SERVEIS=$(mktemp -d) sh scripts/serveis/descarrega.sh && SERVEIS=... node scripts/serveis/analitza.mjs
#     && SERVEIS=... node scripts/serveis/temps-hospital.mjs && SERVEIS=... node scripts/serveis/dades.mjs
set -e; cd "$SERVEIS"; B=https://analisi.transparenciacatalunya.cat/resource
curl -s -o equipaments.json            "$B/8gmd-gz7i.json?\$limit=50000"
curl -s -o centres_docents.json        "$B/kvmv-ahh4.json?\$limit=50000&\$where=curs='2025/2026'"
curl -s -o establiments_sanitaris.json "$B/nrmq-ytje.json?\$limit=50000"
curl -s -o equipaments_culturals.json  "$B/48s6-82h2.json?\$limit=50000"
curl -s -o ceec_installacions.json     "$B/5zd6-bk6r.json?\$limit=50000"
curl -s -o univ_alumnat.json           "$B/5kd9-2wex.json?\$limit=50000"
curl -s -o icgc-municipis-50000.json   "https://datacloud.icgc.cat/datacloud/divisions-administratives/json_unzip/divisions-administratives-v2r2-municipis-50000-20260120.json"
mkdir -p gtfs && cd gtfs
curl -sL -o renfe_cer.zip    https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip
curl -sL -o renfe_avldmd.zip https://ssl.renfe.com/gtransit/Fichero_AV_LD/google_transit.zip
curl -sL -o fgc.zip          https://www.fgc.cat/google/google_transit.zip
for z in renfe_cer renfe_avldmd fgc; do mkdir -p $z; unzip -oq $z.zip -d $z; done; cd ..
Q='[out:json][timeout:180];area["ISO3166-2"="ES-CT"]["admin_level"="4"]->.a;(nwr["amenity"~"^(bank|atm|cinema|theatre|pharmacy|post_office)$"](area.a);nwr["shop"="supermarket"](area.a););out center tags;'
curl -s -A "terra-i-gent" -o osm_serveis.json --data-urlencode "data=$Q" https://overpass.kumi.systems/api/interpreter
