import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const CHECKLIST = {
  fisica: [
    { id: 'anexo4', label: 'Anexo IV – Res 212/2013', criterios: 'Verificá que sea el formulario Anexo IV de la Res 212/2013. Debe estar completo (todos los campos llenados incluyendo email, teléfono, actividad, datos del solicitante) y firmado por el titular. Si falta algún campo o firma, indicá exactamente cuál.' },
    { id: 'mipyme', label: 'Certificado MiPyME', criterios: 'Verificá que sea un Certificado MiPyME del Ministerio de Producción. Debe estar vigente (la fecha de vencimiento debe ser posterior a hoy, año 2026). Indicá la razón social, CUIT y fecha de vencimiento.' },
    { id: 'ventas', label: 'Detalle de ventas y compras mensuales', criterios: 'Debe ser una planilla con ventas y compras mensuales netas de IVA. Debe cubrir los últimos 3 años más el año actual (2026). Debe estar firmada por el titular Y por un Contador Público Nacional (CPN) con certificación del Consejo Profesional. Si falta alguna firma o período, indicalo.' },
    { id: 'f1272', label: 'F1272', criterios: 'Verificá que sea el formulario F1272 de AFIP. Debe estar completo y presentado.' },
    { id: 'deudas', label: 'Detalle de deudas', criterios: 'Debe ser un detalle completo de deudas bancarias y financieras actuales. Verificá que incluya montos, entidades y vencimientos.' },
    { id: 'resena', label: 'Reseña de actividad', criterios: 'Debe ser un texto describiendo la actividad principal de la empresa o persona. Verificá que describa claramente a qué se dedica.' },
    { id: 'ganancias', label: 'Últimas 2 DDJJ de Ganancias', criterios: 'Deben ser las declaraciones juradas de Ganancias de los últimos 2 años fiscales. Verificá que incluyan papeles de trabajo y comprobantes de presentación ante AFIP. Indicá qué años cubre.' },
    { id: 'bbpp', label: 'Últimas 2 DDJJ de Bienes Personales', criterios: 'Deben ser las DDJJ de Bienes Personales de los últimos 2 años. Verificá que incluyan presentación ante AFIP y apertura detallada de bienes. Indicá qué años cubre.' },
    { id: 'dni', label: 'Copia DNI titular/socios y fiador', criterios: 'Deben ser copias del DNI del titular o socios de la SH y del fiador. Verificá que sean legibles y estén los dos lados.' },
    { id: 'patrimonio', label: 'Manifestación de Bienes / Estado Patrimonial', criterios: 'Debe ser la última manifestación de bienes o estado de situación patrimonial. Verificá que esté firmada y sea reciente (2025 o 2026).' },
  ],
  juridica: [
    { id: 'anexo4', label: 'Anexo IV – Res 212/2013 con % de socios', criterios: 'Verificá que sea el formulario Anexo IV de la Res 212/2013. Debe estar completo y debe incluir el porcentaje de participación de cada socio. Debe estar firmado. Si falta algún campo, firma o el % de socios, indicalo.' },
    { id: 'mipyme', label: 'Certificado MiPyME', criterios: 'Verificá que sea un Certificado MiPyME del Ministerio de Producción. Debe estar vigente (vencimiento posterior a 2026). Indicá razón social, CUIT y fecha de vencimiento.' },
    { id: 'resena', label: 'Reseña de actividad', criterios: 'Debe describir claramente la actividad principal de la empresa.' },
    { id: 'bbpp_socios', label: 'DDJJ Bienes Personales de los socios', criterios: 'Debe ser la última DDJJ de Bienes Personales de cada socio con presentación ante AFIP y apertura de bienes. Indicá de qué año es y si está completa.' },
    { id: 'estatuto', label: 'Estatuto o contrato social', criterios: 'Debe ser el estatuto o contrato social de la empresa con todas sus modificaciones. Verificá que esté certificado o legalizado.' },
    { id: 'acta', label: 'Última acta de asamblea', criterios: 'Debe ser el acta de asamblea más reciente con designación de autoridades vigentes. Indicá la fecha del acta y las autoridades designadas.' },
    { id: 'eecc', label: 'Últimos estados contables', criterios: 'Deben ser los estados contables (balance) del último ejercicio cerrado. CRÍTICO: verificá (1) que estén certificados por Consejo Profesional de Ciencias Económicas, (2) el año del ejercicio — en 2026 se acepta ejercicio 2024 o 2025, si es 2023 o anterior está desactualizado, (3) que incluya notas y anexos. Indicá el período y si tiene certificación.' },
    { id: 'dni', label: 'Copia DNI de los socios', criterios: 'Deben ser copias del DNI de todos los socios. Verificá que sean legibles.' },
    { id: 'ventas_post', label: 'Ventas mensuales post balance', criterios: 'Debe ser un detalle de ventas mensuales del período posterior al cierre del último balance. Verificá que cubra hasta un mes reciente de 2026.' },
    { id: 'deudas', label: 'Detalle de deuda', criterios: 'Debe ser un detalle completo de deudas bancarias y financieras actuales con montos y entidades.' },
  ]
}

// Upload file to Gemini File API for large files
async function uploadFileToGemini(base64Data, mimeType, displayName, apiKey) {
  const buffer = Buffer.from(base64Data, 'base64')
  const numBytes = buffer.length
  
  // Start resumable upload
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': numBytes,
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } })
    }
  )
  
  if (!startRes.ok) throw new Error(`Upload start failed: ${await startRes.text()}`)
  
  const uploadUrl = startRes.headers.get('x-goog-upload-url')
  
  // Upload the actual file
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': numBytes,
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mimeType,
    },
    body: buffer
  })
  
  if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`)
  
  const fileData = await uploadRes.json()
  return fileData.file?.uri || fileData.uri
}

async function callGemini(prompt, fileParts, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [...fileParts, { text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    })
  })
  
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function mergeResultados(base, nuevo) {
  for (const item of nuevo.resultados || []) {
    const existing = base.resultados.find(r => r.id === item.id)
    if (existing) {
      if (item.estado === 'ok' || (item.estado === 'incompleto' && existing.estado === 'faltante')) {
        Object.assign(existing, item)
      }
    } else {
      base.resultados.push(item)
    }
  }
  if (nuevo.documentos_no_identificados?.length) {
    base.documentos_no_identificados = [
      ...(base.documentos_no_identificados || []),
      ...nuevo.documentos_no_identificados
    ]
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const body = await request.json()
    const { tipo, renovacion, agropecuaria, construccion, archivos } = body

    if (!archivos || !archivos.length) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 })
    }

    let checklist = [...CHECKLIST[tipo]]
    if (renovacion) {
      const excluir = tipo === 'fisica' ? ['resena', 'dni'] : ['resena', 'estatuto', 'dni']
      checklist = checklist.filter(i => !excluir.includes(i.id))
    }
    if (agropecuaria) {
      checklist.push(
        { id: 'form_agro', label: 'Formulario Agropecuario', criterios: 'Formulario específico para actividad agropecuaria, debe estar completo.' },
        { id: 'senasa', label: 'Stock SENASA', criterios: 'Certificado o detalle de stock de hacienda emitido por SENASA.' },
        { id: 'sisa_ip1', label: 'SISA IP1', criterios: 'Formulario SISA IP1 del sistema de información simplificada agrícola.' },
        { id: 'sisa_ip2', label: 'SISA IP2', criterios: 'Formulario SISA IP2 del sistema de información simplificada agrícola.' }
      )
    }
    if (construccion) {
      checklist.push({ id: 'backlog', label: 'Backlog de obras en curso', criterios: 'Detalle de obras en ejecución con estado de avance y montos.' })
    }

    const currentYear = new Date().getFullYear()
    const checklistText = checklist.map(c => `- ID: ${c.id} | ${c.label}: ${c.criterios}`).join('\n')

    const prompt = `Sos un analista de riesgos senior de Argenpymes SGR. Analizá el documento adjunto.

TIPO: ${tipo === 'fisica' ? 'Persona Física / SH' : 'Persona Jurídica'}
ES RENOVACIÓN: ${renovacion ? 'SÍ' : 'NO'}
AÑO ACTUAL: ${currentYear}

LEÉ EL CONTENIDO REAL del documento — no el nombre del archivo. Determiná a qué requisito corresponde y si cumple los criterios.

REQUISITOS:
${checklistText}

INSTRUCCIONES:
1. Ignorá el nombre del archivo, analizá el contenido
2. Si el documento cumple un requisito: marcalo ok con observación positiva
3. Si está incompleto (falta firma, campo, certificación, año incorrecto): marcalo incompleto con detalle específico
4. Si no corresponde a ningún requisito: agregalo a documentos_no_identificados
5. Solo incluí en resultados los requisitos que encontraste en ESTE documento

Respondé SOLO con JSON válido:
{
  "resultados": [
    {
      "id": "id_requisito",
      "label": "nombre",
      "estado": "ok" | "incompleto",
      "archivo_encontrado": "nombre del archivo",
      "observacion": "detalle específico y concreto"
    }
  ],
  "documentos_no_identificados": []
}`

    let resultadoFinal = null
    const MAX_INLINE_SIZE = 3 * 1024 * 1024 // 3MB

    for (const archivo of archivos) {
      try {
        const bufferSize = Buffer.from(archivo.contenido_base64, 'base64').length
        let filePart

        if (bufferSize > MAX_INLINE_SIZE) {
          // Use File API for large files
          const fileUri = await uploadFileToGemini(
            archivo.contenido_base64,
            archivo.mimeType || 'application/pdf',
            archivo.nombre,
            apiKey
          )
          filePart = { file_data: { mime_type: archivo.mimeType || 'application/pdf', file_uri: fileUri } }
        } else {
          // Use inline data for small files
          filePart = { inline_data: { mime_type: archivo.mimeType || 'application/pdf', data: archivo.contenido_base64 } }
        }

        const filePrompt = `Archivo analizado: "${archivo.nombre}"\n\n${prompt}`
        const respuesta = await callGemini(filePrompt, [filePart], apiKey)

        let resultado
        try {
          const jsonMatch = respuesta.match(/\{[\s\S]*\}/)
          resultado = JSON.parse(jsonMatch ? jsonMatch[0] : respuesta)
        } catch {
          continue
        }

        if (!resultadoFinal) {
          resultadoFinal = {
            resultados: resultado.resultados || [],
            documentos_no_identificados: resultado.documentos_no_identificados || []
          }
        } else {
          mergeResultados(resultadoFinal, resultado)
        }

      } catch (e) {
        console.error(`Error con ${archivo.nombre}:`, e.message)
        if (!resultadoFinal) {
          resultadoFinal = { resultados: [], documentos_no_identificados: [] }
        }
        resultadoFinal.documentos_no_identificados.push(`${archivo.nombre} (error al procesar)`)
      }
    }

    if (!resultadoFinal) {
      return NextResponse.json({ error: 'No se pudo procesar ningún archivo' }, { status: 500 })
    }

    // Add faltantes for missing items
    const idsEncontrados = new Set(resultadoFinal.resultados.map(r => r.id))
    for (const item of checklist) {
      if (!idsEncontrados.has(item.id)) {
        resultadoFinal.resultados.push({
          id: item.id,
          label: item.label,
          estado: 'faltante',
          archivo_encontrado: null,
          observacion: 'No se encontró este documento en los archivos subidos.'
        })
      }
    }

    // Calculate estado_general and resumen
    const faltantes = resultadoFinal.resultados.filter(r => r.estado === 'faltante')
    const incompletos = resultadoFinal.resultados.filter(r => r.estado === 'incompleto')
    const ok = resultadoFinal.resultados.filter(r => r.estado === 'ok')

    if (faltantes.length === 0 && incompletos.length === 0) {
      resultadoFinal.estado_general = 'completo'
      resultadoFinal.resumen = `Documentación completa. Los ${ok.length} documentos requeridos fueron verificados correctamente.`
    } else if (faltantes.length > 0) {
      resultadoFinal.estado_general = 'incompleto'
      resultadoFinal.resumen = `Faltan ${faltantes.length} documento${faltantes.length > 1 ? 's' : ''}: ${faltantes.map(f => f.label).join(', ')}.${incompletos.length > 0 ? ` Además, ${incompletos.length} documento${incompletos.length > 1 ? 's tienen' : ' tiene'} observaciones.` : ''}`
    } else {
      resultadoFinal.estado_general = 'con_observaciones'
      resultadoFinal.resumen = `${incompletos.length} documento${incompletos.length > 1 ? 's tienen' : ' tiene'} observaciones que requieren corrección antes de enviar.`
    }

    return NextResponse.json(resultadoFinal)

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
