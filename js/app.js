/* Mi Campo · pantallas. Menú lateral: Inicio, Movimientos, Hacienda, Vacunas, Peones, A pagar / a cobrar, Informes, Configuración. */
'use strict';
(function () {
  const { D } = Datos;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, dec) => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec == null ? 2 : dec });
  const plata = n => (n < 0 ? '− $ ' : '$ ') + fmt(Math.abs(n), Math.abs(n) % 1 ? 2 : 0);
  /* $ 48,2 M · $ 850 mil */
  const corta = n => { const a = Math.abs(n), s = n < 0 ? '− ' : '';
    if (a >= 1e6) return s + '$ ' + fmt(a / 1e6, a >= 1e8 ? 0 : 1) + ' M'; if (a >= 1e4) return s + '$ ' + fmt(Math.round(a / 1e3), 0) + ' mil'; return s + '$ ' + fmt(a, 0); };
  const dmy = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4) : '';
  const dm = f => f ? +f.slice(8, 10) + ' ' + Datos.MES3[+f.slice(5, 7) - 1].toLowerCase() : '';
  const hoy = () => Datos.hoyISO();
  /* "1.250.000" · "1250000" · "1,5" → número */
  const leer = s => { let t = String(s ?? '').replace(/[$\s]/g, ''); if (!t) return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); return parseFloat(t); };
  const mesTxt = ym => Datos.MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
  let toastT;
  const toast = t => { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => e.hidden = true, 3200); };
  const hoja = html => { $('#hoja').innerHTML = html; $('#capa').hidden = false; $('#hoja').scrollTop = 0; };
  const cerrarHoja = () => { $('#capa').hidden = true; $('#hoja').innerHTML = ''; };
  $('#capa').addEventListener('click', e => { if (e.target.id === 'capa') cerrarHoja(); });

  /* ================================================================ menú lateral */
  const MENU = [['inicio', '🏠', 'Inicio'], ['movs', '📋', 'Movimientos'], ['hacienda', '🐄', 'Hacienda'], ['animales', '🏷️', 'Animales (caravanas)'], ['sanidad', '💉', 'Vacunas y sanidad'],
    ['peones', '👷', 'Peones'], ['pendientes', '🧾', 'A pagar / a cobrar'], ['informes', '📊', 'Informes'], ['-'], ['config', '⚙️', 'Configuración']];
  let PANT = 'inicio', ARG = null;
  function pintarMenu() {
    const pend = Datos.pendientes(D.movs, hoy()).filter(m => m.dias != null && m.dias <= 7).length;
    const vac = Datos.proximasVacunas(D.san, hoy(), 15).length;
    $('#menu').innerHTML = `<div class="m-cab"><img src="img/icono-192.png" alt=""><div><b>${esc(D.cfg.nombre || 'Mi Campo')}</b><small>${D.cfg.ha ? fmt(D.cfg.ha) + ' ha · ' : ''}Campaña ${Datos.campania(hoy(), D.cfg.campIni).nombre}</small></div></div>
      <div class="m-lista">${MENU.map(([id, e, t]) => id === '-' ? '<div class="m-sep"></div>' : `<button class="m-it ${PANT === id ? 'act' : ''}" data-ir="${id}"><span class="e">${e}</span>${t}${id === 'pendientes' && pend ? `<span class="n">${pend}</span>` : ''}${id === 'sanidad' && vac ? `<span class="n">${vac}</span>` : ''}</button>`).join('')}</div>
      <div class="m-pie">Mi Campo · RoFac · los datos quedan guardados en este celular</div>`;
    $$('#menu [data-ir]').forEach(b => b.onclick = () => { cerrarMenu(); ir(b.dataset.ir); });
  }
  const abrirMenu = () => { pintarMenu(); $('#menu').classList.add('abierto'); $('#velo').hidden = false; };
  const cerrarMenu = () => { $('#menu').classList.remove('abierto'); $('#velo').hidden = true; };
  $('#menuBtn').onclick = abrirMenu; $('#velo').onclick = cerrarMenu;
  // deslizar desde el borde izquierdo abre el menú; hacia la izquierda lo cierra
  let x0 = null;
  addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0;
    if (x0 < 24 && dx > 60 && !$('#menuBtn').hidden) abrirMenu(); else if (dx < -60 && $('#menu').classList.contains('abierto')) cerrarMenu(); x0 = null; }, { passive: true });

  const TITULOS = { inicio: () => D.cfg.nombre || 'Mi Campo', movs: 'Movimientos', hacienda: 'Hacienda', sanidad: 'Vacunas y sanidad', peones: 'Peones', pendientes: 'A pagar / a cobrar',
    informes: 'Informes', config: 'Configuración', animales: 'Animales (caravanas)', animal: 'Animal', cargar: () => ARG && ARG.mov ? 'Modificar' : (ARG && ARG.tipo === 'I' ? 'Cargar venta' : 'Cargar gasto'), peon: 'Peón' };
  const PANTALLAS = {};
  function ir(p, arg) {
    PANT = p; ARG = arg || null;
    const t = TITULOS[p]; $('#titulo').textContent = typeof t === 'function' ? t() : t;
    $('#barraDer').innerHTML = ''; $('#fab').hidden = !['inicio', 'movs'].includes(p);
    $('#main').innerHTML = ''; scrollTo(0, 0);
    PANTALLAS[p](ARG);
    try { history.replaceState(null, '', '#' + p); } catch (e) {}
  }
  $('#fab').onclick = () => elegirTipo();
  function elegirTipo() {
    hoja(`<h2>¿Qué querés cargar?</h2><div class="grandes" style="margin-top:12px"><button class="grande g" data-t="G"><span class="e">➖</span>Gasto</button><button class="grande i" data-t="I"><span class="e">➕</span>Venta / ingreso</button>
      <button class="grande voz" data-t="V"><span class="e">🎤</span>Decilo con la voz</button></div>`);
    $$('#hoja [data-t]').forEach(b => b.onclick = () => { cerrarHoja(); ir('cargar', b.dataset.t === 'V' ? { voz: true } : { tipo: b.dataset.t }); });
  }
  const volverBtn = (a, txt) => { $('#barraDer').innerHTML = `<button id="volver">${txt || '✕ Cerrar'}</button>`; $('#volver').onclick = () => ir(a || 'inicio'); };

  /* ================================================================ período (campaña) */
  let CAMP = null;    // año de inicio de la campaña que se mira
  const campActual = () => { const k = Datos.campania(hoy(), D.cfg.campIni); if (CAMP == null) CAMP = k.y0; return Datos.campania(CAMP + '-' + String(D.cfg.campIni || 7).padStart(2, '0') + '-01', D.cfg.campIni); };
  const periodoHtml = k => `<div class="periodo"><button class="fl" data-c="-1" aria-label="Campaña anterior">‹</button><b>${(D.cfg.campIni || 7) === 1 ? 'Año ' : 'Campaña '}${k.nombre}<br><small class="gris chico">${dmy(k.desde)} al ${dmy(k.hasta)}</small></b><button class="fl" data-c="1" aria-label="Campaña siguiente">›</button></div>`;
  const periodoEventos = fn => $$('.periodo [data-c]').forEach(b => b.onclick = () => { CAMP += +b.dataset.c; fn(); });

  /* ================================================================ gráfico de la campaña */
  function grafico(k, r) {
    const meses = Datos.mesesDe(k.desde, k.hasta), W = 340, H = 180, iz = 8, de = 8, ar = 14, ab = 24;
    let acum = 0; const ac = meses.map(m => { const x = r.porMes[m] || { ing: 0, gas: 0 }; if (m <= hoy().slice(0, 7)) acum += x.ing - x.gas; return m <= hoy().slice(0, 7) ? acum : null; });
    const vals = meses.flatMap(m => [(r.porMes[m] || {}).ing || 0, (r.porMes[m] || {}).gas || 0]).concat(ac.filter(v => v != null));
    const max = Math.max(1, ...vals), min = Math.min(0, ...ac.filter(v => v != null));
    const y = v => ar + (H - ar - ab) * (1 - (v - min) / (max - min || 1));
    const bw = (W - iz - de) / meses.length;
    let s = `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos por mes">`;
    s += `<line x1="${iz}" x2="${W - de}" y1="${y(0)}" y2="${y(0)}" stroke="#d8d2bf" stroke-width="1"/>`;
    meses.forEach((m, i) => {
      const x = iz + i * bw, v = r.porMes[m] || { ing: 0, gas: 0 }, w = Math.max(3, bw * .32);
      if (m === hoy().slice(0, 7)) s += `<rect x="${x + 1}" y="${ar - 6}" width="${bw - 2}" height="${H - ar - ab + 6}" rx="6" fill="#f1ead6"/><text x="${x + bw / 2}" y="${ar - 8 + 6}" text-anchor="middle" font-size="9" fill="#8a6a22" font-weight="700">Hoy</text>`;
      if (v.ing) s += `<rect x="${x + bw / 2 - w - 1}" y="${y(v.ing)}" width="${w}" height="${Math.max(1, y(0) - y(v.ing))}" rx="2" fill="#3f9a4e"/>`;
      if (v.gas) s += `<rect x="${x + bw / 2 + 1}" y="${y(v.gas)}" width="${w}" height="${Math.max(1, y(0) - y(v.gas))}" rx="2" fill="#c9553f"/>`;
      s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#6b7064">${Datos.MES3[+m.slice(5, 7) - 1]}</text>`;
    });
    const pts = ac.map((v, i) => v == null ? null : [iz + i * bw + bw / 2, y(v)]).filter(Boolean);
    if (pts.length > 1) s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#24572c" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.forEach(p => s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#24572c"/>`);
    return s + `</svg><div class="leyenda"><span><i style="background:#3f9a4e"></i>Ingresos</span><span><i style="background:#c9553f"></i>Gastos</span><span><i style="background:#24572c;height:3px"></i>Resultado acumulado</span></div>`;
  }
  function barrasCat(r, tipo, max) {
    const lista = Object.entries(r.porCat).filter(([k]) => k.startsWith(tipo + ':')).map(([k, v]) => ({ c: Datos.cat(tipo, k.slice(2)), v })).sort((a, b) => b.v - a.v);
    const tot = lista.reduce((s, x) => s + x.v, 0), top = lista[0] ? lista[0].v : 1;
    return lista.slice(0, max || 99).map(x => `<div class="f" data-cat="${esc(x.c.id)}" data-tipo="${tipo}"><span class="e">${x.c.ic}</span><span class="t">${esc(x.c.txt)}</span><span class="v">${corta(x.v)}<span class="p">${Math.round(x.v * 100 / (tot || 1))}%</span></span><span class="b"><i style="width:${(x.v * 100 / top).toFixed(1)}%"></i></span></div>`).join('');
  }

  /* ================================================================ INICIO */
  PANTALLAS.inicio = function () {
    const k = campActual(), r = Datos.resumen(D.movs, k.desde, k.hasta), e = Datos.existencias(D.hac);
    const pend = Datos.pendientes(D.movs, hoy()), vac = Datos.proximasVacunas(D.san, hoy(), 30);
    const venc = pend.filter(m => m.dias != null && m.dias < 0), prox = pend.filter(m => m.dias != null && m.dias >= 0 && m.dias <= 7);
    const ult = [...D.movs].sort((a, b) => (b.fecha + b.creado) > (a.fecha + a.creado) ? 1 : -1).slice(0, 5);
    $('#main').innerHTML = `
      ${!D.movs.length && !D.hac.length ? `<div class="card" style="background:var(--verde-cl)"><h2>👋 ¡Bienvenido!</h2><div class="chico" style="line-height:1.6">Cargá cada gasto y cada venta (o decilo con la voz: <i>"pagué 300 mil de gasoil"</i>) y acá vas a ver cuánto te está dejando el campo, mes a mes.<br>Empezá por <b>☰ → Configuración</b> (nombre del campo y hectáreas) y <b>☰ → Hacienda</b> (cuántos animales tenés).</div></div>` : ''}
      <div class="card">${periodoHtml(k)}
        <div class="kpis"><div class="kpi i"><small>Ingresos</small><b>${corta(r.ing)}</b></div><div class="kpi g"><small>Gastos</small><b>${corta(r.gas)}</b></div>
        <div class="kpi r ${r.res < 0 ? 'neg' : ''}"><small>Resultado</small><b>${corta(r.res)}</b></div></div>
        ${grafico(k, r)}</div>
      <div class="grandes"><button class="grande g" id="iGasto"><span class="e">➖</span>Gasto</button><button class="grande i" id="iVenta"><span class="e">➕</span>Venta</button>
        <button class="grande voz" id="iVoz"><span class="e">🎤</span>Decilo con la voz</button></div>
      ${venc.length ? `<div class="aviso rojo" data-ir="pendientes"><span class="e">⚠️</span><span>${venc.length === 1 ? '1 pago vencido' : venc.length + ' pagos vencidos'}: <b>${plata(venc.reduce((s, m) => s + (m.tipo === 'G' ? +m.monto : 0), 0))}</b></span></div>` : ''}
      ${prox.length ? `<div class="aviso" data-ir="pendientes"><span class="e">🧾</span><span>Esta semana: ${prox.map(m => esc(Datos.cat(m.tipo, m.cat).txt.split(' ')[0]) + ' ' + corta(m.monto) + ' (' + (m.dias ? 'en ' + m.dias + ' d' : 'hoy') + ')').join(' · ')}</span></div>` : ''}
      ${vac.map(v => `<div class="aviso ${v.dias < 0 ? 'rojo' : ''}" data-ir="sanidad"><span class="e">💉</span><span><b>${esc(v.producto)}</b>${v.cat ? ' (' + esc(Datos.HAC_TXT[v.cat] || v.cat) + ')' : ''}: ${v.dias < 0 ? 'se pasó hace ' + -v.dias + ' días' : v.dias === 0 ? 'toca hoy' : 'toca en ' + v.dias + ' días'} (${dmy(v.proxima)})</span></div>`).join('')}
      <div class="card"><h2>💸 En qué se va la plata <small>${k.nombre}</small></h2><div class="barras">${barrasCat(r, 'G', 6) || '<div class="vacio">Todavía no cargaste gastos en esta campaña</div>'}</div></div>
      <div class="card" data-ir="hacienda" style="cursor:pointer"><h2>🐄 Hacienda <small>ver →</small></h2>${e.total || D.hac.length ? `<div class="htotal"><b>${fmt(e.total)}</b><span class="gris">cabezas</span></div>
        <div class="chips" style="justify-content:center">${Datos.HACIENDA.filter(c => e[c]).map(c => `<span class="chip">${Datos.HAC_TXT[c]} <b>${fmt(e[c])}</b></span>`).join('')}</div>` : '<div class="gris chico">Cargá cuántos animales tenés para llevar la cuenta de nacimientos, ventas y muertes.</div>'}</div>
      <div class="card"><h2>🕑 Lo último <small><a data-ir="movs" style="color:var(--verde2)">ver todo</a></small></h2>${ult.map(movHtml).join('') || '<div class="vacio">Sin movimientos</div>'}</div>`;
    periodoEventos(() => ir('inicio'));
    $('#iGasto').onclick = () => ir('cargar', { tipo: 'G' }); $('#iVenta').onclick = () => ir('cargar', { tipo: 'I' }); $('#iVoz').onclick = () => ir('cargar', { voz: true });
    $$('#main [data-ir]').forEach(b => b.onclick = ev => { ev.stopPropagation(); ir(b.dataset.ir); });
    $$('#main [data-cat]').forEach(b => b.onclick = () => ir('movs', { cat: b.dataset.cat, tipo: b.dataset.tipo, desde: k.desde, hasta: k.hasta }));
    $$('#main .mov').forEach(b => b.onclick = () => ir('cargar', { mov: D.movs.find(m => m.id === b.dataset.id) }));
  };
  function movHtml(m) {
    const c = Datos.cat(m.tipo, m.cat), p = m.peon ? D.peo.find(x => x.id === m.peon) : null;
    const extra = [m.cabezas ? fmt(m.cabezas) + ' ' + (Datos.HAC_TXT[m.hac] || 'cab.').toLowerCase() : '', m.cant ? fmt(m.cant) + ' ' + (m.unidad || '') : '', p ? p.nombre + (m.concepto ? ' · ' + m.concepto : '') : '', m.lote || '', m.quien || ''].filter(Boolean).join(' · ');
    return `<div class="mov" data-id="${m.id}"><span class="e">${c.ic}</span><span class="t"><b>${esc(m.detalle || c.txt)}</b><small>${dm(m.fecha)} · ${esc(extra || c.txt)}</small></span>
      <span class="v ${m.tipo === 'I' ? 'i' : 'g'}">${m.tipo === 'I' ? '+' : '−'} ${plata(+m.monto).replace('$ ', '$')}${m.pendiente ? `<small>${m.tipo === 'I' ? 'a cobrar' : 'a pagar'}</small>` : ''}</span></div>`;
  }

  /* ================================================================ CARGAR (gasto o venta), con dictado */
  const HAC_CATS = ['animales', 'venta_hac'];
  const UNIDADES = ['litros', 'kg', 'bolsas', 'rollos', 'fardos', 'dosis', 'ha', 'horas', 'postes', 'toneladas', 'unidades'];
  const UNI_DEF = { gasoil: 'litros', semillas: 'bolsas', forraje: 'rollos', veneno: 'litros', vacunas: 'dosis', desmonte: 'ha', fertilizantes: 'kg', sal: 'kg', alambrado: 'postes', venta_granos: 'toneladas', venta_rollos: 'rollos', contratistas: 'ha' };
  const MEDIOS = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Otro'];
  const CONCEPTOS = ['Sueldo', 'Adelanto', 'Jornal', 'Aguinaldo', 'Vacaciones', 'Otro'];
  PANTALLAS.cargar = function (arg) {
    const ed = arg && arg.mov;
    const m = ed ? { ...ed } : { tipo: (arg && arg.tipo) || 'G', fecha: hoy(), cat: arg && arg.cat || '', medio: 'Efectivo', pendiente: false, ajHac: true, peon: arg && arg.peon || '', concepto: arg && arg.concepto || '' };
    if (ed) m.ajHac = !!D.hac.find(h => h.mov === ed.id);
    volverBtn(arg && arg.volver, '✕');
    const provs = [...new Set(D.movs.map(x => x.quien).filter(Boolean))];
    function pintar() {
      const cs = Datos.cats(m.tipo); if (m.cat && !cs.some(c => c.id === m.cat)) cs.push(Datos.cat(m.tipo, m.cat));
      const esHac = HAC_CATS.includes(m.cat), esPeon = m.cat === 'peones';
      $('#titulo').textContent = ed ? 'Modificar' : m.tipo === 'I' ? 'Cargar venta' : 'Cargar gasto';
      $('#main').innerHTML = `<div class="card">
        <div class="seg"><button data-tipo="G" class="g ${m.tipo === 'G' ? 'act' : ''}">➖ Gasto</button><button data-tipo="I" class="i ${m.tipo === 'I' ? 'act' : ''}">➕ Venta / ingreso</button></div>
        ${ed ? '' : `<label class="l">Decilo o escribilo (y el programa lo completa)</label>
        <div class="dictado"><input class="in" id="fDicho" placeholder='Ej: "pagué 300 mil de gasoil"' value="${esc(m._dicho || '')}" enterkeyhint="done"><button class="mic" id="fMic" aria-label="Dictar">🎤</button></div>
        <div id="fEntendi">${m._entendi ? `<div class="entendi">✓ ${m._entendi}</div>` : ''}</div>`}
        <label class="l" for="fMonto">${m.tipo === 'I' ? '¿Cuánto entró?' : '¿Cuánto salió?'}</label>
        <input class="in monto" id="fMonto" inputmode="decimal" placeholder="$ 0" value="${m.monto ? fmt(m.monto) : ''}" autocomplete="off">
        <label class="l">${m.tipo === 'I' ? '¿De qué?' : '¿En qué?'}</label>
        <div class="cats ${m.tipo === 'G' ? 'g' : ''}">${cs.map(c => `<button class="cat ${c.id === m.cat ? 'act' : ''}" data-cat="${esc(c.id)}"><span class="e">${c.ic}</span><span class="t">${esc(c.txt)}</span></button>`).join('')}</div>
        <div class="fila2"><div><label class="l" for="fFecha">Fecha</label><input class="in" type="date" id="fFecha" value="${m.fecha}"></div>
          ${D.cfg.lotes && D.cfg.lotes.length ? `<div><label class="l" for="fLote">Lote / potrero</label><select class="in" id="fLote"><option value="">—</option>${D.cfg.lotes.map(l => `<option ${l.nombre === m.lote ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></div>` : '<div></div>'}</div>
        ${esHac ? `<div class="fila2"><div><label class="l" for="fCab">Cabezas</label><input class="in" id="fCab" inputmode="numeric" value="${m.cabezas || ''}"></div>
            <div><label class="l" for="fHac">Categoría</label><select class="in" id="fHac"><option value="">—</option>${Datos.HACIENDA.map(c => `<option value="${c}" ${c === m.hac ? 'selected' : ''}>${Datos.HAC_TXT[c]}</option>`).join('')}</select></div></div>
          <div class="fila2"><div><label class="l" for="fKg">Kilos (total)</label><input class="in" id="fKg" inputmode="decimal" value="${m.kilos ? fmt(m.kilos) : ''}"></div><div><label class="l">&nbsp;</label><div class="gris chico" id="fPrecioU" style="padding-top:8px"></div></div></div>
          <label class="check"><input type="checkbox" id="fAjHac" ${m.ajHac ? 'checked' : ''}> ${m.tipo === 'I' ? 'Descontar' : 'Sumar'} estas cabezas de la hacienda</label>` : ''}
        ${esPeon ? `<div class="fila2"><div><label class="l" for="fPeon">Peón</label><select class="in" id="fPeon"><option value="">—</option>${D.peo.filter(p => p.activo !== false || p.id === m.peon).map(p => `<option value="${p.id}" ${p.id === m.peon ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
            <div><label class="l" for="fConc">Concepto</label><select class="in" id="fConc">${CONCEPTOS.map(c => `<option ${c === m.concepto ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
          ${D.peo.length ? '' : '<div class="ayudita">Todavía no cargaste peones: ☰ → Peones.</div>'}` : ''}
        ${!esHac && !esPeon ? `<div class="fila2"><div><label class="l" for="fCant">Cantidad (opcional)</label><input class="in" id="fCant" inputmode="decimal" value="${m.cant ? fmt(m.cant) : ''}"></div>
            <div><label class="l" for="fUni">Unidad</label><select class="in" id="fUni">${UNIDADES.map(u => `<option ${u === (m.unidad || UNI_DEF[m.cat] || 'unidades') ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div><div class="ayudita" id="fPrecioU"></div>` : ''}
        <label class="l" for="fQuien">${m.tipo === 'I' ? 'Comprador / quién pagó' : 'Proveedor / a quién'} (opcional)</label>
        <input class="in" id="fQuien" list="fProvs" value="${esc(m.quien || '')}" autocomplete="off"><datalist id="fProvs">${provs.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        <label class="l" for="fDet">Detalle (opcional)</label><input class="in" id="fDet" value="${esc(m.detalle || '')}" placeholder="${m.tipo === 'I' ? 'Ej: remate de Charata' : 'Ej: 200 litros para el tractor'}">
        <label class="l">${m.tipo === 'I' ? '¿Ya lo cobraste?' : '¿Ya lo pagaste?'}</label>
        <div class="chips"><button class="chip ${!m.pendiente ? 'act' : ''}" data-pend="0">${m.tipo === 'I' ? 'Cobrado' : 'Pagado'}</button><button class="chip rojo ${m.pendiente ? 'act' : ''}" data-pend="1">${m.tipo === 'I' ? 'A cobrar' : 'A pagar'}</button></div>
        ${m.pendiente ? `<label class="l" for="fVence">Vence / fecha de ${m.tipo === 'I' ? 'cobro' : 'pago'}</label><input class="in" type="date" id="fVence" value="${m.vence || Datos.sumarDias(m.fecha, 30)}">` : ''}
        <label class="l">Cómo</label><div class="chips">${MEDIOS.map(x => `<button class="chip ${x === m.medio ? 'act' : ''}" data-medio="${x}">${x}</button>`).join('')}</div>
        <div class="error" id="fErr"></div>
        <div class="botones"><button class="btn ancho ${m.tipo === 'G' ? 'rojo' : ''}" id="fOk">💾 Guardar ${m.tipo === 'I' ? 'venta' : 'gasto'}</button></div>
        ${ed ? '<div class="botones"><button class="btn lin" id="fBorrar">🗑 Borrar</button></div>' : ''}
      </div>`;
      enlazar();
    }
    const leerForm = () => {
      const v = id => { const e = $('#' + id); return e ? e.value : undefined; };
      m.monto = leer(v('fMonto')); m.fecha = v('fFecha') || hoy(); m.lote = v('fLote') || '';
      if ($('#fCab')) { m.cabezas = leer(v('fCab')) || 0; m.hac = v('fHac'); m.kilos = leer(v('fKg')) || 0; m.ajHac = $('#fAjHac').checked; }
      if ($('#fPeon')) { m.peon = v('fPeon'); m.concepto = v('fConc'); }
      if ($('#fCant')) { m.cant = leer(v('fCant')) || 0; m.unidad = v('fUni'); }
      m.quien = v('fQuien').trim(); m.detalle = v('fDet').trim(); if ($('#fVence')) m.vence = v('fVence');
      if ($('#fDicho')) m._dicho = v('fDicho');
    };
    function precioU() {
      const e = $('#fPrecioU'); if (!e) return; const monto = leer($('#fMonto').value);
      if ($('#fCab')) { const c = leer($('#fCab').value), kg = leer($('#fKg').value);
        e.innerHTML = [c > 0 && monto > 0 ? plata(Math.round(monto / c)) + ' por cabeza' : '', kg > 0 && monto > 0 ? plata(Math.round(monto / kg * 100) / 100) + ' el kilo' : '', c > 0 && kg > 0 ? fmt(Math.round(kg / c)) + ' kg promedio' : ''].filter(Boolean).join('<br>'); }
      else if ($('#fCant')) { const c = leer($('#fCant').value); e.textContent = c > 0 && monto > 0 ? plata(Math.round(monto / c * 100) / 100) + ' por ' + ($('#fUni').value.replace(/s$/, '').replace(/ne$/, 'n') === 'ha' ? 'hectárea' : $('#fUni').value.replace(/es$/, '').replace(/s$/, '')) : ''; }
    }
    function enlazar() {
      $$('#main [data-tipo]').forEach(b => b.onclick = () => { leerForm(); if (m.tipo !== b.dataset.tipo) { m.tipo = b.dataset.tipo; m.cat = ''; } pintar(); });
      $$('#main [data-cat]').forEach(b => b.onclick = () => { leerForm(); m.cat = b.dataset.cat; if (!m.unidad || !m.cant) m.unidad = UNI_DEF[m.cat]; pintar(); const x = $('#fCab') || $('#fPeon') || $('#fCant'); if (x && !m.monto) $('#fMonto').focus(); });
      $$('#main [data-pend]').forEach(b => b.onclick = () => { leerForm(); m.pendiente = b.dataset.pend === '1'; pintar(); });
      $$('#main [data-medio]').forEach(b => b.onclick = () => { m.medio = b.dataset.medio; $$('#main [data-medio]').forEach(x => x.classList.toggle('act', x === b)); });
      const mo = $('#fMonto');
      mo.oninput = precioU; mo.onblur = () => { const n = leer(mo.value); if (n > 0) mo.value = fmt(n); };
      ['fCab', 'fKg', 'fCant', 'fUni'].forEach(id => { const e = $('#' + id); if (e) e.oninput = e.onchange = precioU; });
      precioU();
      $('#fOk').onclick = guardar;
      if ($('#fBorrar')) $('#fBorrar').onclick = borrar;
      if ($('#fDicho')) {
        $('#fDicho').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); interpretar($('#fDicho').value); } };
        $('#fDicho').onchange = () => interpretar($('#fDicho').value);
        $('#fMic').onclick = dictar;
      }
    }
    function interpretar(txt) {
      if (!String(txt).trim() || interpretar.ocupado || (txt === m._dicho && m._entendi)) return;
      interpretar.ocupado = true; setTimeout(() => interpretar.ocupado = false, 0);
      leerForm();
      const r = Voz.entender(txt, D.peo);
      m.tipo = r.tipo; m.cat = r.cat; if (r.monto) m.monto = r.monto;
      if (r.cabezas) m.cabezas = r.cabezas; if (r.hac) m.hac = r.hac; if (r.peon) m.peon = r.peon;
      if (r.cant) { if (HAC_CATS.includes(m.cat) && r.unidad === 'kg') m.kilos = r.cant; else { m.cant = r.cant; m.unidad = r.unidad; } }
      if (!m.detalle || m._detAuto) { m.detalle = r.detalle; m._detAuto = true; }
      const c = Datos.cat(m.tipo, m.cat);
      m._dicho = txt;
      m._entendi = `${m.tipo === 'I' ? 'Venta' : 'Gasto'}: ${c.ic} ${esc(c.txt)}${r.monto ? ' · <b>' + plata(r.monto) + '</b>' : ' · <b>falta el monto</b>'}${r.cabezas ? ' · ' + fmt(r.cabezas) + ' ' + (Datos.HAC_TXT[r.hac] || 'cabezas').toLowerCase() : ''}${r.cant ? ' · ' + fmt(r.cant) + ' ' + (r.unidad === 'kg' ? 'kilos' : r.unidad) : ''}. Revisá y tocá Guardar.`;
      pintar();
    }
    let rec = null;
    function dictar() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { $('#fDicho').focus(); toast('Tocá el micrófono 🎤 del teclado del celular y decilo'); return; }
      if (rec) { try { rec.stop(); } catch (e) {} return; }
      rec = new SR(); rec.lang = 'es-AR'; rec.interimResults = true; rec.maxAlternatives = 1;
      const b = $('#fMic'); b.classList.add('oye'); b.textContent = '⏺';
      let final = '';
      rec.onresult = e => { let t = ''; for (const r of e.results) t += r[0].transcript; $('#fDicho').value = t; if (e.results[e.results.length - 1].isFinal) final = t; };
      rec.onerror = e => { if (e.error === 'not-allowed') toast('Hay que darle permiso al micrófono'); else if (e.error === 'network') toast('Para dictar hace falta internet. Podés escribirlo.'); };
      rec.onend = () => { rec = null; const bb = $('#fMic'); if (bb) { bb.classList.remove('oye'); bb.textContent = '🎤'; } const t = final || ($('#fDicho') && $('#fDicho').value); if (t) interpretar(t); };
      try { rec.start(); } catch (e) { rec = null; b.classList.remove('oye'); b.textContent = '🎤'; }
    }
    async function guardar() {
      leerForm();
      const err = t => { $('#fErr').textContent = t; };
      if (!(m.monto > 0)) return err(m.tipo === 'I' ? 'Escribí cuánto entró' : 'Escribí cuánto salió');
      if (!m.cat) return err(m.tipo === 'I' ? 'Elegí de qué es la venta' : 'Elegí en qué fue el gasto');
      if (m.pendiente && !m.vence) m.vence = Datos.sumarDias(m.fecha, 30);
      if (HAC_CATS.includes(m.cat) && m.ajHac && m.cabezas > 0 && !m.hac) return err('Elegí la categoría de los animales (terneros, vacas…)');
      if (m.cat === 'peones' && D.peo.length && !m.peon) return err('Elegí el peón');
      const mov = { id: m.id, creado: m.creado, tipo: m.tipo, cat: m.cat, monto: Datos.red(m.monto), fecha: m.fecha, lote: m.lote || '', quien: m.quien || '', detalle: m.detalle || '',
        medio: m.medio, pendiente: !!m.pendiente, vence: m.pendiente ? m.vence : '', pagadoEl: m.pendiente ? '' : (m.pagadoEl || ''), san: m.san || '' };
      if (HAC_CATS.includes(m.cat)) Object.assign(mov, { cabezas: m.cabezas || 0, hac: m.hac || '', kilos: m.kilos || 0 });
      else if (m.cat === 'peones') Object.assign(mov, { peon: m.peon || '', concepto: m.concepto || 'Sueldo' });
      else Object.assign(mov, { cant: m.cant || 0, unidad: m.cant ? m.unidad : '' });
      if (!mov.id) delete mov.id; if (!mov.creado) delete mov.creado;
      await Datos.guardar('movs', mov);
      // hacienda unida a este movimiento
      const unido = D.hac.find(h => h.mov === mov.id);
      if (HAC_CATS.includes(mov.cat) && m.ajHac && mov.cabezas > 0 && mov.hac) {
        await Datos.guardar('hac', Object.assign(unido || {}, { fecha: mov.fecha, tipo: mov.tipo === 'I' ? 'VENTA' : 'COMPRA', cat: mov.hac, cant: mov.cabezas, detalle: mov.detalle || mov.quien || '', mov: mov.id }));
      } else if (unido) await Datos.borrar('hac', unido.id);
      toast(ed ? 'Cambios guardados' : (mov.tipo === 'I' ? 'Venta registrada ✓ ' : 'Gasto registrado ✓ ') + plata(mov.monto));
      ir((arg && arg.volver) || (ed ? 'movs' : 'inicio'), arg && arg.volverArg);
    }
    async function borrar() {
      if (!confirm('¿Borrar este movimiento?')) return;
      const unido = D.hac.find(h => h.mov === m.id); if (unido) await Datos.borrar('hac', unido.id);
      await Datos.borrar('movs', m.id); toast('Borrado'); ir((arg && arg.volver) || 'movs', arg && arg.volverArg);
    }
    pintar();
    if (arg && arg.voz) setTimeout(dictar, 250);
  };

  /* ================================================================ MOVIMIENTOS */
  PANTALLAS.movs = function (arg) {
    const f = Object.assign({ tipo: '', cat: '', q: '', desde: '', hasta: '' }, arg || {});
    function pintar() {
      let l = D.movs.filter(m => (!f.tipo || m.tipo === f.tipo) && (!f.cat || m.cat === f.cat) && (!f.desde || m.fecha >= f.desde) && (!f.hasta || m.fecha <= f.hasta));
      const q = Voz.sinTilde(f.q.trim());
      if (q) l = l.filter(m => Voz.sinTilde([m.detalle, m.quien, Datos.cat(m.tipo, m.cat).txt, m.lote, (D.peo.find(p => p.id === m.peon) || {}).nombre].join(' ')).includes(q));
      l.sort((a, b) => (b.fecha + (b.creado || '')) > (a.fecha + (a.creado || '')) ? 1 : -1);
      const ing = l.filter(m => m.tipo === 'I').reduce((s, m) => s + +m.monto, 0), gas = l.filter(m => m.tipo === 'G').reduce((s, m) => s + +m.monto, 0);
      const porMes = {}; l.forEach(m => (porMes[m.fecha.slice(0, 7)] = porMes[m.fecha.slice(0, 7)] || []).push(m));
      const cs = f.tipo ? Datos.cats(f.tipo) : [];
      $('#main').innerHTML = `<div class="card"><div class="chips">${[['', 'Todo'], ['G', 'Gastos'], ['I', 'Ventas']].map(([t, x]) => `<button class="chip ${f.tipo === t ? 'act' : ''}" data-t="${t}">${x}</button>`).join('')}</div>
        ${f.tipo ? `<select class="in" id="mCat" style="margin-top:8px"><option value="">Todas las categorías</option>${cs.map(c => `<option value="${esc(c.id)}" ${c.id === f.cat ? 'selected' : ''}>${c.ic} ${esc(c.txt)}</option>`).join('')}</select>` : ''}
        <input class="in" id="mQ" placeholder="🔍 Buscar (proveedor, detalle…)" value="${esc(f.q)}" style="margin-top:8px">
        ${f.desde ? `<div class="chico gris" style="margin-top:6px">Del ${dmy(f.desde)} al ${dmy(f.hasta)} · <a id="mTodas" style="color:var(--verde2)">ver todas las fechas</a></div>` : ''}
        <div class="kpis" style="margin-top:10px"><div class="kpi i"><small>Ingresos</small><b>${corta(ing)}</b></div><div class="kpi g"><small>Gastos</small><b>${corta(gas)}</b></div><div class="kpi r ${ing - gas < 0 ? 'neg' : ''}"><small>Diferencia</small><b>${corta(ing - gas)}</b></div></div></div>
        ${Object.entries(porMes).map(([ym, ms]) => { const g = ms.filter(m => m.tipo === 'G').reduce((s, m) => s + +m.monto, 0), i = ms.filter(m => m.tipo === 'I').reduce((s, m) => s + +m.monto, 0);
          return `<div class="mes">${mesTxt(ym)}<span>${i ? '+' + corta(i) + ' ' : ''}${g ? '−' + corta(g) : ''}</span></div>` + ms.map(movHtml).join(''); }).join('') || '<div class="vacio">No hay movimientos' + (f.q || f.cat ? ' con esa búsqueda' : '. Tocá ＋ para cargar el primero.') + '</div>'}`;
      $$('#main [data-t]').forEach(b => b.onclick = () => { f.tipo = b.dataset.t; f.cat = ''; pintar(); });
      if ($('#mCat')) $('#mCat').onchange = e => { f.cat = e.target.value; pintar(); };
      $('#mQ').oninput = e => { f.q = e.target.value; clearTimeout(pintar.t); pintar.t = setTimeout(() => { pintar(); const i = $('#mQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
      if ($('#mTodas')) $('#mTodas').onclick = () => { f.desde = f.hasta = ''; pintar(); };
      $$('#main .mov').forEach(b => b.onclick = () => ir('cargar', { mov: D.movs.find(m => m.id === b.dataset.id), volver: 'movs', volverArg: f }));
    }
    pintar();
  };

  /* ================================================================ HACIENDA */
  PANTALLAS.hacienda = function () {
    const e = Datos.existencias(D.hac);
    const l = [...D.hac].sort((a, b) => (b.fecha + (b.creado || '')) > (a.fecha + (a.creado || '')) ? 1 : -1);
    $('#main').innerHTML = `<div class="card"><div class="htotal"><b>${fmt(e.total)}</b><span class="gris">cabezas en total</span></div>
        <div class="hgrid">${Datos.HACIENDA.map(c => `<div class="hcab"><b>${fmt(e[c])}</b><small>${Datos.HAC_TXT[c]}</small></div>`).join('')}</div>
        ${Datos.HACIENDA.some(c => e[c] < 0) ? '<div class="error">Hay categorías en negativo: hacé un recuento (botón Contar).</div>' : ''}</div>
      <div class="acc" style="margin-bottom:12px">
        <button data-h="CONTAR"><span class="e">🔢</span>Contar</button><button data-h="NAC"><span class="e">🐣</span>Nacimientos</button><button data-h="CAMBIO"><span class="e">🔁</span>Cambio de categoría</button>
        <button data-h="VENTA"><span class="e">🐂</span>Venta</button><button data-h="COMPRA"><span class="e">🛒</span>Compra</button><button data-h="MUERTE"><span class="e">✝️</span>Muerte</button></div>
      <button class="card" id="hAni" style="width:100%;text-align:left;border:0;cursor:pointer;display:flex;align-items:center;gap:12px;font:inherit"><span style="font-size:30px">🏷️</span><span style="flex:1"><b style="display:block;font-size:16px">Animales con caravana</b><span class="gris chico">${D.ani.filter(a => a.estado !== 'vendido' && a.estado !== 'muerto').length} con ficha · buscá por número o con la cámara</span></span><span style="font-size:22px;color:var(--verde2)">›</span></button>
      <div class="card"><h2>📜 Movimientos de hacienda</h2>${l.map(h => `<div class="mov" data-hid="${h.id}"><span class="e">${{ INICIAL: '🔢', AJUSTE: '🔢', NAC: '🐣', COMPRA: '🛒', VENTA: '🐂', MUERTE: '✝️', CAMBIO: '🔁', CONSUMO: '🍖' }[h.tipo] || '🐄'}</span>
          <span class="t"><b>${Datos.HAC_MOV[h.tipo]}: ${h.tipo === 'AJUSTE' && h.cant > 0 ? '+' : ''}${fmt(h.cant)} ${(Datos.HAC_TXT[h.cat] || h.cat).toLowerCase()}${h.tipo === 'CAMBIO' ? ' → ' + (Datos.HAC_TXT[h.cat2] || h.cat2).toLowerCase() : ''}</b><small>${dmy(h.fecha)}${h.detalle ? ' · ' + esc(h.detalle) : ''}${h.mov ? ' · con su $' : ''}</small></span></div>`).join('') || '<div class="vacio">Empezá con <b>Contar</b>: cuántas vacas, toros, terneros… tenés hoy.</div>'}</div>`;
    $('#hAni').onclick = () => ir('animales');
    $$('#main [data-h]').forEach(b => b.onclick = () => {
      const t = b.dataset.h;
      if (t === 'VENTA') return ir('cargar', { tipo: 'I', cat: 'venta_hac', volver: 'hacienda' });
      if (t === 'COMPRA') return ir('cargar', { tipo: 'G', cat: 'animales', volver: 'hacienda' });
      if (t === 'CONTAR') return contar();
      movHac({ tipo: t });
    });
    $$('#main [data-hid]').forEach(b => b.onclick = () => { const h = D.hac.find(x => x.id === b.dataset.hid); if (h.mov) return ir('cargar', { mov: D.movs.find(m => m.id === h.mov), volver: 'hacienda' }); movHac(h); });
  };
  function movHac(h) {
    const ed = !!h.id, t = h.tipo;
    const opc = (sel, solo) => (solo || Datos.HACIENDA).map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${Datos.HAC_TXT[c]}</option>`).join('');
    hoja(`<h2>${{ NAC: '🐣 Nacimientos', MUERTE: '✝️ Muerte', CAMBIO: '🔁 Cambio de categoría', AJUSTE: '🔢 Recuento', INICIAL: '🔢 Conteo', CONSUMO: '🍖 Consumo' }[t]}</h2>
      ${t === 'CAMBIO' ? '<div class="ayudita">Ej: destete (terneras → vaquillonas), novillitos → novillos, vaquillonas que entran al servicio → vacas.</div>' : ''}
      ${t === 'NAC' ? `<div class="fila2"><div><label class="l" for="hM">Machos (terneros)</label><input class="in" id="hM" inputmode="numeric" value="${ed && h.cat === 'terneros' ? h.cant : ''}"></div><div><label class="l" for="hH">Hembras (terneras)</label><input class="in" id="hH" inputmode="numeric" value="${ed && h.cat === 'terneras' ? h.cant : ''}"></div></div>`
        : `<div class="fila2"><div><label class="l" for="hCant">Cantidad</label><input class="in" id="hCant" inputmode="numeric" value="${ed ? Math.abs(h.cant) : ''}"></div><div><label class="l" for="hCat">${t === 'CAMBIO' ? 'De' : 'Categoría'}</label><select class="in" id="hCat">${opc(h.cat)}</select></div></div>
          ${t === 'CAMBIO' ? `<label class="l" for="hCat2">A</label><select class="in" id="hCat2">${opc(h.cat2 || 'vaquillonas')}</select>` : ''}`}
      <div class="fila2"><div><label class="l" for="hFecha">Fecha</label><input class="in" type="date" id="hFecha" value="${h.fecha || hoy()}"></div><div><label class="l" for="hDet">${t === 'MUERTE' ? 'Causa' : 'Detalle'}</label><input class="in" id="hDet" value="${esc(h.detalle || '')}"></div></div>
      <div class="error" id="hErr"></div><div class="botones"><button class="btn" id="hOk">Guardar</button>${ed ? '<button class="btn lin" id="hBorrar">🗑 Borrar</button>' : '<button class="btn lin" id="hNo">Cancelar</button>'}</div>`);
    $('#hOk').onclick = async () => {
      const fecha = $('#hFecha').value || hoy(), det = $('#hDet').value.trim();
      if (t === 'NAC') {
        const ma = leer($('#hM').value) || 0, he = leer($('#hH').value) || 0;
        if (!(ma + he > 0)) return $('#hErr').textContent = 'Escribí cuántos nacieron';
        if (ed) { await Datos.guardar('hac', { ...h, fecha, detalle: det, cant: h.cat === 'terneros' ? ma : he }); }
        else { if (ma) await Datos.guardar('hac', { fecha, tipo: 'NAC', cat: 'terneros', cant: ma, detalle: det }); if (he) await Datos.guardar('hac', { fecha, tipo: 'NAC', cat: 'terneras', cant: he, detalle: det }); }
      } else {
        const n = leer($('#hCant').value), cat = $('#hCat').value, cat2 = $('#hCat2') ? $('#hCat2').value : '';
        if (!(n > 0)) return $('#hErr').textContent = 'Escribí la cantidad';
        if (t === 'CAMBIO' && cat === cat2) return $('#hErr').textContent = 'Elegí categorías distintas';
        await Datos.guardar('hac', { ...h, fecha, cat, cat2, cant: t === 'AJUSTE' ? (h.cant < 0 ? -n : n) : n, detalle: det });
      }
      cerrarHoja(); toast('Guardado ✓'); ir('hacienda');
    };
    if ($('#hNo')) $('#hNo').onclick = cerrarHoja;
    if ($('#hBorrar')) $('#hBorrar').onclick = async () => { if (!confirm('¿Borrar este movimiento de hacienda?')) return; await Datos.borrar('hac', h.id); cerrarHoja(); ir('hacienda'); };
  }
  /* Contar: se escribe cuántos hay hoy; el programa guarda la diferencia (o el conteo inicial la primera vez) */
  function contar() {
    const e = Datos.existencias(D.hac), primera = !D.hac.length;
    hoja(`<h2>🔢 ${primera ? '¿Cuántos animales tenés hoy?' : 'Recuento'}</h2><div class="ayudita">${primera ? 'Es el punto de partida. Después el programa suma nacimientos y compras y resta ventas y muertes.' : 'Escribí lo que contaste: el programa anota la diferencia con lo que tenía.'}</div>
      <div class="fila2">${Datos.HACIENDA.map(c => `<div><label class="l" for="c_${c}">${Datos.HAC_TXT[c]}</label><input class="in" id="c_${c}" inputmode="numeric" value="${primera ? '' : e[c]}"></div>`).join('')}</div>
      <label class="l" for="cFecha">Fecha</label><input class="in" type="date" id="cFecha" value="${hoy()}">
      <div class="botones"><button class="btn" id="cOk">Guardar</button><button class="btn lin" id="cNo">Cancelar</button></div>`);
    $('#cNo').onclick = cerrarHoja;
    $('#cOk').onclick = async () => {
      const fecha = $('#cFecha').value || hoy(); let n = 0;
      for (const c of Datos.HACIENDA) {
        const v = $('#c_' + c).value.trim(); if (v === '') continue; const x = leer(v); if (isNaN(x) || x < 0) continue;
        const dif = primera ? x : x - e[c]; if (!dif) continue;
        await Datos.guardar('hac', { fecha, tipo: primera ? 'INICIAL' : 'AJUSTE', cat: c, cant: dif, detalle: primera ? '' : 'Recuento: había ' + e[c] + ', se contaron ' + x }); n++;
      }
      cerrarHoja(); toast(n ? 'Hacienda actualizada ✓' : 'No cambió nada'); ir('hacienda');
    };
  }

  /* ================================================================ ANIMALES CON CARAVANA (escribiendo o con la cámara) */
  const carTxt = c => { const t = Datos.normCar(c); return /^\d{15}$/.test(t) ? t.slice(0, 3) + ' ' + t.slice(3, 7) + ' ' + t.slice(7, 11) + ' ' + t.slice(11) : t.length <= 8 ? t : t.replace(/(\d)(?=(\d{4})+$)/g, '$1 '); };
  const carCorta = c => { const t = Datos.normCar(c); return t.length > 6 ? '…' + t.slice(-6) : t; };
  const SEXO = { M: 'Macho', H: 'Hembra' };
  const EV = { PESO: ['⚖️', 'Pesada'], VACUNA: ['💉', 'Vacuna / tratamiento'], SERV: ['🐂', 'Servicio / preñez'], NOTA: ['📝', 'Nota'], VENTA: ['💰', 'Vendido'], MUERTE: ['✝️', 'Murió'], ALTA: ['🏷️', 'Alta'] };
  const vivo = a => a.estado !== 'vendido' && a.estado !== 'muerto';
  PANTALLAS.animales = function (arg) {
    const f = Object.assign({ q: '', todos: false }, arg || {});
    $('#main').innerHTML = `<div class="card"><label class="l" for="aQ" style="margin-top:0">Número de caravana</label>
        <div class="dictado"><input class="in" id="aQ" inputmode="numeric" autocomplete="off" placeholder="N° o los últimos" value="${esc(f.q)}" enterkeyhint="search" style="font-size:20px;font-weight:700;letter-spacing:1px"><button class="mic" id="aCam" aria-label="Leer con la cámara" style="background:var(--verde2)">📷</button></div>
        <div class="ayudita">Alcanza con los últimos números. 📷 = leer el número impreso de la caravana con la cámara.</div>
        <div class="chips" style="margin-top:8px"><button class="chip ${!f.todos ? 'act' : ''}" data-todos="0">En el campo</button><button class="chip ${f.todos ? 'act' : ''}" data-todos="1">Todos (también vendidos y muertos)</button></div></div>
      <div id="aLista"></div>`;
    function lista() {
      const q = $('#aQ').value.trim(); f.q = q;
      let l = q ? Datos.buscarAnimal(D.ani, q) : [...D.ani];
      if (!f.todos) l = l.filter(vivo);
      l.sort((a, b) => Datos.normCar(a.caravana) > Datos.normCar(b.caravana) ? 1 : -1);
      const fila = a => { const p = Datos.pesos(a); return `<div class="mov" data-aid="${a.id}"><span class="e">${a.sexo === 'H' ? '🐄' : '🐂'}</span><span class="t"><b style="letter-spacing:.5px">${esc(carTxt(a.caravana))}${a.apodo ? ' · ' + esc(a.apodo) : ''}</b>
        <small>${esc(Datos.HAC_TXT[a.cat] || '')}${a.nac ? ' · ' + Datos.edad(a.nac, hoy()) : ''}${p.ultimo ? ' · ' + fmt(p.ultimo.kg) + ' kg' : ''}${!vivo(a) ? ' · ' + (a.estado === 'vendido' ? 'vendido' : 'murió') + ' ' + dmy(a.baja) : ''}</small></span><span style="font-size:20px;color:var(--suave)">›</span></div>`; };
      $('#aLista').innerHTML = (q && !Datos.buscarAnimal(D.ani, q).some(a => Datos.normCar(a.caravana) === Datos.normCar(q)) ? `<button class="btn ancho" id="aNuevo" style="margin-bottom:12px">＋ Agregar la caravana ${esc(carTxt(q))}</button>` : '')
        + (l.length ? `<div class="card"><h2>🏷️ ${l.length === 1 ? '1 animal' : l.length + ' animales'}</h2>${l.slice(0, 300).map(fila).join('')}${l.length > 300 ? '<div class="ayudita">Mostrando 300: buscá por número para encontrar el resto.</div>' : ''}</div>`
          : `<div class="vacio">${q ? 'No hay ningún animal con ese número.' : 'Todavía no hay animales con ficha.<br>Escribí el número de una caravana (o leelo con 📷) y tocá Agregar.'}</div>`);
      $$('#aLista [data-aid]').forEach(b => b.onclick = () => ir('animal', { id: b.dataset.aid, volver: { q: f.q, todos: f.todos } }));
      if ($('#aNuevo')) $('#aNuevo').onclick = () => fichaAnimal({ caravana: Datos.normCar(q) });
    }
    const aQ = $('#aQ');
    aQ.oninput = () => lista();
    /* Enter (o un lector de caravanas en modo teclado, que escribe el número y aprieta Enter): si hay uno solo lo abre; si no existe, ofrece agregarlo */
    aQ.onkeydown = e => { if (e.key !== 'Enter') return; e.preventDefault(); const q = aQ.value.trim(); if (!q) return;
      const r = Datos.buscarAnimal(D.ani, q); if (r.length === 1) ir('animal', { id: r[0].id, volver: { q: '', todos: f.todos } }); else if (!r.length) fichaAnimal({ caravana: Datos.normCar(q) }); };
    $('#aCam').onclick = () => Escaner.abrir(num => { aQ.value = num; lista(); const r = Datos.buscarAnimal(D.ani, num);
      if (r.length === 1) ir('animal', { id: r[0].id, volver: { q: '', todos: f.todos } }); else if (!r.length) toast('Leí ' + carTxt(num) + ': no está cargada, tocá Agregar'); });
    $$('#main [data-todos]').forEach(b => b.onclick = () => { f.todos = b.dataset.todos === '1'; $$('#main [data-todos]').forEach(x => x.classList.toggle('act', x === b)); lista(); });
    lista();
    if (!f.q) setTimeout(() => aQ.focus(), 100);
  };
  function fichaAnimal(a) {
    const ed = !!a.id;
    hoja(`<h2>🏷️ ${ed ? 'Datos del animal' : 'Nuevo animal'}</h2>
      <label class="l" for="fCar">Número de caravana</label><div class="dictado"><input class="in" id="fCar" inputmode="numeric" value="${esc(a.caravana || '')}" style="font-weight:700;font-size:18px;letter-spacing:1px"><button class="mic" id="fCarCam" style="background:var(--verde2)" aria-label="Leer con la cámara">📷</button></div>
      <div class="fila2"><div><label class="l" for="fAcat">Categoría</label><select class="in" id="fAcat">${Datos.HACIENDA.map(c => `<option value="${c}" ${c === (a.cat || 'terneros') ? 'selected' : ''}>${Datos.HAC_TXT[c]}</option>`).join('')}</select></div>
        <div><label class="l" for="fSexo">Sexo</label><select class="in" id="fSexo"><option value="H" ${a.sexo === 'H' ? 'selected' : ''}>Hembra</option><option value="M" ${a.sexo === 'M' ? 'selected' : ''}>Macho</option></select></div></div>
      <div class="fila2"><div><label class="l" for="fNac">Nacimiento (aprox.)</label><input class="in" type="date" id="fNac" value="${a.nac || ''}"></div>
        <div><label class="l" for="fOri">Origen</label><select class="in" id="fOri">${['Nacido en el campo', 'Comprado'].map(o => `<option ${o === a.origen ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div>
      <div class="fila2"><div><label class="l" for="fApo">Apodo / señas (opcional)</label><input class="in" id="fApo" value="${esc(a.apodo || '')}" placeholder="Ej: la overa"></div><div><label class="l" for="fMadre">Madre (caravana, opcional)</label><input class="in" id="fMadre" inputmode="numeric" value="${esc(a.madre || '')}"></div></div>
      ${!ed ? `<label class="l" for="fPeso">Peso de hoy en kg (opcional)</label><input class="in" id="fPeso" inputmode="decimal">` : ''}
      <label class="l" for="fNotas">Notas (opcional)</label><input class="in" id="fNotas" value="${esc(a.notas || '')}">
      <div class="error" id="fAErr"></div><div class="botones"><button class="btn" id="fAOk">Guardar</button><button class="btn lin" id="fANo">Cancelar</button></div>
      ${ed ? '<div class="botones"><button class="btn lin" id="fABorrar">🗑 Borrar la ficha</button></div>' : ''}`);
    $('#fANo').onclick = cerrarHoja;
    $('#fAcat').onchange = () => { const c = $('#fAcat').value; if (['vacas', 'vaquillonas', 'terneras'].includes(c)) $('#fSexo').value = 'H'; else $('#fSexo').value = 'M'; };
    if (!ed) $('#fAcat').onchange();
    $('#fCarCam').onclick = () => Escaner.abrir(num => { $('#fCar').value = num; });
    $('#fAOk').onclick = async () => {
      const car = Datos.normCar($('#fCar').value);
      if (car.length < 3) return $('#fAErr').textContent = 'Escribí el número de la caravana';
      const otro = D.ani.find(x => Datos.normCar(x.caravana) === car && x.id !== a.id);
      if (otro) return $('#fAErr').innerHTML = 'Esa caravana ya está cargada' + (otro.apodo ? ' (' + esc(otro.apodo) + ')' : '') + '. <a id="fAVer" style="color:var(--verde2)">Ver la ficha</a>', $('#fAVer').onclick = () => { cerrarHoja(); ir('animal', { id: otro.id }); };
      const r = { ...a, caravana: car, cat: $('#fAcat').value, sexo: $('#fSexo').value, nac: $('#fNac').value, origen: $('#fOri').value, apodo: $('#fApo').value.trim(), madre: (m => { const r = m ? Datos.buscarAnimal(D.ani, m) : []; return r.length === 1 ? Datos.normCar(r[0].caravana) : m; })(Datos.normCar($('#fMadre').value)), notas: $('#fNotas').value.trim(), estado: a.estado || 'activo', ev: a.ev || [] };
      if (!ed) { r.ev = [{ fecha: hoy(), tipo: 'ALTA', txt: r.origen }]; const kg = leer($('#fPeso').value); if (kg > 0) r.ev.push({ fecha: hoy(), tipo: 'PESO', kg }); }
      await Datos.guardar('ani', r); cerrarHoja(); toast(ed ? 'Guardado ✓' : 'Caravana ' + carTxt(car) + ' agregada ✓'); ir('animal', { id: r.id });
    };
    if ($('#fABorrar')) $('#fABorrar').onclick = async () => { if (!confirm('¿Borrar la ficha de este animal? (no cambia los números de la hacienda)')) return; await Datos.borrar('ani', a.id); cerrarHoja(); ir('animales'); };
  }
  PANTALLAS.animal = function (arg) {
    const a = D.ani.find(x => x.id === arg.id); if (!a) return ir('animales');
    $('#titulo').textContent = '🏷️ ' + carCorta(a.caravana); volverBtn('animales', '‹ Animales');
    $('#volver').onclick = () => ir('animales', arg.volver);
    const p = Datos.pesos(a), ev = [...(a.ev || [])].sort((x, y) => y.fecha > x.fecha ? 1 : -1);
    const mm = a.madre ? Datos.buscarAnimal(D.ani, a.madre) : [], madre = mm.length === 1 ? mm[0] : null;
    const hijos = D.ani.filter(x => x.madre && x.id !== a.id && Datos.normCar(a.caravana).endsWith(Datos.normCar(x.madre)));
    let graf = '';
    if (p.lista.length > 1) {   // mini gráfico de peso
      const W = 320, H = 90, xs = p.lista.map(e => new Date(e.fecha).getTime()), ys = p.lista.map(e => e.kg), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) * 0.95, y1 = Math.max(...ys) * 1.02;
      const pt = (e, i) => [10 + (W - 20) * (xs[i] - x0) / (x1 - x0 || 1), H - 14 - (H - 26) * (e.kg - y0) / (y1 - y0 || 1)];
      graf = `<svg class="graf" viewBox="0 0 ${W} ${H}"><polyline points="${p.lista.map((e, i) => pt(e, i).join(',')).join(' ')}" fill="none" stroke="#2f7a3b" stroke-width="2.5"/>${p.lista.map((e, i) => { const [x, y] = pt(e, i); return `<circle cx="${x}" cy="${y}" r="3.5" fill="#2f7a3b"/><text x="${x}" y="${y - 7}" font-size="9" text-anchor="middle" fill="#333">${fmt(e.kg)}</text>`; }).join('')}</svg>`;
    }
    $('#main').innerHTML = `<div class="card"><div style="font-size:24px;font-weight:700;letter-spacing:1px;text-align:center">${esc(carTxt(a.caravana))}</div>
        <div style="text-align:center" class="gris">${a.sexo === 'H' ? '🐄' : '🐂'} ${esc(Datos.HAC_TXT[a.cat] || '')} · ${SEXO[a.sexo] || ''}${a.nac ? ' · ' + Datos.edad(a.nac, hoy()) : ''}${a.apodo ? ' · ' + esc(a.apodo) : ''}</div>
        ${!vivo(a) ? `<div class="aviso rojo" style="margin-top:10px;cursor:default"><span class="e">${a.estado === 'vendido' ? '💰' : '✝️'}</span><span>${a.estado === 'vendido' ? 'Vendido' : 'Murió'} el ${dmy(a.baja)}</span></div>` : ''}
        <div class="kpis" style="margin-top:10px"><div class="kpi"><small>Último peso</small><b>${p.ultimo ? fmt(p.ultimo.kg) + ' kg' : '—'}</b><small>${p.ultimo ? dm(p.ultimo.fecha) : ''}</small></div>
          <div class="kpi i"><small>Aumento diario</small><b>${p.adpv != null ? fmt(p.adpv, 3).replace(/0+$/, '').replace(/,$/, '') + ' kg' : '—'}</b></div><div class="kpi"><small>Origen</small><b style="font-size:14px;white-space:normal">${esc(a.origen || '—')}</b></div></div>
        ${graf}
        ${a.madre ? `<div class="chico" style="margin-top:8px">Madre: ${madre ? `<a data-ir-ani="${madre.id}" style="color:var(--verde2);font-weight:700">${esc(carTxt(madre.caravana))}</a>` : esc(carTxt(a.madre))}</div>` : ''}
        ${hijos.length ? `<div class="chico" style="margin-top:4px">Crías: ${hijos.map(h => `<a data-ir-ani="${h.id}" style="color:var(--verde2);font-weight:700">${esc(carCorta(h.caravana))}</a>`).join(' · ')}</div>` : ''}
        ${a.notas ? `<div class="chico gris" style="margin-top:6px">📝 ${esc(a.notas)}</div>` : ''}
        <div class="botones"><button class="btn sec" id="anEd">✏️ Datos</button></div></div>
      ${vivo(a) ? `<div class="acc" style="margin-bottom:12px"><button data-ev="PESO"><span class="e">⚖️</span>Pesada</button><button data-ev="VACUNA"><span class="e">💉</span>Vacuna / remedio</button><button data-ev="NOTA"><span class="e">📝</span>Nota</button>
        ${a.sexo === 'H' ? '<button data-ev="SERV"><span class="e">🐂</span>Servicio / preñez</button>' : ''}<button data-ev="VENTA"><span class="e">💰</span>Vendido</button><button data-ev="MUERTE"><span class="e">✝️</span>Murió</button></div>` : ''}
      <div class="card"><h2>📜 Historia</h2>${ev.map((e, i) => `<div class="mov" data-evi="${(a.ev || []).indexOf(e)}"><span class="e">${(EV[e.tipo] || ['📝'])[0]}</span><span class="t"><b>${e.tipo === 'PESO' ? fmt(e.kg) + ' kg' : esc(e.txt || (EV[e.tipo] || ['', ''])[1])}</b><small>${dmy(e.fecha)} · ${(EV[e.tipo] || ['', 'Nota'])[1]}${e.tipo === 'PESO' && e.txt ? ' · ' + esc(e.txt) : ''}</small></span></div>`).join('') || '<div class="vacio">Sin datos todavía</div>'}</div>`;
    $('#anEd').onclick = () => fichaAnimal(a);
    $$('#main [data-ir-ani]').forEach(x => x.onclick = () => ir('animal', { id: x.dataset.irAni }));
    $$('#main [data-ev]').forEach(b => b.onclick = () => eventoAnimal(a, { tipo: b.dataset.ev }));
    $$('#main [data-evi]').forEach(b => b.onclick = () => { const i = +b.dataset.evi; if (a.ev[i].tipo !== 'ALTA') eventoAnimal(a, a.ev[i], i); });
  };
  function eventoAnimal(a, e, idx) {
    const ed = idx != null, t = e.tipo;
    const tit = { PESO: '⚖️ Pesada', VACUNA: '💉 Vacuna o remedio', SERV: '🐂 Servicio / preñez', NOTA: '📝 Nota', VENTA: '💰 Se vendió', MUERTE: '✝️ Murió' }[t];
    const sugs = { VACUNA: Datos.VACUNAS.filter(v => v !== 'Otra').concat(['Antibiótico', 'Curabichera']), SERV: ['Entoró', 'Inseminada', 'Preñada (tacto)', 'Vacía (tacto)', 'Parió'], MUERTE: ['Víbora', 'Empaste', 'Parto', 'Enfermedad', 'Accidente', 'No se sabe'], VENTA: ['Remate', 'Frigorífico', 'Particular'] }[t] || [];
    hoja(`<h2>${tit}</h2><div class="gris chico">Caravana ${esc(carTxt(a.caravana))}</div>
      ${t === 'PESO' ? `<label class="l" for="eKg">Kilos</label><input class="in monto" id="eKg" inputmode="decimal" value="${e.kg ? fmt(e.kg) : ''}">` : ''}
      ${sugs.length ? `<label class="l">${t === 'MUERTE' ? 'Causa' : t === 'VENTA' ? 'Dónde' : 'Qué'}</label><div class="chips">${sugs.map(s => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
      <label class="l" for="eTxt">${t === 'PESO' ? 'Detalle (opcional)' : 'Detalle'}</label><input class="in" id="eTxt" value="${esc(e.txt || '')}">
      <label class="l" for="eFecha">Fecha</label><input class="in" type="date" id="eFecha" value="${e.fecha || hoy()}">
      ${t === 'MUERTE' && !ed ? `<label class="check"><input type="checkbox" id="eHac" checked> Descontar 1 ${esc((Datos.HAC_TXT[a.cat] || '').toLowerCase().replace(/s$/, ''))} de la hacienda</label>` : ''}
      ${t === 'VENTA' && !ed ? '<div class="ayudita">La plata de la venta se carga en "Cargar venta" (ahí se descuenta de la hacienda).</div>' : ''}
      <div class="error" id="eErr"></div><div class="botones"><button class="btn" id="eOk">Guardar</button>${ed ? '<button class="btn lin" id="eBorrar">🗑 Borrar</button>' : '<button class="btn lin" id="eNo">Cancelar</button>'}</div>`);
    $$('#hoja [data-s]').forEach(b => b.onclick = () => { $('#eTxt').value = b.dataset.s; $$('#hoja [data-s]').forEach(x => x.classList.toggle('act', x === b)); });
    if ($('#eNo')) $('#eNo').onclick = cerrarHoja;
    if (t === 'PESO') setTimeout(() => $('#eKg').focus(), 60);
    $('#eOk').onclick = async () => {
      const r = { fecha: $('#eFecha').value || hoy(), tipo: t, txt: $('#eTxt').value.trim() };
      if (t === 'PESO') { r.kg = leer($('#eKg').value); if (!(r.kg > 0) || r.kg > 2000) return $('#eErr').textContent = 'Escribí los kilos'; }
      else if (!r.txt && t !== 'VENTA') return $('#eErr').textContent = 'Escribí o elegí qué';
      const ev = [...(a.ev || [])]; if (ed) ev[idx] = r; else ev.push(r);
      const n = { ...a, ev };
      if (t === 'VENTA' || t === 'MUERTE') { n.estado = t === 'VENTA' ? 'vendido' : 'muerto'; n.baja = r.fecha; }
      await Datos.guardar('ani', n);
      if (t === 'MUERTE' && !ed && $('#eHac') && $('#eHac').checked && a.cat) await Datos.guardar('hac', { fecha: r.fecha, tipo: 'MUERTE', cat: a.cat, cant: 1, detalle: 'Caravana ' + carCorta(a.caravana) + (r.txt ? ' · ' + r.txt : '') });
      cerrarHoja(); toast('Guardado ✓'); ir('animal', { id: a.id });
    };
    if ($('#eBorrar')) $('#eBorrar').onclick = async () => { if (!confirm('¿Borrar?')) return; const ev = [...a.ev]; ev.splice(idx, 1); const n = { ...a, ev };
      if (t === 'VENTA' || t === 'MUERTE') { n.estado = 'activo'; n.baja = ''; } await Datos.guardar('ani', n); cerrarHoja(); ir('animal', { id: a.id }); };
  }

  /* ================================================================ VACUNAS Y SANIDAD */
  PANTALLAS.sanidad = function () {
    const prox = Datos.proximasVacunas(D.san, hoy(), 60), l = [...D.san].sort((a, b) => b.fecha > a.fecha ? 1 : -1);
    $('#main').innerHTML = `<div class="botones" style="margin:0 0 12px"><button class="btn" id="sNueva">💉 Anotar vacunación</button></div>
      ${prox.length ? `<div class="card"><h2>⏰ Lo que toca</h2>${prox.map(v => `<div class="aviso ${v.dias < 0 ? 'rojo' : ''}" data-rep="${v.id}"><span class="e">💉</span><span><b>${esc(v.producto)}</b>${v.cat ? ' · ' + esc(Datos.HAC_TXT[v.cat]) : ''}<br>${v.dias < 0 ? 'Se pasó hace ' + -v.dias + ' días' : v.dias === 0 ? 'Toca hoy' : 'En ' + v.dias + ' días'} (${dmy(v.proxima)}) · tocá para anotarla</span></div>`).join('')}</div>` : ''}
      <div class="card"><h2>📜 Lo que se aplicó</h2>${l.map(s => `<div class="mov" data-sid="${s.id}"><span class="e">💉</span><span class="t"><b>${esc(s.producto)}${s.cabezas ? ' · ' + fmt(s.cabezas) + ' cab.' : ''}</b><small>${dmy(s.fecha)}${s.cat ? ' · ' + esc(Datos.HAC_TXT[s.cat]) : ' · todo el rodeo'}${s.proxima ? ' · próxima ' + dmy(s.proxima) : ''}${s.detalle ? ' · ' + esc(s.detalle) : ''}</small></span>${s.costo ? `<span class="v g">${corta(s.costo)}</span>` : ''}</div>`).join('') || '<div class="vacio">Anotá cada vacunación (aftosa, brucelosis, carbunclo…) y el programa te avisa cuándo toca la próxima.</div>'}</div>
      <div class="ayudita">Recordá: las fechas de aftosa y brucelosis las fija SENASA / la fundación de tu zona. Acá las anotás para que no se pasen.</div>`;
    $('#sNueva').onclick = () => vacuna({});
    $$('#main [data-rep]').forEach(b => b.onclick = () => { const s = D.san.find(x => x.id === b.dataset.rep); vacuna({ producto: s.producto, cat: s.cat, cabezas: s.cabezas }); });
    $$('#main [data-sid]').forEach(b => b.onclick = () => vacuna(D.san.find(x => x.id === b.dataset.sid)));
  };
  function vacuna(s) {
    const ed = !!s.id, e = Datos.existencias(D.hac), mov = ed && s.mov ? D.movs.find(m => m.id === s.mov) : null;
    const otra = s.producto && !Datos.VACUNAS.includes(s.producto);
    hoja(`<h2>💉 ${ed ? 'Vacunación' : 'Anotar vacunación'}</h2>
      <label class="l">Qué se aplicó</label><div class="chips">${Datos.VACUNAS.map(v => `<button class="chip ${(v === s.producto || (v === 'Otra' && otra)) ? 'act' : ''}" data-v="${v}">${v}</button>`).join('')}</div>
      <input class="in" id="vOtra" placeholder="¿Cuál?" value="${otra ? esc(s.producto) : ''}" style="margin-top:8px" ${otra ? '' : 'hidden'}>
      <div class="fila2"><div><label class="l" for="vCat">A qué animales</label><select class="in" id="vCat"><option value="">Todo el rodeo</option>${Datos.HACIENDA.map(c => `<option value="${c}" ${c === s.cat ? 'selected' : ''}>${Datos.HAC_TXT[c]}</option>`).join('')}</select></div>
        <div><label class="l" for="vCab">Cabezas</label><input class="in" id="vCab" inputmode="numeric" value="${s.cabezas || (e.total || '')}"></div></div>
      <div class="fila2"><div><label class="l" for="vFecha">Fecha</label><input class="in" type="date" id="vFecha" value="${s.fecha || hoy()}"></div>
        <div><label class="l" for="vCosto">Costo $ (opcional)</label><input class="in" id="vCosto" inputmode="decimal" value="${s.costo ? fmt(s.costo) : ''}"></div></div>
      <label class="l" for="vProx">Próxima dosis</label><div class="chips" style="margin-bottom:6px">${[['', 'No'], [21, '21 días'], [182, '6 meses'], [365, '1 año']].map(([d, t]) => `<button class="chip" data-d="${d}">${t}</button>`).join('')}</div>
      <input class="in" type="date" id="vProx" value="${s.proxima || ''}">
      <label class="l" for="vDet">Detalle (opcional)</label><input class="in" id="vDet" value="${esc(s.detalle || '')}" placeholder="Ej: vacunador de la fundación, 2da dosis">
      ${!ed ? '<div class="ayudita">Si ponés el costo, se carga solo como gasto en "Vacunas".</div>' : mov ? '<div class="ayudita">El costo está cargado como gasto en Vacunas.</div>' : ''}
      <div class="error" id="vErr"></div><div class="botones"><button class="btn" id="vOk">Guardar</button>${ed ? '<button class="btn lin" id="vBorrar">🗑 Borrar</button>' : '<button class="btn lin" id="vNo">Cancelar</button>'}</div>`);
    let prod = s.producto || '';
    $$('#hoja [data-v]').forEach(b => b.onclick = () => { prod = b.dataset.v; $$('#hoja [data-v]').forEach(x => x.classList.toggle('act', x === b)); $('#vOtra').hidden = prod !== 'Otra'; if (prod === 'Otra') $('#vOtra').focus(); });
    $('#vCat').onchange = () => { const c = $('#vCat').value; $('#vCab').value = c ? e[c] : e.total; };
    $$('#hoja [data-d]').forEach(b => b.onclick = () => { $('#vProx').value = b.dataset.d ? Datos.sumarDias($('#vFecha').value || hoy(), +b.dataset.d) : ''; });
    if ($('#vNo')) $('#vNo').onclick = cerrarHoja;
    $('#vOk').onclick = async () => {
      const producto = prod === 'Otra' ? $('#vOtra').value.trim() : prod;
      if (!producto) return $('#vErr').textContent = 'Elegí qué se aplicó';
      const costo = leer($('#vCosto').value) || 0, fecha = $('#vFecha').value || hoy();
      const reg = { ...s, producto, cat: $('#vCat').value, cabezas: leer($('#vCab').value) || 0, fecha, proxima: $('#vProx').value, costo, detalle: $('#vDet').value.trim() };
      await Datos.guardar('san', reg);
      // el costo como gasto en Vacunas (y se mantiene igual si se modifica)
      let g = reg.mov ? D.movs.find(m => m.id === reg.mov) : null;
      if (costo > 0) {
        g = Object.assign(g || { tipo: 'G', cat: 'vacunas', medio: 'Efectivo', pendiente: false }, { monto: costo, fecha, detalle: producto + (reg.cabezas ? ' · ' + fmt(reg.cabezas) + ' cab.' : ''), cant: reg.cabezas || 0, unidad: reg.cabezas ? 'dosis' : '', san: reg.id });
        await Datos.guardar('movs', g); if (reg.mov !== g.id) { reg.mov = g.id; await Datos.guardar('san', reg); }
      } else if (g) { await Datos.borrar('movs', g.id); reg.mov = ''; await Datos.guardar('san', reg); }
      cerrarHoja(); toast('Vacunación anotada ✓'); ir('sanidad');
    };
    if ($('#vBorrar')) $('#vBorrar').onclick = async () => { if (!confirm('¿Borrar esta vacunación' + (s.mov ? ' (y su gasto)' : '') + '?')) return; if (s.mov) await Datos.borrar('movs', s.mov); await Datos.borrar('san', s.id); cerrarHoja(); ir('sanidad'); };
  }

  /* ================================================================ PEONES */
  const FREC = { mes: 'por mes', quincena: 'por quincena', semana: 'por semana', dia: 'por día' };
  PANTALLAS.peones = function () {
    const ini = hoy().slice(0, 8) + '01', fin = hoy();
    const act = D.peo.filter(p => p.activo !== false), ina = D.peo.filter(p => p.activo === false);
    const card = p => { const pag = Datos.pagadoPeon(D.movs, p.id, ini, fin);
      return `<div class="mov" data-pid="${p.id}"><span class="e">👷</span><span class="t"><b>${esc(p.nombre)}</b><small>${p.sueldo ? plata(p.sueldo) + ' ' + (FREC[p.frec] || '') : 'sin sueldo fijo'}${p.tel ? ' · ' + esc(p.tel) : ''}</small></span><span class="v ${pag ? 'g' : ''}" style="font-size:13px">${pag ? 'Este mes<br>' + corta(pag) : '<span class="gris">nada este mes</span>'}</span></div>`; };
    $('#main').innerHTML = `<div class="botones" style="margin:0 0 12px"><button class="btn" id="pNuevo">＋ Agregar peón</button></div>
      <div class="card"><h2>👷 Peones</h2>${act.map(card).join('') || '<div class="vacio">Agregá a la gente que trabaja en el campo para llevar lo que se le paga (sueldo, adelantos, aguinaldo).</div>'}</div>
      ${ina.length ? `<div class="card"><h2 class="gris">Ya no trabajan</h2>${ina.map(card).join('')}</div>` : ''}`;
    $('#pNuevo').onclick = () => fichaPeon({});
    $$('#main [data-pid]').forEach(b => b.onclick = () => ir('peon', { id: b.dataset.pid }));
  };
  PANTALLAS.peon = function (arg) {
    const p = D.peo.find(x => x.id === arg.id); if (!p) return ir('peones');
    $('#titulo').textContent = p.nombre; volverBtn('peones', '‹ Peones');
    const pagos = D.movs.filter(m => m.peon === p.id).sort((a, b) => b.fecha > a.fecha ? 1 : -1);
    const ini = hoy().slice(0, 8) + '01', anio = hoy().slice(0, 4) + '-01-01';
    $('#main').innerHTML = `<div class="card"><h2>👷 ${esc(p.nombre)} <small><a id="pEd" style="color:var(--verde2)">modificar</a></small></h2>
        <div class="kpis"><div class="kpi"><small>Sueldo</small><b>${p.sueldo ? corta(p.sueldo) : '—'}</b><small>${FREC[p.frec] || ''}</small></div><div class="kpi g"><small>Este mes</small><b>${corta(Datos.pagadoPeon(D.movs, p.id, ini, hoy()))}</b></div><div class="kpi g"><small>Este año</small><b>${corta(Datos.pagadoPeon(D.movs, p.id, anio, hoy()))}</b></div></div>
        ${p.tel ? `<div class="botones"><a class="btn sec" href="https://wa.me/${esc(p.tel.replace(/\D/g, '').replace(/^0/, '54'))}" target="_blank" rel="noopener">WhatsApp</a><a class="btn sec" href="tel:${esc(p.tel)}">Llamar</a></div>` : ''}
        <div class="botones"><button class="btn rojo" data-c="Sueldo">💵 Pagar sueldo</button><button class="btn tierra" data-c="Adelanto">Adelanto</button></div></div>
      <div class="card"><h2>📜 Pagos</h2>${pagos.map(movHtml).join('') || '<div class="vacio">Todavía no hay pagos</div>'}</div>`;
    $('#pEd').onclick = () => fichaPeon(p);
    $$('#main [data-c]').forEach(b => b.onclick = () => ir('cargar', { tipo: 'G', cat: 'peones', peon: p.id, concepto: b.dataset.c, volver: 'peon', volverArg: { id: p.id } }));
    $$('#main .mov').forEach(b => b.onclick = () => ir('cargar', { mov: D.movs.find(m => m.id === b.dataset.id), volver: 'peon', volverArg: { id: p.id } }));
  };
  function fichaPeon(p) {
    const ed = !!p.id;
    hoja(`<h2>👷 ${ed ? 'Modificar peón' : 'Nuevo peón'}</h2>
      <label class="l" for="pNom">Nombre</label><input class="in" id="pNom" value="${esc(p.nombre || '')}" autocomplete="off">
      <div class="fila2"><div><label class="l" for="pSue">Sueldo</label><input class="in" id="pSue" inputmode="decimal" value="${p.sueldo ? fmt(p.sueldo) : ''}"></div>
        <div><label class="l" for="pFrec">Cada</label><select class="in" id="pFrec">${Object.entries(FREC).map(([k, t]) => `<option value="${k}" ${k === (p.frec || 'mes') ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
      <label class="l" for="pTel">Teléfono (opcional)</label><input class="in" id="pTel" inputmode="tel" value="${esc(p.tel || '')}">
      ${ed ? `<label class="check"><input type="checkbox" id="pAct" ${p.activo !== false ? 'checked' : ''}> Trabaja actualmente</label>` : ''}
      <div class="error" id="pErr"></div><div class="botones"><button class="btn" id="pOk">Guardar</button><button class="btn lin" id="pNo">Cancelar</button></div>`);
    $('#pNo').onclick = cerrarHoja;
    $('#pOk').onclick = async () => {
      const nombre = $('#pNom').value.trim(); if (!nombre) return $('#pErr').textContent = 'Escribí el nombre';
      const r = await Datos.guardar('peo', { ...p, nombre, sueldo: leer($('#pSue').value) || 0, frec: $('#pFrec').value, tel: $('#pTel').value.trim(), activo: $('#pAct') ? $('#pAct').checked : true });
      cerrarHoja(); toast('Guardado ✓'); ir(ed ? 'peon' : 'peones', ed ? { id: r.id } : null);
    };
    setTimeout(() => $('#pNom').focus(), 50);
  }

  /* ================================================================ A PAGAR / A COBRAR */
  PANTALLAS.pendientes = function () {
    const l = Datos.pendientes(D.movs, hoy()), ap = l.filter(m => m.tipo === 'G'), ac = l.filter(m => m.tipo === 'I');
    const fila = m => `<div class="mov" data-id="${m.id}"><span class="e">${Datos.cat(m.tipo, m.cat).ic}</span><span class="t"><b>${esc(m.detalle || Datos.cat(m.tipo, m.cat).txt)}</b>
        <small style="${m.dias != null && m.dias < 0 ? 'color:var(--rojo);font-weight:700' : ''}">${m.vence ? (m.dias < 0 ? 'Venció hace ' + -m.dias + ' d' : m.dias === 0 ? 'Vence hoy' : 'Vence en ' + m.dias + ' d') + ' (' + dmy(m.vence) + ')' : 'sin fecha'}${m.quien ? ' · ' + esc(m.quien) : ''}${m.medio === 'Cheque' ? ' · cheque' : ''}</small></span>
        <span class="v ${m.tipo === 'I' ? 'i' : 'g'}">${plata(+m.monto)}<br><button class="chip act" data-listo="${m.id}" style="margin-top:4px;font-size:12px;padding:3px 10px">${m.tipo === 'I' ? 'Cobrado' : 'Pagado'} ✓</button></span></div>`;
    $('#main').innerHTML = `<div class="card"><h2>🧾 A pagar <small>${plata(ap.reduce((s, m) => s + +m.monto, 0))}</small></h2>${ap.map(fila).join('') || '<div class="vacio">Nada pendiente de pago</div>'}</div>
      <div class="card"><h2>💰 A cobrar <small>${plata(ac.reduce((s, m) => s + +m.monto, 0))}</small></h2>${ac.map(fila).join('') || '<div class="vacio">Nada pendiente de cobro</div>'}</div>
      <div class="ayudita">Al cargar un gasto o una venta, elegí "A pagar" / "A cobrar" con la fecha (cheques, cuenta corriente en el corralón o la veterinaria, venta a plazo).</div>`;
    $$('#main [data-listo]').forEach(b => b.onclick = async ev => { ev.stopPropagation(); const m = D.movs.find(x => x.id === b.dataset.listo);
      await Datos.guardar('movs', { ...m, pendiente: false, pagadoEl: hoy() }); toast(m.tipo === 'I' ? 'Marcado como cobrado ✓' : 'Marcado como pagado ✓'); ir('pendientes'); });
    $$('#main .mov').forEach(b => b.onclick = () => ir('cargar', { mov: D.movs.find(m => m.id === b.dataset.id), volver: 'pendientes' }));
  };

  /* ================================================================ INFORMES */
  PANTALLAS.informes = function () {
    const k = campActual(), r = Datos.resumen(D.movs, k.desde, k.hasta), meses = Datos.mesesDe(k.desde, k.hasta);
    const ha = +D.cfg.ha || 0, ventasHac = D.movs.filter(m => m.tipo === 'I' && m.cat === 'venta_hac' && m.fecha >= k.desde && m.fecha <= k.hasta);
    const cab = ventasHac.reduce((s, m) => s + (+m.cabezas || 0), 0), kg = ventasHac.reduce((s, m) => s + (+m.kilos || 0), 0), $hac = ventasHac.reduce((s, m) => s + +m.monto, 0);
    const lotes = (D.cfg.lotes || []).map(l => ({ ...l, ...(r.porLote[l.nombre] || { ing: 0, gas: 0 }) }));
    const e = Datos.existencias(D.hac, k.hasta);
    $('#main').innerHTML = `<div class="card">${periodoHtml(k)}
        <div class="kpis"><div class="kpi i"><small>Ingresos</small><b>${corta(r.ing)}</b></div><div class="kpi g"><small>Gastos</small><b>${corta(r.gas)}</b></div><div class="kpi r ${r.res < 0 ? 'neg' : ''}"><small>Resultado</small><b>${corta(r.res)}</b></div></div>
        ${ha ? `<div class="chico gris" style="margin-top:8px;text-align:center">Por hectárea (${fmt(ha)} ha): gastos ${plata(Math.round(r.gas / ha))} · resultado ${plata(Math.round(r.res / ha))}</div>` : ''}
        <div class="botones"><button class="btn sec" id="iWA">📤 Mandar resumen</button><button class="btn sec" id="iCSV">📥 Excel</button></div></div>
      <div class="card"><h2>💸 Gastos por rubro</h2><div class="barras">${barrasCat(r, 'G') || '<div class="vacio">Sin gastos</div>'}</div></div>
      <div class="card"><h2>💰 Ingresos</h2><div class="barras ing">${barrasCat(r, 'I') || '<div class="vacio">Sin ingresos</div>'}</div></div>
      ${ventasHac.length ? `<div class="card"><h2>🐂 Ventas de hacienda</h2><table class="tabla"><tr><td>Cabezas vendidas</td><td class="r"><b>${fmt(cab)}</b></td></tr><tr><td>Total</td><td class="r">${plata($hac)}</td></tr>
        ${cab ? `<tr><td>Promedio por cabeza</td><td class="r">${plata(Math.round($hac / cab))}</td></tr>` : ''}${kg ? `<tr><td>Kilos vendidos</td><td class="r">${fmt(kg)} kg</td></tr><tr><td>Precio promedio del kilo</td><td class="r">${plata(Math.round($hac / kg * 100) / 100)}</td></tr>` : ''}
        ${cab && kg ? `<tr><td>Peso promedio</td><td class="r">${fmt(Math.round(kg / cab))} kg</td></tr>` : ''}</table></div>` : ''}
      ${e.total ? `<div class="card"><h2>🐄 Costo por cabeza</h2><div class="chico gris" style="margin-bottom:6px">Gastos de la campaña ÷ cabezas al ${dmy(k.hasta < hoy() ? k.hasta : hoy())} (${fmt(e.total)})</div><div style="font-size:22px;font-weight:700">${plata(Math.round(r.gas / e.total))}</div></div>` : ''}
      ${lotes.length ? `<div class="card"><h2>🗺️ Por lote</h2><table class="tabla"><tr><th>Lote</th><th class="r">Gastos</th><th class="r">Ingresos</th><th class="r">Resultado</th></tr>
        ${lotes.map(l => `<tr><td>${esc(l.nombre)}${l.ha ? `<br><small class="gris">${fmt(l.ha)} ha${l.gas ? ' · ' + corta(l.gas / l.ha) + '/ha' : ''}</small>` : ''}</td><td class="r">${corta(l.gas)}</td><td class="r">${corta(l.ing)}</td><td class="r"><b>${corta(l.ing - l.gas)}</b></td></tr>`).join('')}</table></div>` : ''}
      <div class="card"><h2>📅 Mes por mes</h2><table class="tabla"><tr><th>Mes</th><th class="r">Ingresos</th><th class="r">Gastos</th><th class="r">Resultado</th></tr>
        ${meses.map(m => { const x = r.porMes[m] || { ing: 0, gas: 0 }; return `<tr><td>${Datos.MES3[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}</td><td class="r">${x.ing ? corta(x.ing) : '—'}</td><td class="r">${x.gas ? corta(x.gas) : '—'}</td><td class="r" style="color:${x.ing - x.gas < 0 ? 'var(--rojo)' : 'var(--verde2)'}">${x.ing || x.gas ? corta(x.ing - x.gas) : ''}</td></tr>`; }).join('')}
        <tr class="tot"><td>Total</td><td class="r">${corta(r.ing)}</td><td class="r">${corta(r.gas)}</td><td class="r">${corta(r.res)}</td></tr></table></div>`;
    periodoEventos(() => ir('informes'));
    $$('#main [data-cat]').forEach(b => b.onclick = () => ir('movs', { cat: b.dataset.cat, tipo: b.dataset.tipo, desde: k.desde, hasta: k.hasta }));
    $('#iWA').onclick = () => {
      const top = Object.entries(r.porCat).filter(([x]) => x.startsWith('G:')).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([x, v]) => '• ' + Datos.cat('G', x.slice(2)).txt + ': ' + plata(v)).join('\n');
      const t = `*${D.cfg.nombre || 'Mi Campo'} · Campaña ${k.nombre}*\nIngresos: ${plata(r.ing)}\nGastos: ${plata(r.gas)}\n*Resultado: ${plata(r.res)}*\n\nGastos principales:\n${top || '—'}${e.total ? '\n\nHacienda: ' + fmt(e.total) + ' cabezas' : ''}`;
      if (navigator.share) navigator.share({ text: t }).catch(() => {}); else open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    };
    $('#iCSV').onclick = () => {
      const filas = [['Fecha', 'Tipo', 'Rubro', 'Detalle', 'Proveedor/Comprador', 'Monto', 'Cantidad', 'Unidad', 'Cabezas', 'Kilos', 'Lote', 'Medio', 'Estado']];
      D.movs.filter(m => m.fecha >= k.desde && m.fecha <= k.hasta).sort((a, b) => a.fecha > b.fecha ? 1 : -1).forEach(m => filas.push([dmy(m.fecha), m.tipo === 'I' ? 'Ingreso' : 'Gasto', Datos.cat(m.tipo, m.cat).txt,
        m.detalle || '', m.quien || '', String(m.monto).replace('.', ','), m.cant || '', m.unidad || '', m.cabezas || '', m.kilos || '', m.lote || '', m.medio || '', m.pendiente ? (m.tipo === 'I' ? 'A cobrar' : 'A pagar') : '']));
      const csv = '﻿' + filas.map(f => f.map(x => /[;"\n]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : x).join(';')).join('\r\n');
      bajar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'MiCampo_' + k.nombre.replace('/', '-') + '.csv');
    };
  };
  async function bajar(blob, nombre) {
    const f = new File([blob], nombre, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: nombre }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ================================================================ CONFIGURACIÓN */
  PANTALLAS.config = function () {
    const c = D.cfg, venceLic = CampoLic.vence();
    $('#main').innerHTML = `<div class="card"><h2>🌾 El campo</h2>
        <label class="l" for="cNom">Nombre del campo</label><input class="in" id="cNom" value="${esc(c.nombre)}" placeholder="Ej: La Esperanza">
        <div class="fila2"><div><label class="l" for="cHa">Hectáreas</label><input class="in" id="cHa" inputmode="decimal" value="${c.ha ? fmt(c.ha) : ''}"></div>
          <div><label class="l" for="cIni">La campaña empieza en</label><select class="in" id="cIni">${Datos.MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === (c.campIni || 7) ? 'selected' : ''}>${m}${i === 0 ? ' (año calendario)' : ''}</option>`).join('')}</select></div></div>
        <div class="botones"><button class="btn" id="cOk">Guardar</button></div></div>
      <div class="card"><h2>🗺️ Lotes / potreros <small>opcional</small></h2><div class="ayudita" style="margin-top:0">Para saber cuánto gastás y ganás en cada lote (desmonte, siembra, pastura).</div>
        ${(c.lotes || []).map((l, i) => `<div class="mov" style="cursor:default"><span class="e">🗺️</span><span class="t"><b>${esc(l.nombre)}</b><small>${l.ha ? fmt(l.ha) + ' ha' : ''}</small></span><button class="chip" data-borlote="${i}">Sacar</button></div>`).join('')}
        <div class="fila2"><input class="in" id="lNom" placeholder="Nombre (ej. Lote 1)"><input class="in" id="lHa" placeholder="Hectáreas" inputmode="decimal"></div><div class="botones"><button class="btn sec" id="lOk">＋ Agregar lote</button></div></div>
      <div class="card"><h2>🏷️ Rubros propios</h2><div class="ayudita" style="margin-top:0">Si falta algún gasto o ingreso, agregalo acá (ej. "Inseminación", "Venta de cueros").</div>
        ${[...(c.extraG || []).map(x => ({ ...x, t: 'G' })), ...(c.extraI || []).map(x => ({ ...x, t: 'I' }))].map(x => `<div class="mov" style="cursor:default"><span class="e">${x.ic || '🏷️'}</span><span class="t"><b>${esc(x.txt)}</b><small>${x.t === 'I' ? 'ingreso' : 'gasto'}</small></span><button class="chip" data-borcat="${x.t}:${esc(x.id)}">Sacar</button></div>`).join('')}
        <div class="fila2"><input class="in" id="rNom" placeholder="Nombre del rubro"><select class="in" id="rTipo"><option value="G">Gasto</option><option value="I">Ingreso</option></select></div>
        <div class="botones"><button class="btn sec" id="rOk">＋ Agregar rubro</button></div></div>
      <div class="card"><h2>💾 Copia de seguridad</h2><div class="ayudita" style="margin-top:0">Los datos están guardados en este celular. Hacé una copia de vez en cuando y guardala en WhatsApp o en el Drive: si se rompe o cambiás el celular, la recuperás.</div>
        <div class="botones"><button class="btn" id="bCopia">📤 Hacer una copia</button><button class="btn lin" id="bRest">📥 Recuperar una copia</button></div><input type="file" id="bArch" accept=".json,application/json" hidden></div>
      <div class="card"><h2>🔑 Activación</h2><div class="chico">Código de este celular: <b>${esc(CampoLic.equipo())}</b><br>${venceLic ? 'Activada ' + (venceLic === '99991231' ? 'sin vencimiento' : 'hasta el ' + CampoLic.fechaTxt(venceLic)) : ''}</div></div>
      <div class="ayudita" style="text-align:center">Mi Campo v1.0 · RoFac</div>`;
    $('#cOk').onclick = async () => { await Datos.guardar('cfg', { ...D.cfg, nombre: $('#cNom').value.trim(), ha: leer($('#cHa').value) || '', campIni: +$('#cIni').value }); CAMP = null; toast('Guardado ✓'); ir('config'); };
    $('#lOk').onclick = async () => { const n = $('#lNom').value.trim(); if (!n) return toast('Escribí el nombre del lote'); if ((D.cfg.lotes || []).some(l => l.nombre === n)) return toast('Ya hay un lote con ese nombre');
      await Datos.guardar('cfg', { ...D.cfg, lotes: [...(D.cfg.lotes || []), { nombre: n, ha: leer($('#lHa').value) || 0 }] }); ir('config'); };
    $$('#main [data-borlote]').forEach(b => b.onclick = async () => { const l = [...D.cfg.lotes]; l.splice(+b.dataset.borlote, 1); await Datos.guardar('cfg', { ...D.cfg, lotes: l }); ir('config'); });
    $('#rOk').onclick = async () => { const n = $('#rNom').value.trim(), t = $('#rTipo').value; if (!n) return toast('Escribí el nombre del rubro');
      const k2 = t === 'I' ? 'extraI' : 'extraG'; await Datos.guardar('cfg', { ...D.cfg, [k2]: [...(D.cfg[k2] || []), { id: 'p_' + Datos.nuevoId(), txt: n, ic: '🏷️' }] }); toast('Rubro agregado ✓'); ir('config'); };
    $$('#main [data-borcat]').forEach(b => b.onclick = async () => { const [t, id] = b.dataset.borcat.split(':'), k2 = t === 'I' ? 'extraI' : 'extraG';
      if (D.movs.some(m => m.cat === id) && !confirm('Hay movimientos con este rubro: van a seguir apareciendo. ¿Sacarlo de la lista?')) return;
      await Datos.guardar('cfg', { ...D.cfg, [k2]: D.cfg[k2].filter(x => x.id !== id) }); ir('config'); });
    $('#bCopia').onclick = () => bajar(new Blob([JSON.stringify(Datos.copia())], { type: 'application/json' }), 'MiCampo_copia_' + hoy() + '.json');
    $('#bRest').onclick = () => $('#bArch').click();
    $('#bArch').onchange = async e => { const f = e.target.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); if (!confirm('¿Recuperar la copia del ' + dmy((j.fecha || '').slice(0, 10)) + '? Lo que hay ahora en el celular se reemplaza.')) return; await Datos.restaurar(j); toast('Copia recuperada ✓'); ir('inicio'); }
      catch (err) { toast(err.message.includes('Mi Campo') ? err.message : 'No se pudo leer ese archivo'); } };
  };

  /* ================================================================ arranque */
  async function arrancar() {
    await Datos.cargar();
    if (!(await CampoLic.revisar())) { $('#fab').hidden = true; CampoLic.pantalla(() => { $('#menuBtn').hidden = false; ir('inicio'); }); return; }
    const p = (location.hash || '').slice(1);
    ir(['movs', 'hacienda', 'animales', 'sanidad', 'peones', 'pendientes', 'informes', 'config'].includes(p) ? p : 'inicio');
    const d = CampoLic.dias(); if (d != null && d <= 15 && CampoLic.vence() !== '99991231') toast('La activación vence en ' + d + ' días: pedile la clave nueva a Rodrigo');
  }
  window.MiCampo = { ir, D };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  arrancar().catch(e => { $('#main').innerHTML = '<div class="vacio">No se pudo abrir: ' + esc(e.message) + '</div>'; });
})();
