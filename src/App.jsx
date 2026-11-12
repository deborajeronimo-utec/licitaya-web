import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as api from "./api.js";

const RUBROS = ["Útiles de oficina", "Limpieza e higiene", "Mobiliario", "Equipos de cómputo", "Uniformes y textiles", "Alimentos", "Mantenimiento", "Seguridad y vigilancia"];
const RNP = ["Bienes", "Servicios", "Consultor de obras", "Ejecutor de obras"];
const REGIONES = ["Lima", "Callao", "Ica", "Arequipa", "La Libertad", "Piura", "Cusco", "Junín"];
const NAV = [["inicio", "🏠", "Inicio"], ["empresa", "🏢", "Mi empresa"], ["nuevo", "⬆️", "Nuevo análisis"], ["historial", "🕘", "Historial"]];
const MAX = 20;

const fmt = (n) => (n === undefined || n === null || n === "" ? "—" : "S/ " + Number(n).toLocaleString("es-PE"));
const fecha = (iso) => (iso ? new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—");

// almacenamiento local tolerante a fallos (solo guarda el RUC de la sesión)
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};

function useHashRoute() {
  const read = () => (window.location.hash.replace(/^#\/?/, "") || "inicio").split("/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
export const go = (path) => { window.location.hash = "/" + path; };

function Toast({ text }) {
  return <div className={"toast" + (text ? " show" : "")}>{text}</div>;
}

function Header({ title, subtitle, empresa }) {
  const initials = (empresa?.razon_social || "LY").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <>
      <div className="top">
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        <div className="who"><span>{empresa?.razon_social || "Sin empresa"}</span><div className="avatar">{initials}</div></div>
      </div>
      <div className="demo">Las recomendaciones son orientativas y no reemplazan la lectura de las bases oficiales del proceso.</div>
    </>
  );
}

const Loading = ({ text = "Cargando…" }) => <div className="loading"><span className="spinner" /> {text}</div>;
const Badge = ({ r }) => <span className={`badge b-${r}`}>{r}</span>;

// ------------------------------------------------------------------ INICIO
function Inicio({ empresa, ruc }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    if (!ruc) return setState({ loading: false });
    (async () => {
      try {
        const { analisis } = await api.listarAnalisis(ruc);
        const ultimo = analisis.find((a) => a.estado === "COMPLETADO");
        setState({ loading: false, ultimo, enProceso: analisis.find((a) => a.estado === "EN_PROCESO") });
      } catch (e) { setState({ loading: false, error: e.message }); }
    })();
  }, [ruc]);
  const u = state.ultimo;
  return (
    <>
      <Header title={empresa ? `Hola, ${empresa.razon_social}` : "Bienvenida a LicitaYa"} subtitle="Resumen de tu último análisis de oportunidades." empresa={empresa} />
      <div className="card hero">
        <h2>De 20 convocatorias a 3 decisiones en minutos</h2>
        <p>Sube las convocatorias que te interesan y LicitaYa las compara contra el perfil de tu empresa para decirte dónde postular.</p>
        <button className="btn pri" onClick={() => go(ruc ? "nuevo" : "empresa")}>{ruc ? "⬆️ Nuevo análisis" : "🏢 Registrar mi empresa"}</button>
      </div>
      {state.loading && <Loading />}
      {state.error && <div className="alert" style={{ marginTop: 16 }}>{state.error}</div>}
      {state.enProceso && <div className="ok-box" style={{ marginTop: 16 }}>⏳ Tienes un análisis en proceso: <button className="linkbtn" onClick={() => go("analisis/" + state.enProceso.analisis_id)}>{state.enProceso.analisis_id}</button></div>}
      {u && (
        <>
          <div className="grid g4" style={{ marginTop: 16 }}>
            <div className="card kpi"><div className="l">Convocatorias analizadas</div><div className="v">{u.total_convocatorias}</div><div className="s">{u.analisis_id}</div></div>
            <div className="card kpi ok"><div className="l">Para POSTULAR</div><div className="v">{u.total_postular}</div><div className="s">Afinidad ≥ 70, sin brechas</div></div>
            <div className="card kpi warn"><div className="l">Para EVALUAR</div><div className="v">{u.total_evaluar}</div><div className="s">Revisión humana</div></div>
            <div className="card kpi bad"><div className="l">DESCARTADAS</div><div className="v">{u.total_descartar}</div><div className="s">Con motivo registrado</div></div>
          </div>
          <div className="grid g3" style={{ marginTop: 16 }}>
            <div className="card"><h2>Tus mejores oportunidades</h2>
              {(u.top3 || []).length === 0 && <div className="obj">Esta vez no encontramos oportunidades para postular.</div>}
              {(u.top3 || []).map((t) => (
                <div key={t.convocatoria_key} className="file" style={{ cursor: "pointer" }} onClick={() => go("analisis/" + u.analisis_id)}>
                  <div><div className="ent">{t.entidad}</div><div className="obj">{t.objeto}</div></div>
                  <div style={{ textAlign: "right" }}><span className="badge b-POSTULAR">{t.afinidad} afinidad</span><div className="obj">cierra en {t.dias_para_cierre} días</div></div>
                </div>))}
              <div style={{ marginTop: 12 }}><button className="btn sec" onClick={() => go("analisis/" + u.analisis_id)}>Ver todas las convocatorias →</button></div>
            </div>
            <PerfilCard empresa={empresa} />
          </div>
        </>
      )}
      {!state.loading && !u && ruc && !state.enProceso && <div className="card empty" style={{ marginTop: 16 }}>Aún no tienes análisis. Sube tus primeras convocatorias.</div>}
    </>
  );
}

function PerfilCard({ empresa }) {
  if (!empresa) return null;
  return (
    <div className="card"><h2>Perfil de tu empresa</h2><div className="obj">RUC {empresa.ruc}</div>
      <div style={{ margin: "10px 0" }} className="chips">{(empresa.rubros || []).map((r) => <span key={r} className="chip on">{r}</span>)}</div>
      <div className="obj">Experiencia facturada: <b style={{ color: "var(--ink)" }}>{fmt(empresa.experiencia_facturada)}</b></div>
      <div className="obj" style={{ marginTop: 4 }}>Regiones: {(empresa.regiones || []).join(", ")}</div>
      <div style={{ marginTop: 14 }}><button className="btn sec" onClick={() => go("empresa")}>Editar perfil</button></div>
    </div>
  );
}

// ------------------------------------------------------------------ MI EMPRESA (HU01)
const VACIO = { ruc: "", razon_social: "", email: "", rubros: [], capitulos_rnp: [], experiencia_facturada: "", regiones: [], personal_clave: "", certificaciones: "" };

function Empresa({ empresa, ruc, onSaved, toast, onLogout }) {
  const [f, setF] = useState(empresa || VACIO);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [buscar, setBuscar] = useState("");
  useEffect(() => setF(empresa || VACIO), [empresa]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const chips = (k, opts) => opts.map((o) => <span key={o} className={"chip" + (f[k].includes(o) ? " on" : "")} onClick={() => toggle(k, o)}>{o}</span>);

  async function guardar() {
    setError("");
    if (!/^\d{11}$/.test(f.ruc)) return setError("El RUC debe tener 11 dígitos");
    setSaving(true);
    try {
      const perfil = { ...f, experiencia_facturada: Number(String(f.experiencia_facturada).replace(/,/g, "")) };
      const res = empresa ? await api.actualizarEmpresa(f.ruc, perfil) : await api.crearEmpresa(perfil);
      if (f.email && f.email !== empresa?.email) {
        try { await api.suscribir(f.ruc, f.email); toast("📧 Revisa tu correo y confirma la suscripción de AWS"); } catch { /* opcional */ }
      }
      onSaved(res.empresa);
      toast("✅ " + res.mensaje);
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function ingresar() {
    setError("");
    if (!/^\d{11}$/.test(buscar)) return setError("El RUC debe tener 11 dígitos");
    try { onSaved(await api.getEmpresa(buscar)); toast("Bienvenida de nuevo 👋"); }
    catch (e) { setError(e.status === 404 ? "No existe una empresa con ese RUC. Regístrala abajo." : e.message); setF({ ...VACIO, ruc: buscar }); }
  }

  return (
    <>
      <Header title="Mi empresa" subtitle="El agente compara cada convocatoria contra este perfil (HU01)." empresa={empresa} />
      {!ruc && (
        <div className="card" style={{ marginBottom: 16 }}><h2>¿Ya registraste tu empresa?</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input style={{ maxWidth: 260 }} placeholder="RUC de 11 dígitos" value={buscar} onChange={(e) => setBuscar(e.target.value.trim())} inputMode="numeric" maxLength={11} />
            <button className="btn sec" onClick={ingresar}>Ingresar</button>
          </div>
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      <div className="card"><div className="form">
        <div className="f"><label>RUC *</label><input value={f.ruc} onChange={set("ruc")} maxLength={11} inputMode="numeric" disabled={!!empresa} /></div>
        <div className="f"><label>Razón social *</label><input value={f.razon_social} onChange={set("razon_social")} /></div>
        <div className="f full"><label>Rubros en los que vende *</label><div className="chips">{chips("rubros", RUBROS)}</div></div>
        <div className="f full"><label>Capítulos del RNP vigentes</label><div className="chips">{chips("capitulos_rnp", RNP)}</div><span className="hint">Registro Nacional de Proveedores</span></div>
        <div className="f"><label>Experiencia facturada acumulada (S/) *</label><input value={f.experiencia_facturada} onChange={set("experiencia_facturada")} inputMode="numeric" /></div>
        <div className="f"><label>Correo para notificaciones</label><input type="email" value={f.email} onChange={set("email")} /><span className="hint">Te llegará un correo de AWS para confirmar la suscripción.</span></div>
        <div className="f full"><label>Regiones que atiende</label><div className="chips">{chips("regiones", REGIONES)}</div></div>
        <div className="f"><label>Personal clave</label><textarea rows={2} value={f.personal_clave} onChange={set("personal_clave")} /></div>
        <div className="f"><label>Certificaciones</label><textarea rows={2} value={f.certificaciones} onChange={set("certificaciones")} /></div>
      </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {ruc && <button className="btn sec" onClick={onLogout}>Cambiar de empresa</button>}
          <button className="btn pri" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar perfil"}</button>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ NUEVO ANÁLISIS (HU02, HU03)
function Nuevo({ empresa, ruc }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef(null);

  function agregar(list) {
    setError("");
    const nuevos = Array.from(list);
    const malos = nuevos.filter((f) => !f.name.toLowerCase().endsWith(".md"));
    if (malos.length) setError(`«${malos[0].name}»: solo se aceptan archivos .md`);
    const buenos = nuevos.filter((f) => f.name.toLowerCase().endsWith(".md"));
    const todos = [...files.filter((f) => !buenos.some((b) => b.name === f.name)), ...buenos];
    if (todos.length > MAX) { setError(`Máximo ${MAX} convocatorias por análisis`); return; }
    setFiles(todos);
  }

  async function lanzar() {
    setError("");
    try {
      setBusy("Subiendo convocatorias…");
      const res = await api.analizarConvocatorias(ruc, files, (n, t) => setBusy(`Subiendo convocatorias… ${n}/${t}`));
      go("analisis/" + res.analisis_id);
    } catch (e) { setError(e.message); setBusy(""); }
  }

  if (!ruc) return (<><Header title="Nuevo análisis" empresa={empresa} /><div className="card empty">Registra primero el perfil de tu empresa. <button className="linkbtn" onClick={() => go("empresa")}>Ir a Mi empresa →</button></div></>);
  return (
    <>
      <Header title="Nuevo análisis" subtitle="Sube las convocatorias (resúmenes de bases en .md) y lanza el análisis (HU02, HU03)." empresa={empresa} />
      {error && <div className="alert">{error}</div>}
      <div className="grid g3">
        <div className="card">
          <div className={"drop" + (over ? " over" : "")} onClick={() => input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); agregar(e.dataTransfer.files); }}>
            <div style={{ fontSize: 34 }}>📄</div>
            <div><b>Haz clic para agregar convocatorias</b> o arrástralas aquí</div>
            <div className="hint" style={{ marginTop: 6 }}>Solo archivos .md · máximo {MAX} por análisis</div>
            <input ref={input} type="file" multiple accept=".md,text/markdown" style={{ display: "none" }} onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
          </div>
          <div className="files">{files.map((f) => (
            <div className="file" key={f.name}><span>📝 {f.name}</span><span className="x" onClick={() => setFiles(files.filter((x) => x !== f))}>✕</span></div>))}
          </div>
        </div>
        <div className="card"><h2>Resumen</h2>
          <div className="obj">Empresa</div><div className="ent" style={{ marginBottom: 10 }}>{empresa?.razon_social}</div>
          <div className="obj">Convocatorias cargadas</div><div className="kpi"><div className="v">{files.length}</div></div>
          <div className="obj" style={{ margin: "8px 0 14px" }}>{empresa?.email ? <>Te enviaremos un correo a <b>{empresa.email}</b> cuando termine.</> : "Registra un correo en Mi empresa para recibir el resumen."}</div>
          <button className="btn pri" style={{ width: "100%", justifyContent: "center" }} disabled={!files.length || !!busy} onClick={lanzar}>
            {busy ? <><span className="spinner" /> {busy}</> : "⚡ Analizar oportunidades"}</button>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ ANÁLISIS / RESULTADOS (HU03–HU06)
function Analisis({ id, empresa, toast }) {
  const [an, setAn] = useState(null);
  const [ops, setOps] = useState(null);
  const [filtro, setFiltro] = useState("TODAS");
  const [sel, setSel] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const a = await api.obtenerAnalisis(id);
      setAn(a);
      if (a.estado !== "EN_PROCESO") setOps((await api.listarOportunidades(id)).oportunidades);
      return a.estado;
    } catch (e) { setError(e.message); return "ERROR"; }
  }, [id]);

  useEffect(() => {
    let timer, vivo = true;
    const tick = async () => { const estado = await cargar(); if (vivo && estado === "EN_PROCESO") timer = setTimeout(tick, 4000); };
    tick();
    return () => { vivo = false; clearTimeout(timer); };
  }, [cargar]);

  const counts = useMemo(() => {
    const c = { POSTULAR: 0, EVALUAR: 0, DESCARTAR: 0, ERROR: 0 };
    (ops || []).forEach((o) => { c[o.recomendacion] = (c[o.recomendacion] || 0) + 1; });
    return c;
  }, [ops]);

  async function csv() {
    try { const { url } = await api.urlCsv(id); window.location.href = url; toast("⬇️ Descargando CSV"); }
    catch (e) { toast(e.message); }
  }

  if (error) return (<><Header title="Análisis" empresa={empresa} /><div className="alert">{error}</div></>);
  if (!an) return (<><Header title="Análisis" empresa={empresa} /><Loading /></>);

  if (an.estado === "EN_PROCESO") {
    const total = an.total_convocatorias || 1, ev = an.evaluadas || 0;
    const paso = ev === 0 ? 1 : ev < total ? 2 : 3;
    const pasos = [["Preparar instrucciones con el perfil de la empresa", "PrepararInstrucciones · Lambda"], ["Listar convocatorias del lote", "ListarConvocatorias · Lambda"],
      [`Evaluar convocatorias con el agente IA (${ev}/${total})`, "Map → EvaluarConvocatoria → Choice → GuardarOportunidad"], ["Generar reporte CSV comparativo", "GenerarReporte · S3/resultados"], ["Notificar por correo", "SNS publish"]];
    const pct = Math.round(((paso + (paso === 2 ? ev / total : 0)) / 5) * 100);
    return (
      <>
        <Header title="Análisis en proceso" subtitle={<>Identificador {an.analisis_id} · estado <b>EN PROCESO</b>. Puedes cerrar esta ventana: te avisaremos por correo.</>} empresa={empresa} />
        <div className="card"><div className="bar" style={{ marginBottom: 18 }}><i style={{ width: pct + "%" }} /></div>
          <div className="steps">{pasos.map((s, i) => (
            <div key={i} className={"stp " + (i < paso ? "done" : i === paso ? "run" : "")}><div className="dot">{i < paso ? "✓" : i + 1}</div><div><div className="ent">{s[0]}</div><div className="obj">{s[1]}</div></div></div>))}
          </div></div>
      </>
    );
  }

  const rows = (ops || []).filter((o) => filtro === "TODAS" || o.recomendacion === filtro);
  return (
    <>
      <Header title="Resultados del análisis" subtitle={<>{an.analisis_id} · {fecha(an.creado_en)} · estado <b>{an.estado}</b> (HU04, HU05, HU06)</>} empresa={empresa} />
      {an.estado === "ERROR" && <div className="alert">El análisis terminó con error: {an.error_detalle}</div>}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <div className="tabs">{[["TODAS", (ops || []).length], ["POSTULAR", counts.POSTULAR], ["EVALUAR", counts.EVALUAR], ["DESCARTAR", counts.DESCARTAR]].map(([k, n]) => (
            <button key={k} className={"tab" + (filtro === k ? " on" : "")} onClick={() => setFiltro(k)}>{k === "TODAS" ? "Todas" : k} · {n}</button>))}</div>
          <button className="btn pri" onClick={csv} disabled={an.estado !== "COMPLETADO"}>⬇️ Descargar CSV</button>
        </div>
        {!ops ? <Loading /> : (
          <table><thead><tr><th>Entidad / objeto</th><th className="hide-m">Monto estimado</th><th>Cierre</th><th className="hide-m">Afinidad</th><th>Recomendación</th></tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.convocatoria_key} onClick={() => setSel(o)}>
                <td><div className="ent">{o.entidad}</div><div className="obj">{o.objeto}</div></td>
                <td className="hide-m">{fmt(o.monto_estimado)}</td>
                <td><span className={"days" + (o.dias_para_cierre != null && o.dias_para_cierre < 3 ? " low" : "")}>{o.dias_para_cierre != null ? `${o.dias_para_cierre} días` : "—"}</span></td>
                <td className="hide-m"><div className="aff"><div className="bar"><i style={{ width: (o.afinidad || 0) + "%" }} /></div><b>{o.afinidad}</b></div></td>
                <td><Badge r={o.recomendacion} /></td>
              </tr>))}</tbody></table>)}
      </div>
      <Detalle o={sel} onClose={() => setSel(null)} />
    </>
  );
}

function Detalle({ o, onClose }) {
  return (
    <>
      <div className={"shade" + (o ? " open" : "")} onClick={onClose} />
      <aside className={"drawer" + (o ? " open" : "")}>
        {o && <>
          <button className="btn sec" onClick={onClose}>✕ Cerrar</button>
          <div style={{ marginTop: 16 }}><Badge r={o.recomendacion} /></div>
          <h3>{o.entidad}</h3><div className="obj">{o.objeto}</div>
          <div className="meta"><div>Afinidad<b>{o.afinidad} / 100</b></div><div>Cierre de ofertas<b>{o.dias_para_cierre != null ? `${o.dias_para_cierre} días` : "Sin fecha"}</b><span className="obj">{o.fecha_presentacion_ofertas}</span></div>
            <div>Monto estimado<b>{fmt(o.monto_estimado)}</b></div><div>Archivo<b style={{ fontSize: 12 }}>{o.convocatoria_key}</b></div></div>
          <div className="sec"><h4>¿Por qué esta recomendación?</h4><div className="why"><b>{o.motivo}</b>{o.justificacion && <div style={{ marginTop: 6 }}>{o.justificacion}</div>}</div></div>
          <div className="sec"><h4>Requisitos que cumples</h4>{(o.requisitos_cumplidos || []).length ? o.requisitos_cumplidos.map((t) => <div key={t} className="li">✅ {t}</div>) : <div className="obj">—</div>}</div>
          <div className="sec"><h4>Brechas</h4>{(o.brechas || []).length ? o.brechas.map((b) => (
            <div key={b.descripcion} className="li">{b.tipo === "critica" ? "⛔" : "⚠️"} {b.descripcion} <span className={"pill " + (b.tipo === "critica" ? "b-DESCARTAR" : "b-EVALUAR")}>{b.tipo === "critica" ? "crítica" : "subsanable"}</span></div>)) : <div className="obj">No se encontraron brechas.</div>}</div>
          {(o.checklist || []).length > 0 && <div className="sec"><h4>Checklist para preparar la oferta</h4>{o.checklist.map((t) => <div key={t} className="li">☐ {t}</div>)}</div>}
        </>}
      </aside>
    </>
  );
}

// ------------------------------------------------------------------ HISTORIAL (HU08)
function Historial({ empresa, ruc }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { if (ruc) api.listarAnalisis(ruc).then((r) => setList(r.analisis)).catch((e) => setError(e.message)); }, [ruc]);
  return (
    <>
      <Header title="Historial de análisis" subtitle="Tus análisis, del más reciente al más antiguo (HU08)." empresa={empresa} />
      {error && <div className="alert">{error}</div>}
      {!ruc ? <div className="card empty">Registra primero el perfil de tu empresa.</div> : !list ? <Loading /> : list.length === 0 ?
        <div className="card empty">Aún no tienes análisis. Sube tus primeras convocatorias.</div> : (
          <div className="card hist">
            <div className="row" style={{ cursor: "default", fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <div>Análisis</div><div className="hm">Fecha</div><div className="hm">Postular</div><div className="hm">Evaluar</div><div className="hm">Descartar</div><div>Estado</div></div>
            {list.map((a) => (
              <div key={a.analisis_id} className="row" onClick={() => go("analisis/" + a.analisis_id)}>
                <div><div className="ent">{a.analisis_id}</div><div className="obj">{a.total_convocatorias} convocatorias</div></div>
                <div className="hm obj">{fecha(a.creado_en)}</div>
                <div className="hm"><span className="pill b-POSTULAR">{a.total_postular ?? "—"}</span></div>
                <div className="hm"><span className="pill b-EVALUAR">{a.total_evaluar ?? "—"}</span></div>
                <div className="hm"><span className="pill b-DESCARTAR">{a.total_descartar ?? "—"}</span></div>
                <div><span className="pill" style={{ background: a.estado === "ERROR" ? "#fee2e2" : "#e0f2fe", color: a.estado === "ERROR" ? "#b91c1c" : "#075985" }}>{a.estado}</span></div>
              </div>))}
          </div>)}
    </>
  );
}

// ------------------------------------------------------------------ APP
export default function App() {
  const route = useHashRoute();
  const [ruc, setRuc] = useState(() => store.get("licitaya_ruc") || "");
  const [empresa, setEmpresa] = useState(null);
  const [toastText, setToastText] = useState("");
  const toast = useCallback((t) => { setToastText(t); setTimeout(() => setToastText(""), 2600); }, []);

  useEffect(() => {
    if (!ruc) return;
    api.getEmpresa(ruc).then(setEmpresa).catch(() => { setRuc(""); store.set("licitaya_ruc", ""); });
  }, [ruc]);

  const onSaved = (e) => { setEmpresa(e); setRuc(e.ruc); store.set("licitaya_ruc", e.ruc); };
  const onLogout = () => { setEmpresa(null); setRuc(""); store.set("licitaya_ruc", ""); };

  const [view, param] = route;
  const active = view === "analisis" ? "historial" : view;
  const nav = NAV.map(([k, i, t]) => <a key={k} href={"#/" + k} className={k === active ? "on" : ""}><span className="ic">{i}</span>{t}</a>);

  let page;
  if (view === "empresa") page = <Empresa empresa={empresa} ruc={ruc} onSaved={onSaved} toast={toast} onLogout={onLogout} />;
  else if (view === "nuevo") page = <Nuevo empresa={empresa} ruc={ruc} />;
  else if (view === "analisis" && param) page = <Analisis key={param} id={decodeURIComponent(param)} empresa={empresa} toast={toast} />;
  else if (view === "historial") page = <Historial empresa={empresa} ruc={ruc} />;
  else page = <Inicio empresa={empresa} ruc={ruc} />;

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><div className="mk">⚡</div><div>LicitaYa<small>Radar de Oportunidades</small></div></div>
        <nav className="nav">{nav}</nav>
        <div className="foot">MVP · Proyecto Final Cloud Computing · UTEC 2026</div>
      </aside>
      <main>{page}</main>
      <nav className="mobnav">{nav}</nav>
      <Toast text={toastText} />
    </div>
  );
}
