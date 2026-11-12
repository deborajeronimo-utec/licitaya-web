// Cliente de las APIs de LicitaYa (api-empresas y workflow-licitaya)
const EMPRESAS = (import.meta.env.VITE_EMPRESAS_API || "").replace(/\/$/, "");
const WORKFLOW = (import.meta.env.VITE_WORKFLOW_API || "").replace(/\/$/, "");
export const FECHA_REFERENCIA = import.meta.env.VITE_FECHA_REFERENCIA || "";

async function request(base, path, { method = "GET", body } = {}) {
  if (!base) throw new Error("Falta configurar la URL del API (VITE_EMPRESAS_API / VITE_WORKFLOW_API).");
  const res = await fetch(base + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) {
    const err = new Error(data.error || `Error HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---- api-empresas
export const getEmpresa = (ruc) => request(EMPRESAS, `/empresas/${ruc}`);
export const crearEmpresa = (perfil) => request(EMPRESAS, "/empresas", { method: "POST", body: perfil });
export const actualizarEmpresa = (ruc, perfil) => request(EMPRESAS, `/empresas/${ruc}`, { method: "PUT", body: perfil });

// ---- workflow-licitaya
export const suscribir = (ruc, email) => request(WORKFLOW, "/suscripciones", { method: "POST", body: { ruc, email } });
export const listarAnalisis = (ruc) => request(WORKFLOW, `/analisis?ruc=${encodeURIComponent(ruc)}`);
export const obtenerAnalisis = (id) => request(WORKFLOW, `/analisis/${encodeURIComponent(id)}`);
export const listarOportunidades = (id) => request(WORKFLOW, `/analisis/${encodeURIComponent(id)}/oportunidades`);
export const urlCsv = (id) => request(WORKFLOW, `/analisis/${encodeURIComponent(id)}/csv`);

/** HU02 + HU03: crea el lote, sube cada .md con URL prefirmada e inicia el workflow. */
export async function analizarConvocatorias(ruc, files, onProgress = () => {}) {
  const lote = await request(WORKFLOW, "/lotes", {
    method: "POST",
    body: { ruc, archivos: files.map((f) => f.name) },
  });
  let n = 0;
  for (const a of lote.archivos) {
    const file = files.find((f) => f.name === a.archivo) || files[n];
    const put = await fetch(a.upload_url, {
      method: "PUT",
      headers: { "Content-Type": lote.content_type || "text/markdown" },
      body: file,
    });
    if (!put.ok) throw new Error(`No se pudo subir ${a.archivo} (HTTP ${put.status})`);
    onProgress(++n, lote.archivos.length);
  }
  const body = { ruc, lote_id: lote.lote_id };
  if (FECHA_REFERENCIA) body.fecha_referencia = FECHA_REFERENCIA;
  return request(WORKFLOW, "/analisis", { method: "POST", body });
}
