/* Lee números de una foto (OCR con Tesseract) en segundo plano, para que el celular no se trabe. */
importScripts('../lib/ocr/tesseract-core-lstm.wasm.js');
let listo = null;
function iniciar() {
  return listo = listo || (async () => {
    const M = await TesseractCore({ print: () => {}, printErr: () => {} });
    const r = await fetch('../lib/ocr/spa.traineddata'); if (!r.ok) throw new Error('falta el lector de números');
    M.FS.writeFile('spa.traineddata', new Uint8Array(await r.arrayBuffer()));
    const api = new M.TessBaseAPI(); if (api.Init(null, 'spa')) throw new Error('no arrancó el lector');
    api.SetVariable('tessedit_char_whitelist', '0123456789');      // en la caravana sólo interesan los números
    return { M, api };
  })().catch(e => { listo = null; throw e; });
}
onmessage = async e => {
  const { id, buf, psm } = e.data;
  try {
    const { M, api } = await iniciar();
    api.SetVariable('tessedit_pageseg_mode', String(psm || 6));
    M.FS.writeFile('/input', new Uint8Array(buf)); api.SetImageFile();
    const texto = api.GetUTF8Text(); api.Clear();
    postMessage({ id, texto });
  } catch (x) { postMessage({ id, error: String(x && x.message || x) }); }
};
