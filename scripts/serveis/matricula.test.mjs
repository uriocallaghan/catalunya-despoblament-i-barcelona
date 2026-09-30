import test from 'node:test';
import assert from 'node:assert/strict';
import { matriculaPerComarca } from './matricula.mjs';
const total = (overrides = {}) => ({ curs:'2024', tipus_d_estudi:'grau', tipus_d_universitat:'PÚBLICA', universitat:'Total', tipus_de_centre:'Total', nacionalitat:'Total', sexe:'Total', comarca_del_centre:'Barcelonès', matr_cula:'100', ...overrides });

test('no suma detall amb subtotals i conserva matrícula emparada pel secret estadístic', () => {
  const rows = [total(), total({universitat:'UB', sexe:'DONA', matr_cula:'60'}), total({universitat:'UB', sexe:'HOME', matr_cula:'*'}),
    total({tipus_d_universitat:'NO PRESENCIAL', matr_cula:'900'}), total({curs:'2023', matr_cula:'80'}),
    total({comarca_del_centre:'Fora de Catalunya', matr_cula:'3'})];
  assert.deepEqual(matriculaPerComarca(rows), {curs:'2024', comarques:{Barcelonès:100, 'Fora de Catalunya':3}});
});
test('suma estudis i tipus disjunts de la mateixa comarca', () => {
  const rows = [total(), total({tipus_d_estudi:'màster universitari', matr_cula:'20'}), total({tipus_d_universitat:'PRIVADA', matr_cula:'30'})];
  assert.equal(matriculaPerComarca(rows).comarques.Barcelonès, 150);
});
test('refusa duplicats o subtotals sense valor en lloc de publicar un total incomplet', () => {
  assert.throws(() => matriculaPerComarca([total(),total()]), /duplicat/);
  assert.throws(() => matriculaPerComarca([total({matr_cula:'*'})]), /numèrica/);
  assert.throws(() => matriculaPerComarca([]), /buida/);
});
