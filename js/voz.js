/* Mi Campo · entender lo que se dice o escribe: "pagué 300 mil de gasoil", "vendí 20 terneros por 12 millones".
   Devuelve { tipo: 'G'|'I', cat, monto, cabezas, hac, cant, unidad, detalle, peon } con lo que pudo entender. */
(function (raiz) {
  const sinTilde = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const UNID = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
    catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
    veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
    setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
    cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800,
    ochocientas: 800, novecientos: 900, novecientas: 900 };

  /* "1.500.000" · "1,5" · "300" → número (en plata el punto es de miles) */
  function numeroTxt(t) {
    t = t.replace(/\$/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
    if (/^\d{1,3}(,\d{3})+$/.test(t)) return parseFloat(t.replace(/,/g, ''));          // 300,000 (dictado en inglés)
    if (/^\d+,\d+$/.test(t)) return parseFloat(t.replace(',', '.'));
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    return NaN;
  }

  /* Junta las palabras en números: "2 millones 400 mil" → 2400000 · "trescientos mil" → 300000 · "1 millón y medio" → 1500000.
     Devuelve la lista de partes: números {n, desde, hasta} y palabras. */
  function tokens(texto) {
    const pal = sinTilde(texto).replace(/(\d)\s*(k|lucas?)\b/g, '$1 mil').replace(/,\s+|;|\s+-\s+/g, ' | ').replace(/[¿?¡!;:()"]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
      .map(w => w.replace(/^[.,]+|[.,]+$/g, '')).filter(Boolean);
    const out = [];
    let i = 0;
    while (i < pal.length) {
      let total = 0, actual = 0, hay = false, j = i, millon = false;
      while (j < pal.length) {
        const w = pal[j];
        const n = numeroTxt(w);
        if (!isNaN(n)) { if (hay && actual && !/^(mil|millon|millones)$/.test(pal[j - 1] || '')) break; actual += n; hay = true; j++; continue; }
        if (w in UNID) { actual += UNID[w]; hay = true; j++; continue; }
        if (w === 'mil' && (hay || !hay)) { total += (actual || 1) * 1000; actual = 0; hay = true; j++; continue; }
        if (w === 'millon' || w === 'millones' || w === 'palos' || w === 'palo') { total = (total + (actual || 1)) * 1e6; actual = 0; hay = true; millon = true; j++; continue; }
        if (w === 'y' && hay && pal[j + 1] === 'medio') { const base = total || actual; total += millon ? 5e5 : (base >= 1000 ? 500 : 0.5); if (!millon && base < 1000) { actual += 0.5; total -= 0.5; } j += 2; continue; }
        if (w === 'y' && hay && j + 1 < pal.length && (pal[j + 1] in UNID)) { j++; continue; }
        if (w === '|') break;
        break;
      }
      if (millon && actual > 0 && actual < 1000 && total % 1e6 === 0) { total += actual * 1000; actual = 0; }   // "2 millones 400" = 2.400.000
      if (hay && j > i) { out.push({ n: total + actual, desde: i, hasta: j, txt: pal.slice(i, j).join(' ') }); i = j; }
      else { if (pal[i] !== '|') out.push({ w: pal[i] }); i++; }
    }
    return out;
  }

  const HAC = [['terneros', /^ternero?s?$/], ['terneras', /^terneras?$/], ['vacas', /^vacas?$/], ['vaquillonas', /^vaquillonas?$/], ['toros', /^toros?$/],
    ['novillitos', /^novillitos?$/], ['novillos', /^novillos?$/]];
  const HAC_GEN = /^(animales|cabezas|hacienda|vacunos?|bichos)$/;

  /* palabras → categoría (la primera que aparece gana; las más específicas primero) */
  const PISTAS = [
    ['venta_granos', /^(soja|maiz|algodon|girasol|sorgo|trigo|granos?|cosecha)$/, 'I'],
    ['lena', /^(lena|carbon|postes?vend)$/, 'I'],
    ['pastaje', /^(pastaje|pastoreo|pastero)$/, 'I'],
    ['gasoil', /^(gasoil|gasoleo|diesel|nafta|combustible|gas-oil)$/],
    ['vacunas', /^(vacunas?|vacunacion|vacune|vacunamos|aftosa|brucelosis|carbunclo|mancha)$/],
    ['veterinaria', /^(veterinari[oa]|veterinaria|remedios?|antibioticos?|ivermectina|antiparasitarios?|garrapaticida|curabichera|curabicheras)$/],
    ['semillas', /^(semillas?|semilla)$/],
    ['forraje', /^(forraje|rollos?|fardos?|alimento|balanceado|pasto|silo|expeller|afrechillo)$/],
    ['desmonte', /^(desmonte|desmontar|topador|topadora|rolado|rolo|limpieza)$/],
    ['veneno', /^(veneno|herbicidas?|glifosato|insecticidas?|agroquimicos?|fumigacion|fumigar|curasemilla|2,4d)$/],
    ['peones', /^(peon|peones|sueldos?|jornal|jornales|aguinaldo|empleados?|changa|changarin)$/],
    ['fertilizantes', /^(fertilizantes?|urea|fosfato)$/],
    ['alambrado', /^(alambrado|alambre|postes?|varillas?|tranqueras?|corral|manga|mejoras)$/],
    ['aguadas', /^(aguadas?|molino|bomba|tanque|bebederos?|represa|pozo|perforacion)$/],
    ['maquinaria', /^(tractor|repuestos?|reparacion|arreglo|service|gomeria|cubiertas?|maquinaria|taller|mecanico)$/],
    ['contratistas', /^(contratista|siembra|sembrar|cosechadora|enfardado|enrollado)$/],
    ['flete', /^(flete|fletes|camion|camionero|transporte|jaula)$/],
    ['sal', /^(sal|minerales?|sales)$/],
    ['impuestos', /^(impuestos?|inmobiliario|guias?|senasa|marcas|tasas?|afip|arca|dte)$/],
    ['arriendo', /^(alquiler|arriendo|arrendamiento)$/],
    ['comisiones', /^(comision|comisiones|consignataria|remate|feria)$/],
    ['luz', /^(luz|electricidad|energia|internet|telefono|celular)$/],
    ['seguros', /^(seguros?)$/],
    ['proveeduria', /^(mercaderia|provisiones|proveeduria|comida|carne|almacen|supermercado)$/],
  ];
  const VENDER = /^(vendi|vendimos|vendio|venta|cobre|cobramos|cobro|ingreso|entraron|entro|me pagaron|liquidaron)$/;
  const COMPRAR = /^(pague|pagamos|pago|compre|compramos|gaste|gastamos|gasto|abone|cargue|cargamos|salio|salieron)$/;
  const UNIDADES = [['litros', /^(litros?|lts?)$/], ['kg', /^(kilos?|kg|kgs)$/], ['bolsas', /^(bolsas?)$/], ['rollos', /^(rollos?)$/], ['dosis', /^(dosis)$/],
    ['ha', /^(hectareas?|has?)$/], ['horas', /^(horas?|hs)$/], ['bidones', /^(bidones?)$/], ['fardos', /^(fardos?)$/], ['postes', /^(postes?)$/], ['toneladas', /^(toneladas?|tn)$/]];

  function entender(texto, peones) {
    const t = tokens(texto), r = { texto: String(texto || '').trim() };
    const palabras = t.filter(x => x.w).map(x => x.w);
    const plano = ' ' + palabras.join(' ') + ' ';
    if (palabras.some(w => VENDER.test(w)) || / me pagaron /.test(plano)) r.tipo = 'I';
    else if (palabras.some(w => COMPRAR.test(w))) r.tipo = 'G';
    // categoría
    const pista = PISTAS.find(([, re, tipo]) => (!r.tipo || (tipo || 'G') === r.tipo) && palabras.some(w => re.test(w))) || PISTAS.find(([, re]) => palabras.some(w => re.test(w)));
    if (pista) { r.cat = pista[0]; if (pista[2] && !r.tipo) r.tipo = pista[2]; }
    // hacienda: "20 terneros"
    t.forEach((x, k) => {
      if (!x.w) return;
      const h = HAC.find(([, re]) => re.test(x.w)) || (HAC_GEN.test(x.w) ? ['', null] : null);
      if (!h) return;
      if (h[0] && !r.hac) r.hac = h[0];
      const ant = t[k - 1], ant2 = t[k - 2];
      const num = ant && ant.n != null ? ant : (ant && /^(de|los|las)$/.test(ant.w || '') && ant2 && ant2.n != null ? ant2 : null);
      if (num && num.n < 5000 && !r.cabezas) { r.cabezas = num.n; num.usado = true; }
    });
    if ((r.hac || r.cabezas) && !r.cat) r.cat = r.tipo === 'I' ? 'venta_hac' : 'animales';
    if (r.cat === 'animales' && r.tipo === 'I') r.cat = 'venta_hac';
    if (!r.tipo) r.tipo = r.cat && ['venta_hac', 'venta_granos', 'lena', 'pastaje'].includes(r.cat) ? 'I' : 'G';
    if (r.tipo === 'I' && r.cat && !['venta_hac', 'venta_granos', 'lena', 'pastaje', 'venta_rollos', 'otros_i'].includes(r.cat)) r.cat = r.cat === 'forraje' ? 'venta_rollos' : 'otros_i';
    // cantidad con unidad: "200 litros"
    t.forEach((x, k) => {
      if (x.n == null || x.usado) return;
      const sig = t[k + 1]; const u = sig && sig.w && UNIDADES.find(([, re]) => re.test(sig.w));
      if (u && !r.cant) { r.cant = x.n; r.unidad = u[0]; x.usado = true; }
    });
    // la plata: lo que tiene "mil/millón", va con "$", o va después de "por/a/de/en"; si no, el número más grande que sobra
    const nums = t.filter(x => x.n != null && !x.usado);
    const conMil = nums.filter(x => /mil|millon|palo/.test(x.txt) || x.n >= 1000);
    const elegido = (conMil.length ? conMil : nums).sort((a, b) => b.n - a.n)[0];
    if (elegido) r.monto = Math.round(elegido.n * 100) / 100;
    // peón por nombre
    if (peones && peones.length) {
      const p = peones.find(p => palabras.includes(sinTilde(p.nombre).split(' ')[0]));
      if (p) { r.peon = p.id; if (!r.cat) r.cat = 'peones'; }
    }
    if (!r.cat) r.cat = r.tipo === 'I' ? 'otros_i' : 'otros_g';
    // detalle: lo dicho, prolijo
    r.detalle = r.texto.charAt(0).toUpperCase() + r.texto.slice(1);
    return r;
  }

  const api = { entender, tokens, numeroTxt, sinTilde };
  if (typeof module !== 'undefined') module.exports = api; else raiz.Voz = api;
})(typeof window !== 'undefined' ? window : globalThis);
