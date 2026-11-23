/* Mi Campo · leer el número de la caravana con la cámara del celular.
   Se apunta al número impreso (la caravana visual), se toca "Leer" y se elige el número que encontró.
   Si el celular tiene lector de códigos de barras (Chrome en Android), también prueba con eso.
   La primera vez necesita internet para bajar el lector de números (unos 6 MB); después anda sin internet. */
'use strict';
(function () {
  /* ---------------------------------------------------------------- OCR en segundo plano */
  let w = null, n = 0; const esperan = {};
  function worker() {
    if (w) return w;
    w = new Worker('js/ocr-worker.js');
    w.onmessage = e => { const f = esperan[e.data.id]; if (f) { delete esperan[e.data.id]; e.data.error ? f.mal(new Error(e.data.error)) : f.ok(e.data.texto); } };
    w.onerror = () => { Object.values(esperan).forEach(f => f.mal(new Error('El lector de números falló'))); for (const k in esperan) delete esperan[k]; w = null; };
    return w;
  }
  function ocr(png, psm) {
    return png.arrayBuffer().then(buf => new Promise((ok, mal) => {
      const id = ++n, t = setTimeout(() => { delete esperan[id]; mal(new Error('Tardó demasiado')); }, 90000);
      esperan[id] = { ok: v => { clearTimeout(t); ok(v); }, mal: e => { clearTimeout(t); mal(e); } };
      worker().postMessage({ id, buf, psm }, [buf]);
    }));
  }
  /* recorte → gris con contraste (y al revés si los números son claros sobre fondo oscuro), de un alto cómodo para leer */
  function preparar(src, sx, sy, sw, sh, invertir, alto) {
    const esc = Math.min(3, (alto || 260) / sh, 1400 / sw), c = document.createElement('canvas');
    c.width = Math.round(sw * esc); c.height = Math.round(sh * esc);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    let min = 255, max = 0; const g = new Uint8ClampedArray(a.length / 4);
    for (let i = 0, j = 0; i < a.length; i += 4, j++) { const v = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]; g[j] = v; if (v < min) min = v; if (v > max) max = v; }
    let suma = 0; const r = max - min || 1;
    for (let j = 0; j < g.length; j++) { g[j] = (g[j] - min) * 255 / r; suma += g[j]; }
    const oscuro = suma / g.length < 110;
    for (let i = 0, j = 0; i < a.length; i += 4, j++) { let v = g[j]; if (oscuro !== !!invertir) v = 255 - v; a[i] = a[i + 1] = a[i + 2] = v; }
    x.putImageData(d, 0, 0);
    return new Promise(ok => c.toBlob(ok, 'image/png'));
  }
  /* del texto leído, los números posibles: cada grupo de 3 o más cifras y, por renglón, todo junto */
  function candidatos(texto) {
    const out = [];
    const add = s => { s = s.replace(/\D/g, ''); if (s === '032') return; if (s.length >= 3 && s.length <= 16 && !out.includes(s)) out.push(s); };
    String(texto || '').split(/\n+/).forEach(l => { const g = l.match(/\d+/g) || []; if (g.length > 1) add(g.join('')); g.forEach(add); });
    const todo = String(texto || '').replace(/\D/g, ''); if (todo.length >= 12 && todo.length <= 16) add(todo);      // el número completo (renglón chico + grande)
    return out.sort((a, b) => b.length - a.length).slice(0, 6);
  }
  const pasada = async (src, sx, sy, sw, sh, o) => ocr(await preparar(src, sx, sy, sw, sh, o.inv, o.alto), o.psm);
  /* varias pasadas con distinto tamaño y forma de leer; gana el número que más veces aparece (y el más largo) */
  const PASADAS = [{ alto: 140, psm: 6 }, { alto: 140, psm: 11 }, { alto: 220, psm: 11 }, { alto: 360, psm: 11 }, { alto: 100, psm: 11 }];
  async function leerImagen(src, sx, sy, sw, sh) {
    const votos = {};
    const sumar = (lista, peso) => lista.forEach((c, i) => { votos[c] = (votos[c] || 0) + peso - i * 0.01; });
    if ('BarcodeDetector' in window) {
      try { const bd = new BarcodeDetector(); const r = await bd.detect(src); r.forEach(b => /\d{3,}/.test(b.rawValue) && sumar(candidatos(b.rawValue), 5)); } catch (e) {}
    }
    for (const o of PASADAS) sumar(candidatos(await pasada(src, sx, sy, sw, sh, o)), 1);
    if (!Object.keys(votos).length) sumar(candidatos(await pasada(src, sx, sy, sw, sh, { alto: 220, psm: 11, inv: true })), 1);
    return Object.keys(votos).sort((a, b) => (votos[b] + b.length * 0.05) - (votos[a] + a.length * 0.05)).slice(0, 6);
  }

  /* ---------------------------------------------------------------- pantalla de la cámara */
  const css = document.createElement('style');
  css.textContent = `
  #esc { position: fixed; inset: 0; z-index: 70; background: #000; display: flex; flex-direction: column; color: #fff; }
  #esc .vid { position: relative; flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  #esc video, #esc .foto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  #esc .guia { position: absolute; left: 7%; right: 7%; top: 34%; height: 28%; border: 3px solid #f4c448; border-radius: 14px; box-shadow: 0 0 0 2000px rgba(0,0,0,.45); }
  #esc .guia span { position: absolute; top: -58px; left: 0; right: 0; text-align: center; font-size: 14px; text-shadow: 0 1px 3px #000; }
  #esc .pie { padding: 14px 14px calc(16px + env(safe-area-inset-bottom)); background: #111; }
  #esc .msj { text-align: center; min-height: 22px; font-size: 14px; margin-bottom: 10px; }
  #esc .cands { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 10px; }
  #esc .cands button { border: 0; background: #f4c448; color: #222; font-weight: 700; font-size: 20px; letter-spacing: 1px; border-radius: 12px; padding: 10px 14px; cursor: pointer; }
  #esc .cands button.primero { font-size: 30px; padding: 12px 26px; flex-basis: 100%; } #esc .cands button.otro { background: #3a3a3a; color: #f4c448; font-size: 16px; }
  #esc .bots { display: flex; gap: 8px; } #esc .bots button { flex: 1; border: 0; border-radius: 14px; padding: 14px 8px; font-size: 16px; font-weight: 700; cursor: pointer; }
  #esc .leer { background: #2f7a3b; color: #fff; font-size: 18px !important; } #esc .sec { background: #333; color: #fff; }
  #esc .x { position: absolute; top: calc(10px + env(safe-area-inset-top)); right: 10px; z-index: 2; width: 44px; height: 44px; border-radius: 50%; border: 0; background: rgba(0,0,0,.55); color: #fff; font-size: 20px; }
  #esc .giro { display: inline-block; width: 16px; height: 16px; border: 3px solid #fff; border-top-color: transparent; border-radius: 50%; animation: gira .8s linear infinite; vertical-align: -3px; margin-right: 6px; }
  @keyframes gira { to { transform: rotate(360deg); } }`;
  document.head.appendChild(css);

  let flujo = null;
  function cerrar() { if (flujo) { flujo.getTracks().forEach(t => t.stop()); flujo = null; } const e = document.getElementById('esc'); if (e) e.remove(); }
  /* abre la cámara; cuando se elige un número llama a listo(numero) */
  async function abrir(listo) {
    cerrar();
    const d = document.createElement('div'); d.id = 'esc';
    d.innerHTML = `<div class="vid"><video playsinline muted autoplay></video><img class="foto" hidden alt=""><div class="guia"><span>Poné el número de la caravana adentro del recuadro</span></div><button class="x" aria-label="Cerrar">✕</button></div>
      <div class="pie"><div class="msj"></div><div class="cands"></div>
      <div class="bots"><button class="leer">📸 Leer el número</button><button class="sec foto-btn">🖼️ Foto</button></div>
      <input type="file" accept="image/*" capture="environment" hidden></div>`;
    document.body.appendChild(d);
    const $ = s => d.querySelector(s), video = $('video'), msj = $('.msj'), cands = $('.cands'), img = $('.foto');
    $('.x').onclick = cerrar;
    const elegir = num => { cerrar(); listo(num); };
    const mostrar = (lista, de) => {
      const ver = c => c.length <= 8 ? c : c.replace(/(\d)(?=(\d{4})+$)/g, '$1 ');
      cands.innerHTML = lista.slice(0, 4).map((c, i) => `<button data-n="${c}" class="${i ? 'otro' : 'primero'}">${ver(c)}</button>`).join('');
      cands.querySelectorAll('[data-n]').forEach(b => b.onclick = () => elegir(b.dataset.n));
      msj.textContent = lista.length ? (lista.length === 1 ? 'Tocá el número si está bien' : 'Tocá el número correcto (el primero es el más probable)') : 'No encontré el número. Acercate, que haya buena luz y que la caravana esté limpia.' + (de === 'foto' ? '' : ' O probá con una foto.');
    };
    async function procesar(src, sx, sy, sw, sh, de) {
      msj.innerHTML = '<span class="giro"></span>Leyendo…' + (navigator.onLine === false && !localStorage.getItem('rofac_campo_ocr') ? ' (la primera vez necesita internet)' : '');
      cands.innerHTML = ''; $('.leer').disabled = true;
      try { let l = await leerImagen(src, sx, sy, sw, sh); if (!l.length && de === 'video') l = await leerImagen(src, 0, 0, src.width, src.height); try { localStorage.setItem('rofac_campo_ocr', '1'); } catch (e) {} mostrar(l, de); }
      catch (e) { msj.textContent = navigator.onLine === false ? 'La primera vez el lector de números necesita internet. Conectate y probá de nuevo.' : 'No se pudo leer: ' + e.message; }
      finally { $('.leer').disabled = false; }
    }
    // cámara en vivo
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = flujo; await video.play().catch(() => {});
      msj.textContent = 'Apuntá al número impreso de la caravana';
    } catch (e) {
      video.hidden = true; $('.leer').hidden = true; $('.foto-btn').textContent = '📸 Sacar foto'; $('.foto-btn').className = 'leer foto-btn';
      msj.textContent = 'Sacale una foto de cerca al número de la caravana';
    }
    $('.leer').onclick = () => {
      if (!video.videoWidth) return;
      // el recuadro en la imagen de la cámara (el video se ve "recortado" para llenar la pantalla)
      const vw = video.videoWidth, vh = video.videoHeight, cw = video.clientWidth, ch = video.clientHeight, s = Math.max(cw / vw, ch / vh);
      const ox = (vw * s - cw) / 2, oy = (vh * s - ch) / 2, g = $('.guia').getBoundingClientRect(), v = video.getBoundingClientRect();
      const sx = (g.left - v.left + ox) / s, sy = (g.top - v.top + oy) / s, sw = g.width / s, sh = g.height / s;
      const c = document.createElement('canvas'); c.width = vw; c.height = vh; c.getContext('2d').drawImage(video, 0, 0);
      procesar(c, Math.max(0, sx), Math.max(0, sy), Math.min(sw, vw - sx), Math.min(sh, vh - sy), 'video');
    };
    $('.foto-btn').onclick = () => $('input[type=file]').click();
    $('input[type=file]').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(f));
      img.src = URL.createObjectURL(f); img.hidden = false; video.hidden = true;
      // de la foto: la franja del medio (donde suele quedar el número) y, si no aparece, la foto entera
      const W = bmp.width, H = bmp.height;
      msj.innerHTML = '<span class="giro"></span>Leyendo…'; cands.innerHTML = '';
      try {
        let l = await leerImagen(bmp, 0, H * 0.2, W, H * 0.6);
        if (!l.length) l = await leerImagen(bmp, 0, 0, W, H);
        try { localStorage.setItem('rofac_campo_ocr', '1'); } catch (x) {}
        mostrar(l, 'foto');
      } catch (x) { msj.textContent = 'No se pudo leer: ' + x.message; }
      e.target.value = '';
    };
  }
  window.Escaner = { abrir, cerrar, candidatos, leerImagen, pasada };
})();
