'use client'
import { useState, useRef } from 'react'

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', txt: '📃', default: '📎'
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Home() {
  const [tipo, setTipo] = useState(null)
  const [renovacion, setRenovacion] = useState(false)
  const [agropecuaria, setAgropecuaria] = useState(false)
  const [construccion, setConstruccion] = useState(false)
  const [archivos, setArchivos] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
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
      // Convert files to base64 in batches of 3
      setLoadingMsg('Leyendo los archivos...')
      const BATCH_SIZE = 3
      let resultadoFinal = null

      for (let i = 0; i < archivos.length; i += BATCH_SIZE) {
        const batch = archivos.slice(i, i + BATCH_SIZE)
        setLoadingMsg(`Analizando archivos ${i + 1}–${Math.min(i + BATCH_SIZE, archivos.length)} de ${archivos.length}...`)

        const archivosB64 = await Promise.all(batch.map(async f => ({
          nombre: f.name,
          mimeType: f.type,
          contenido_base64: await fileToBase64(f)
        })))

        const res = await fetch('/api/analizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            renovacion,
            agropecuaria,
            construccion,
            archivos: archivosB64
          })
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error del servidor')

        if (!resultadoFinal) {
          resultadoFinal = data
        } else {
          // Merge results: update existing items, add new ones
          for (const item of data.resultados || []) {
            const existing = resultadoFinal.resultados.find(r => r.id === item.id)
            if (existing) {
              if (item.estado === 'ok') Object.assign(existing, item)
            } else {
              resultadoFinal.resultados.push(item)
            }
          }
          if (data.documentos_no_identificados?.length) {
            resultadoFinal.documentos_no_identificados = [
              ...(resultadoFinal.documentos_no_identificados || []),
              ...data.documentos_no_identificados
            ]
          }
        }
      }

      // Recalculate estado_general
      const items = resultadoFinal.resultados || []
      const faltantes = items.filter(r => r.estado === 'faltante').length
      const incompletos = items.filter(r => r.estado === 'incompleto').length
      if (faltantes > 0) resultadoFinal.estado_general = 'incompleto'
      else if (incompletos > 0) resultadoFinal.estado_general = 'con_observaciones'
      else resultadoFinal.estado_general = 'completo'

      setResultado(resultadoFinal)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingMsg('')
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
            <div className="card">
              <div className="card-title">Tipo de solicitante</div>
              <div className="type-grid">
                <button className={`type-btn${tipo === 'fisica' ? ' selected' : ''}`} onClick={() => setTipo('fisica')}>
                  <div className="type-btn-title">Persona física / SH</div>
                  <div className="type-btn-desc">Titular individual o sociedad de hecho</div>
                </button>
                <button className={`type-btn${tipo === 'juridica' ? ' selected' : ''}`} onClick={() => setTipo('juridica')}>
                  <div className="type-btn-title">Persona jurídica</div>
                  <div className="type-btn-desc">SA, SRL, SAS u otra sociedad</div>
                </button>
              </div>
            </div>

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
              disabled={!tipo || archivos.length === 0}
              onClick={analizar}
            >
              Analizar documentación
            </button>
          </>
        )}

        {loading && (
          <div className="card loading-box">
            <div className="spinner"></div>
            <div className="loading-title">{loadingMsg || 'Analizando...'}</div>
            <div className="loading-sub">La IA está leyendo el contenido de cada archivo. Puede tardar hasta un minuto.</div>
          </div>
        )}

        {resultado && (
          <>
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
                      {item.archivo_encontrado && <div className="result-file">Archivo: {item.archivo_encontrado}</div>}
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
