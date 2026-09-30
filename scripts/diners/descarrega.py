#!/usr/bin/env python3
"""Descarrega les fonts de l'article «Diners» i les desa a data/raw/diners-*.csv.

Ús: python3 scripts/diners/descarrega.py   (cal `pip install xlrd` per al fitxer .xls del Ministeri)
Després: node scripts/diners/dades.mjs
"""
import csv, html, io, json, os, re, sys, urllib.request, zipfile, xml.etree.ElementTree as ET

RAW = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'raw')
UA = {'User-Agent': 'Mozilla/5.0 (terra-i-gent)'}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return r.read()

def text(url, enc='utf-8'):
    return get(url).decode(enc).lstrip('﻿')

def save(name, header, rows):
    with open(os.path.join(RAW, f'diners-{name}.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)
    print(f'diners-{name}.csv', len(rows), 'files')

num = lambda s: None if s in ('', '..', '""', None) else float(s.replace('.', '').replace(',', '.'))

# --- IPC (INE). Índex base 2025 des del 2002 i taxa anual des del 1961 (Espanya) i el 1978 (Catalunya).
def ine(table):
    return list(csv.reader(io.StringIO(text(f'https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{table}.csv')), delimiter=';'))
idx_es = {r[2]: num(r[3]) for r in ine(24077)[1:] if r[1] == 'Índice'}
var_es = {r[2]: num(r[3]) for r in ine(76134)[1:] if r[0] == 'Variación anual'}
idx_ct = {r[3]: num(r[4]) for r in ine(24078)[1:] if r[0].endswith('Cataluña') and r[2] == 'Índice'}
var_ct = {r[2]: num(r[3]) for r in ine(76140)[1:] if r[0].endswith('Cataluña') and r[1] == 'Variación anual'}
mes = sorted(set(var_es) | set(idx_es))
save('ipc', ['mes', 'index_espanya', 'taxa_anual_espanya', 'index_catalunya', 'taxa_anual_catalunya'],
     [[m, idx_es.get(m), var_es.get(m), idx_ct.get(m), var_ct.get(m)] for m in mes
      if any(v is not None for v in (idx_es.get(m), var_es.get(m), idx_ct.get(m), var_ct.get(m)))])

# --- IPC dels Estats Units, 1800-2025 (Federal Reserve Bank of Minneapolis, 1967 = 100).
t = text('https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1800-')
rows = []
for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', t, re.S):
    c = [html.unescape(re.sub('<[^>]+>', '', x)).strip() for x in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
    if c and re.fullmatch(r'\d{4}', c[0]): rows.append([c[0], c[1].replace(',', '')])
save('ipc-eua', ['any', 'ipc_1967_100'], rows)

# --- Or (Banc Mundial, Pink Sheet, $/unça troy, mitjana mensual).
page = text('https://www.worldbank.org/en/research/commodity-markets')
url = re.search(r'https://thedocs\.worldbank\.org[^"]*CMO-Historical-Data-Monthly\.xlsx', page).group(0)
z = zipfile.ZipFile(io.BytesIO(get(url)))
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ss = [''.join(t.text or '' for t in si.iter('{%s}t' % ns['m'])) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', ns)]
wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
sh = [s for s in wb.find('m:sheets', ns) if s.get('name') == 'Monthly Prices'][0]
tgt = rels[sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')].lstrip('/')
tgt = tgt if tgt.startswith('xl/') else 'xl/' + tgt
grid, gold_col = [], None
for r in ET.fromstring(z.read(tgt)).iter('{%s}row' % ns['m']):
    row = {}
    for c in r.findall('m:c', ns):
        v = c.find('m:v', ns)
        if v is None: continue
        row[re.match(r'[A-Z]+', c.get('r')).group(0)] = ss[int(v.text)] if c.get('t') == 's' else v.text
    grid.append(row)
    for k, v in row.items():
        if v == 'Gold': gold_col = k
save('or', ['mes', 'usd_unca'], [[r['A'], r[gold_col]] for r in grid if re.fullmatch(r'\d{4}M\d\d', r.get('A', '')) and r.get(gold_col) not in (None, '…')])

# --- Tipus de canvi dòlar/euro (BCE, mitjana mensual).
def ecb(key):
    rd = csv.DictReader(io.StringIO(text(f'https://data-api.ecb.europa.eu/service/data/{key}?format=csvdata&detail=dataonly')))
    return {r['TIME_PERIOD']: r['OBS_VALUE'] for r in rd}
e = ecb('EXR/M.USD.EUR.SP00.A')
save('eurusd', ['mes', 'usd_per_euro'], sorted(e.items()))

# --- Agregats monetaris de la zona euro (BCE, milions d'euros, saldos a final de mes).
agg = {k: ecb(f'BSI/M.U2.Y.V.{k}.X.1.U2.2300.Z01.E') for k in ('L10', 'M10', 'M20', 'M30')}
save('bce-agregats', ['mes', 'efectiu', 'M1', 'M2', 'M3'], [[m] + [agg[k].get(m) for k in ('L10', 'M10', 'M20', 'M30')] for m in sorted(agg['M30'])])

# --- Balanç de l'Eurosistema (BCE, actius totals setmanals, milions d'euros).
save('bce-balanc', ['setmana', 'actius'], sorted(ecb('ILM/W.U2.C.T000000.Z5.Z01').items()))

# --- Reserva Federal: balanç (WALCL, milions de $) i M2 (M2SL, milers de milions de $).
for sid, name in (('WALCL', 'fed-balanc'), ('M2SL', 'eua-m2')):
    rd = list(csv.reader(io.StringIO(text(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}'))))
    save(name, ['data', sid], rd[1:])

# --- Valor taxat de l'habitatge lliure (Ministeri d'Habitatge i Agenda Urbana, €/m², trimestral des del 1995).
import xlrd
b = xlrd.open_workbook(file_contents=get('https://apps.fomento.gob.es/BoletinOnline2/sedal/35101000.XLS'))
rows = []
for s in b.sheets():
    hdr, qs = s.row_values(11), s.row_values(13)
    byname = {str(s.cell_value(r, 1)).strip(): s.row_values(r) for r in range(s.nrows)}
    year = None
    for c in range(2, s.ncols):
        m = re.search(r'(\d{4})', str(hdr[c]))
        if m: year = int(m.group(1))
        q = str(qs[c]).strip()
        if not re.match(r'[1-4]', q) or year is None: continue
        v = [byname[k][c] for k in ('TOTAL NACIONAL', 'Cataluña', 'Barcelona')]
        if all(x not in ('', None) for x in v): rows.append([f'{year}T{q[0]}'] + [round(float(x), 1) for x in v])
save('habitatge', ['trimestre', 'espanya', 'catalunya', 'provincia_barcelona'], rows)

# --- Cost salarial total per treballador i mes (INE, Enquesta trimestral de cost laboral, des del 2000).
et = ine(59392)
sal = {}
for r in et[1:]:
    if r[1] == 'Coste salarial total por trabajador' and r[2] == 'Euros' and r[0] in ('Total Nacional', '09 Cataluña'):
        sal.setdefault(r[3], {})[r[0]] = num(r[4])
save('salaris', ['trimestre', 'espanya', 'catalunya'], [[k, v.get('Total Nacional'), v.get('09 Cataluña')] for k, v in sorted(sal.items()) if v.get('09 Cataluña')])

# --- Lloguer mitjà a Barcelona (Incasòl, fiances dipositades, anual des del 2007).
d = json.loads(text("https://analisi.transparenciacatalunya.cat/resource/qww9-bvhh.json?$where=codi_territorial='08019'&$limit=5000"))
save('lloguer-bcn', ['any', 'renda_mensual', 'contractes'],
     sorted([[r['any'], round(float(r['renda']), 2), r['habitatges']] for r in d if r['periode'] == 'gener-desembre']))

# --- Edat mitjana d'emancipació (Eurostat, yth_demo_030).
geo = 'ES+EU27_2020+DK+FI+SE+NL+DE+FR+IT+PT+EL+HR'
rd = csv.DictReader(io.StringIO(text(f'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/yth_demo_030/A.AVG.T.{geo}?format=SDMX-CSV')))
save('emancipacio', ['geo', 'any', 'edat'], sorted([[r['geo'], r['TIME_PERIOD'], r['OBS_VALUE']] for r in rd if r['OBS_VALUE']]))
