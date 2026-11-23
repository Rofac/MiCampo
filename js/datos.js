/* Mi Campo · datos guardados en el celular (IndexedDB) y cuentas.
   movs: gastos (G) e ingresos (I) · hac: movimientos de hacienda · san: vacunas y tratamientos · peo: peones · cfg: configuración */
(function (raiz) {
  const CATS_G = [
    // las que pidió (primero)
    ['animales', '🐄', 'Compra de animales'], ['gasoil', '⛽', 'Gasoil y nafta'], ['vacunas', '💉', 'Vacunas'], ['semillas', '🌱', 'Semillas'],
    ['forraje', '🌾', 'Forraje, rollos y alimento'], ['desmonte', '🚜', 'Desmonte y limpieza'], ['veneno', '🧪', 'Veneno y agroquímicos'],
    ['peones', '👷', 'Peones y sueldos'], ['veterinaria', '🩺', 'Veterinaria y remedios'],
    // las que se suelen olvidar
    ['sal', '🧂', 'Sal y minerales'], ['alambrado', '🔨', 'Alambrado y mejoras'], ['aguadas', '💧', 'Aguadas (molino, bomba, tanque)'],
    ['maquinaria', '🔧', 'Maquinaria y reparaciones'], ['contratistas', '🤝', 'Contratistas (siembra, cosecha, fumigación)'],
    ['fertilizantes', '🌿', 'Fertilizantes'], ['flete', '🚚', 'Fletes'], ['comisiones', '💼', 'Comisiones (consignataria, remate)'],
    ['impuestos', '🏛️', 'Impuestos, guías y SENASA'], ['arriendo', '📄', 'Alquiler del campo'], ['luz', '💡', 'Luz, teléfono e internet'],
    ['seguros', '🛡️', 'Seguros'], ['proveeduria', '🛒', 'Mercadería y provisiones'], ['otros_g', '📦', 'Otros gastos']];
  const CATS_I = [['venta_hac', '🐂', 'Venta de hacienda'], ['venta_granos', '🌽', 'Venta de granos'], ['venta_rollos', '🌾', 'Venta de rollos y fardos'],
    ['lena', '🔥', 'Leña y carbón'], ['pastaje', '🐮', 'Pastaje (animales de otros)'], ['otros_i', '💵', 'Otros ingresos']];
  const HACIENDA = ['vacas', 'vaquillonas', 'toros', 'novillos', 'novillitos', 'terneros', 'terneras'];
  const HAC_TXT = { vacas: 'Vacas', vaquillonas: 'Vaquillonas', toros: 'Toros', novillos: 'Novillos', novillitos: 'Novillitos', terneros: 'Terneros', terneras: 'Terneras' };
  const HAC_MOV = { INICIAL: 'Conteo inicial', NAC: 'Nacimientos', COMPRA: 'Compra', VENTA: 'Venta', MUERTE: 'Muerte', CAMBIO: 'Pasó de categoría', AJUSTE: 'Recuento (ajuste)', CONSUMO: 'Consumo propio' };
  const VACUNAS = ['Aftosa', 'Brucelosis', 'Carbunclo', 'Mancha y gangrena', 'Antiparasitario', 'Garrapaticida', 'Vitaminas', 'Otra'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const CFG0 = () => ({ id: 'cfg', nombre: '', ha: '', campIni: 7, lotes: [], extraG: [], extraI: [], ocultas: [] });

  // ------------------------------------------------------------------ fechas
  const pad = n => String(n).padStart(2, '0');
  const hoyISO = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return hoyISO(d); };
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  /* campaña: del mes campIni de un año al anterior del año siguiente (julio 2025 → junio 2026 = "25/26") */
  function campania(iso, campIni) {
    const y = +iso.slice(0, 4), m = +iso.slice(5, 7), ini = campIni || 7;
    const y0 = ini === 1 ? y : (m >= ini ? y : y - 1);
    const desde = y0 + '-' + pad(ini) + '-01';
    const fin = new Date(y0 + 1, ini - 1, 0);            // último día del mes anterior, un año después
    const hasta = ini === 1 ? y0 + '-12-31' : hoyISO(fin);
    return { desde, hasta, nombre: ini === 1 ? String(y0) : String(y0).slice(2) + '/' + String(y0 + 1).slice(2), y0 };
  }
  function mesesDe(desde, hasta) {
    const out = []; let y = +desde.slice(0, 4), m = +desde.slice(5, 7);
    while ((y + '-' + pad(m)) <= hasta.slice(0, 7)) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } }
    return out;
  }

  // ------------------------------------------------------------------ cuentas
  function resumen(movs, desde, hasta) {
    const r = { ing: 0, gas: 0, porCat: {}, porMes: {}, porLote: {}, n: 0 };
    for (const m of movs) {
      if (m.fecha < desde || m.fecha > hasta) continue;
      const v = +m.monto || 0; r.n++;
      const mes = m.fecha.slice(0, 7);
      const pm = r.porMes[mes] || (r.porMes[mes] = { ing: 0, gas: 0 });
      if (m.tipo === 'I') { r.ing += v; pm.ing += v; } else { r.gas += v; pm.gas += v; }
      const k = m.tipo + ':' + m.cat; r.porCat[k] = (r.porCat[k] || 0) + v;
      if (m.lote) { const pl = r.porLote[m.lote] || (r.porLote[m.lote] = { ing: 0, gas: 0 }); if (m.tipo === 'I') pl.ing += v; else pl.gas += v; }
    }
    r.ing = red(r.ing); r.gas = red(r.gas); r.res = red(r.ing - r.gas);
    return r;
  }
  const red = x => Math.round(x * 100) / 100;

  /* cabezas por categoría (todo lo cargado hasta la fecha) */
  function existencias(hac, hasta) {
    const e = {}; HACIENDA.forEach(c => e[c] = 0);
    for (const h of hac) {
      if (hasta && h.fecha > hasta) continue;
      const n = +h.cant || 0;
      if (!(h.cat in e)) e[h.cat] = 0;
      if (h.tipo === 'INICIAL' || h.tipo === 'NAC' || h.tipo === 'COMPRA') e[h.cat] += n;
      else if (h.tipo === 'VENTA' || h.tipo === 'MUERTE' || h.tipo === 'CONSUMO') e[h.cat] -= n;
      else if (h.tipo === 'CAMBIO') { e[h.cat] -= n; if (!(h.cat2 in e)) e[h.cat2] = 0; e[h.cat2] += n; }
      else if (h.tipo === 'AJUSTE') e[h.cat] += n;      // el ajuste guarda la diferencia (+ o −)
    }
    e.total = Object.entries(e).reduce((s, [k, v]) => s + (k === 'total' ? 0 : v), 0);
    return e;
  }

  /* lo que falta pagar / cobrar */
  function pendientes(movs, hoy) {
    return movs.filter(m => m.pendiente).map(m => ({ ...m, dias: m.vence ? diasEntre(hoy, m.vence) : null }))
      .sort((a, b) => (a.vence || '9999') < (b.vence || '9999') ? -1 : 1);
  }
  function proximasVacunas(san, hoy, dentro) {
    // por producto, la última aplicación con "próxima" pendiente
    const ult = {};
    for (const s of san) { const k = (s.producto || '') + '|' + (s.cat || ''); if (!ult[k] || s.fecha > ult[k].fecha) ult[k] = s; }
    return Object.values(ult).filter(s => s.proxima && diasEntre(hoy, s.proxima) <= dentro).map(s => ({ ...s, dias: diasEntre(hoy, s.proxima) }))
      .sort((a, b) => a.proxima < b.proxima ? -1 : 1);
  }
  function pagadoPeon(movs, peonId, desde, hasta) {
    return red(movs.filter(m => m.peon === peonId && m.fecha >= desde && m.fecha <= hasta).reduce((s, m) => s + (+m.monto || 0), 0));
  }

  // ------------------------------------------------------------------ guardado (IndexedDB, todo en memoria mientras la app está abierta)
  const TABLAS = ['movs', 'hac', 'san', 'peo', 'ani', 'cfg'];
  const LISTAS = ['movs', 'hac', 'san', 'peo', 'ani'];
  const D = { movs: [], hac: [], san: [], peo: [], ani: [], cfg: CFG0() };
  let base = null;
  function abrir(nombre) {
    return new Promise((ok, mal) => {
      const r = indexedDB.open(nombre || 'rofac_campo', 2);       // v2: animales con caravana
      r.onupgradeneeded = () => TABLAS.forEach(t => { if (!r.result.objectStoreNames.contains(t)) r.result.createObjectStore(t, { keyPath: 'id' }); });
      r.onsuccess = () => { base = r.result; ok(); }; r.onerror = () => mal(r.error);
    });
  }
  const todo = t => new Promise((ok, mal) => { const q = base.transaction(t).objectStore(t).getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error); });
  async function cargar(nombre) {
    await abrir(nombre);
    for (const t of LISTAS) D[t] = await todo(t);
    const c = (await todo('cfg'))[0]; D.cfg = Object.assign(CFG0(), c || {});
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    return D;
  }
  const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function guardar(t, obj) {
    if (t !== 'cfg' && !obj.id) { obj.id = nuevoId(); obj.creado = new Date().toISOString(); }
    if (t === 'cfg') D.cfg = obj; else { const i = D[t].findIndex(x => x.id === obj.id); if (i >= 0) D[t][i] = obj; else D[t].push(obj); }
    return new Promise((ok, mal) => { const tx = base.transaction(t, 'readwrite'); tx.objectStore(t).put(obj); tx.oncomplete = () => ok(obj); tx.onerror = () => mal(tx.error); });
  }
  function borrar(t, id) {
    D[t] = D[t].filter(x => x.id !== id);
    return new Promise((ok, mal) => { const tx = base.transaction(t, 'readwrite'); tx.objectStore(t).delete(id); tx.oncomplete = () => ok(); tx.onerror = () => mal(tx.error); });
  }
  function copia() { return { app: 'MiCampo', version: 2, fecha: new Date().toISOString(), movs: D.movs, hac: D.hac, san: D.san, peo: D.peo, ani: D.ani, cfg: D.cfg }; }
  async function restaurar(j) {
    if (!j || j.app !== 'MiCampo' || !Array.isArray(j.movs)) throw new Error('Ese archivo no es una copia de Mi Campo');
    const tx = base.transaction(TABLAS, 'readwrite');
    TABLAS.forEach(t => tx.objectStore(t).clear());
    LISTAS.forEach(t => (j[t] || []).forEach(x => tx.objectStore(t).put(x)));
    tx.objectStore('cfg').put(Object.assign(CFG0(), j.cfg || {}, { id: 'cfg' }));
    await new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); });
    LISTAS.forEach(t => D[t] = j[t] || []); D.cfg = Object.assign(CFG0(), j.cfg || {});
  }

  function cats(tipo) {
    const base = tipo === 'I' ? CATS_I : CATS_G, extra = (tipo === 'I' ? D.cfg.extraI : D.cfg.extraG) || [];
    return base.map(([id, ic, txt]) => ({ id, ic, txt })).concat(extra.map(x => ({ id: x.id, ic: x.ic || '🏷️', txt: x.txt, propia: true })))
      .filter(c => !(D.cfg.ocultas || []).includes(c.id));
  }
  function cat(tipo, id) {
    const todas = (tipo === 'I' ? CATS_I : CATS_G).map(([i, ic, txt]) => ({ id: i, ic, txt })).concat(((tipo === 'I' ? D.cfg.extraI : D.cfg.extraG) || []).map(x => ({ id: x.id, ic: x.ic || '🏷️', txt: x.txt })));
    return todas.find(c => c.id === id) || { id, ic: '🏷️', txt: id || 'Sin categoría' };
  }

  /* caravanas: sólo números y letras; se busca por el final ("1234" encuentra "032000001234") o por cualquier parte */
  const normCar = s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  function buscarAnimal(ani, q) {
    const k = normCar(q); if (!k) return [];
    const exactos = ani.filter(a => normCar(a.caravana) === k);
    if (exactos.length) return exactos;
    const fin = ani.filter(a => normCar(a.caravana).endsWith(k));
    return fin.length ? fin : ani.filter(a => normCar(a.caravana).includes(k) || (a.apodo && a.apodo.toUpperCase().includes(String(q).toUpperCase().trim())));
  }
  /* pesadas → último peso y aumento diario entre las dos últimas */
  function pesos(a) {
    const p = (a.ev || []).filter(e => e.tipo === 'PESO' && e.kg > 0).sort((x, y) => x.fecha < y.fecha ? -1 : 1);
    const u = p[p.length - 1], ant = p[p.length - 2];
    const adpv = u && ant && diasEntre(ant.fecha, u.fecha) > 0 ? Math.round((u.kg - ant.kg) / diasEntre(ant.fecha, u.fecha) * 1000) / 1000 : null;
    return { lista: p, ultimo: u || null, adpv };
  }
  function edad(nac, hoy) {
    if (!nac) return ''; const m = Math.floor(diasEntre(nac, hoy) / 30.44);
    return m < 0 ? '' : m < 24 ? m + (m === 1 ? ' mes' : ' meses') : Math.floor(m / 12) + ' años' + (m % 12 ? ' y ' + (m % 12) + ' m' : '');
  }

  const api = { D, normCar, buscarAnimal, pesos, edad, CATS_G, CATS_I, HACIENDA, HAC_TXT, HAC_MOV, VACUNAS, MESES, MES3, CFG0, hoyISO, sumarDias, diasEntre, campania, mesesDe, resumen, existencias,
    pendientes, proximasVacunas, pagadoPeon, cargar, guardar, borrar, copia, restaurar, cats, cat, nuevoId, red };
  if (typeof module !== 'undefined') module.exports = api; else raiz.Datos = api;
})(typeof window !== 'undefined' ? window : globalThis);
