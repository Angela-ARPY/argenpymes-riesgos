'use client'
import { useState, useRef } from 'react'

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
  txt: '📃', default: '📎'
}

function getIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Home() {
  const [tipo, setTipo] = useState(null)
  const [renovacion, setRenovacion] = useState(false)
  const [agropecuaria, setAgropecuaria] = useState(false)
  const [construccion, setConstruccion] = useState(false)
  const [archivos, setArchivos] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef()

  function addFiles(newFiles) {
    const arr = Array.from(newFiles)
    setArchivos(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...arr.filter(f => !names.has(f.name))]
    })
  }

  function removeFile(name) {
    setArchivos(prev => prev.filter(f => f.name !== name))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  async function analizar() {
    if (!tipo || archivos.length === 0) return
    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      const form = new FormData()
      form.append('tipo', tipo)
      form.append('renovacion', renovacion)
      form.append('agropecuaria', agropecuaria)
      form.append('construccion', construccion)
      archivos.forEach(f => form.append('archivos', f))

      const res = await fetch('/api/analizar', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error del servidor')
      setResultado(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResultado(null)
    setError(null)
    setArchivos([])
    setTipo(null)
    setRenovacion(false)
    setAgropecuaria(false)
    setConstruccion(false)
  }

  const bannerConfig = {
    completo: { icon: '✅', title: 'Documentación completa', cls: 'ok' },
    incompleto: { icon: '❌', title: 'Documentación incompleta', cls: 'incompleto' },
    con_observaciones: { icon: '⚠️', title: 'Documentación con observaciones', cls: 'con_observaciones' },
  }

  const estadoIcon = { ok: '✅', incompleto: '⚠️', faltante: '❌' }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <span className="header-logo">Argenpymes</span>
          <span className="header-sep">·</span>
          <span className="header-sub">Verificador de documentación — Riesgos</span>
        </div>
      </header>

      <main className="main">

        {!resultado && !loading && (
          <>
            {/* Tipo de solicitante */}
            <div className="card">
              <div className="card-title">Tipo de solicitante</div>
              <div className="type-grid">
                <button
                  className={`type-btn${tipo === 'fisica' ? ' selected' : ''}`}
                  onClick={() => setTipo('fisica')}
                >
                  <div className="type-btn-title">Persona física / SH</div>
                  <div className="type-btn-desc">Titular individual o sociedad de hecho</div>
                </button>
                <button
                  className={`type-btn${tipo === 'juridica' ? ' selected' : ''}`}
                  onClick={() => setTipo('juridica')}
                >
                  <div className="type-btn-title">Persona jurídica</div>
                  <div className="type-btn-desc">SA, SRL, SAS u otra sociedad</div>
                </button>
              </div>
            </div>

            {/* Características */}
            <div className="card">
              <div className="card-title">Características de la operación</div>
              <div className="toggle-grid">
                <label className={`toggle-item${renovacion ? ' active' : ''}`}>
                  <input type="checkbox" checked={renovacion} onChange={e => setRenovacion(e.target.checked)} />
                  Es renovación
                </label>
                <label className={`toggle-item${agropecuaria ? ' active' : ''}`}>
                  <input type="checkbox" checked={agropecuaria} onChange={e => setAgropecuaria(e.target.checked)} />
                  Empresa agropecuaria
                </label>
                <label className={`toggle-item${construccion ? ' active' : ''}`}>
                  <input type="checkbox" checked={construccion} onChange={e => setConstruccion(e.target.checked)} />
                  Empresa de construcción
                </label>
              </div>
            </div>

            {/* Upload */}
            <div className="card">
              <div className="card-title">Documentación a enviar</div>

              <div
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <div className="upload-icon">📂</div>
                <div className="upload-title">Arrastrá los archivos acá o hacé click para seleccionarlos</div>
                <div className="upload-sub">PDF, Word, Excel, imágenes — podés subir todos los documentos juntos</div>
                <input
                  ref={fileInputRef}
                  className="upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  onChange={e => addFiles(e.target.files)}
                />
              </div>

              {archivos.length > 0 && (
                <div className="file-list">
                  {archivos.map(f => (
                    <div key={f.name} className="file-item">
                      <span className="file-icon">{getIcon(f.name)}</span>
                      <span className="file-name">{f.name}</span>
                      <span className="file-size">{formatSize(f.size)}</span>
                      <button className="file-remove" onClick={() => removeFile(f.name)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.9rem', marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              className="btn-analizar"
              disabled={!tipo || archivos.length === 0 || loading}
              onClick={analizar}
            >
              Analizar documentación
            </button>
          </>
        )}

        {loading && (
          <div className="card loading-box">
            <div className="spinner"></div>
            <div className="loading-title">Analizando los documentos...</div>
            <div className="loading-sub">La IA está leyendo el contenido de cada archivo. Puede tardar hasta 30 segundos.</div>
          </div>
        )}

        {resultado && (
          <>
            {/* Banner general */}
            {(() => {
              const cfg = bannerConfig[resultado.estado_general] || bannerConfig.incompleto
              return (
                <div className={`result-banner ${cfg.cls}`}>
                  <span className="banner-icon">{cfg.icon}</span>
                  <div>
                    <div className="banner-title">{cfg.title}</div>
                    <div className="banner-resumen">{resultado.resumen}</div>
                  </div>
                </div>
              )
            })()}

            {/* Items */}
            <div className="card">
              <div className="card-title">
                Detalle por documento
                <span style={{ float: 'right', textTransform: 'none', letterSpacing: 0, fontSize: '0.82rem' }}>
                  {resultado.resultados?.filter(r => r.estado === 'ok').length} ok ·{' '}
                  {resultado.resultados?.filter(r => r.estado === 'incompleto').length} con observaciones ·{' '}
                  {resultado.resultados?.filter(r => r.estado === 'faltante').length} faltantes
                </span>
              </div>
              <div className="result-list">
                {resultado.resultados?.map(item => (
                  <div key={item.id} className={`result-item ${item.estado}`}>
                    <span className="result-status">{estadoIcon[item.estado]}</span>
                    <div className="result-content">
                      <div className="result-label">{item.label}</div>
                      {item.archivo_encontrado && (
                        <div className="result-file">Archivo: {item.archivo_encontrado}</div>
                      )}
                      <div className="result-obs">{item.observacion}</div>
                    </div>
                  </div>
                ))}
              </div>

              {resultado.documentos_no_identificados?.length > 0 && (
                <div className="unid-section">
                  <div className="unid-title">Archivos no identificados</div>
                  <div className="unid-list">
                    {resultado.documentos_no_identificados.map(d => (
                      <span key={d} className="unid-tag">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn-reset" onClick={reset}>← Analizar otro paquete</button>
          </>
        )}
      </main>
    </>
  )
}
