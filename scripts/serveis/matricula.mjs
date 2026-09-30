// El recurs 5kd9-2wex barreja detall i subtotals. Sumar-los plegats duplica la matrícula.
// Es pren una sola capa: subtotal per estudi, tipus d'universitat i comarca.
export function matriculaPerComarca(rows) {
  if (!rows.length) throw new Error('font universitària buida');
  const curs = rows.reduce((last, r) => r.curs > last ? r.curs : last, '');
  const estudis = new Set(['grau', 'màster universitari', 'doctorat']);
  const tipus = new Set(['PÚBLICA', 'PRIVADA']);
  const totals = rows.filter(r => r.curs === curs && estudis.has(r.tipus_d_estudi) && tipus.has(r.tipus_d_universitat)
    && ['universitat', 'tipus_de_centre', 'nacionalitat', 'sexe'].every(k => r[k] === 'Total'));
  if (!totals.length) throw new Error('font universitària sense subtotals comparables');
  const seen = new Set(), comarques = {};
  for (const r of totals) {
    const key = JSON.stringify([r.tipus_d_estudi, r.tipus_d_universitat, r.comarca_del_centre]);
    if (seen.has(key)) throw new Error('subtotal universitari duplicat: ' + key);
    if (!/^\d+$/.test(r.matr_cula)) throw new Error('subtotal universitari sense matrícula numèrica: ' + key);
    seen.add(key);
    comarques[r.comarca_del_centre] = (comarques[r.comarca_del_centre] || 0) + +r.matr_cula;
  }
  return { curs, comarques };
}
