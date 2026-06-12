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
    { id: 'anexo4', label: 'Anexo IV – Res 212/2013 con % de socios', criterios: 'Verificá que sea el formulario Anexo IV de la Res 212/2013. Debe estar completo (todos los campos llenados) y debe incluir el porcentaje de participación de cada socio. Debe estar firmado. Si falta algún campo, firma o el % de socios, indicalo.' },
    { id: 'mipyme', label: 'Certificado MiPyME', criterios: 'Verificá que sea un Certificado MiPyME del Ministerio de Producción. Debe estar vigente (vencimiento posterior a 2026). Indicá razón social, CUIT y fecha de vencimiento.' },
    { id: 'resena', label: 'Reseña de actividad', criterios: 'Debe describir claramente la actividad principal de la empresa.' },
    { id: 'bbpp_socios', label: 'DDJJ Bienes Personales de los socios', criterios: 'Debe ser la última DDJJ de Bienes Personales de cada socio con presentación ante AFIP y apertura de bienes. Si el CPN que firma no es el mismo que firma el balance, su firma debe estar certificada por el Consejo Profesional. Indicá de qué año es y si está completa.' },
    { id: 'estatuto', label: 'Estatuto o contrato social', criterios: 'Debe ser el estatuto o contrato social de la empresa con todas sus modificaciones. Verificá que esté certificado o legalizado.' },
    { id: 'acta', label: 'Última acta de asamblea', criterios: 'Debe ser el acta de asamblea más reciente con designación de autoridades vigentes. Indicá la fecha del acta y las autoridades designadas.' },
    { id: 'eecc', label: 'Últimos estados contables', criterios: 'Deben ser los estados contables (balance) del último ejercicio cerrado. CRÍTICO: verificá (1) que estén certificados por Consejo Profesional de Ciencias Económicas, (2) el año del ejercicio — en 2026 se acepta ejercicio 2024 o 2025, si es 2023 o anterior está desactualizado, (3) que incluya notas y anexos. Indicá el período y si tiene certificación.' },
    { id: 'dni', label: 'Copia DNI de los socios', criterios: 'Deben ser copias del DNI de todos los socios. Verificá que sean legibles.' },
    { id: 'ventas_post', label: 'Ventas mensuales post balance', criterios: 'Debe ser un detalle de ventas mensuales del período posterior al cierre del último balance. Verificá que cubra hasta un mes reciente de 2026.' },
    { id: 'deudas', label: 'Detalle de deuda', criterios: 'Debe ser un detalle completo de deudas bancarias y financieras actuales con montos y entidades.' },
  ]
}

async function callGeminiWithFiles(prompt, archivos, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`
  
  const parts = []
  
  // Add each file as inline data for Gemini to read directly
  for (const arch of archivos) {
    parts.push({
      inline_data: {
        mime_type: arch.mimeType || 'application/pdf',
        data: arch.contenido_base64
      }
    })
    parts.push({ text: `[Archivo: "${arch.nombre}"]` })
  }
  
  parts.push({ text: prompt })
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    })
  })
  
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini error ${res.status}: ${errText}`)
  }
  
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
        { id: 'form_agro', label: 'Formulario Agropecuario', criterios: 'Debe ser el formulario específico para actividad agropecuaria. Verificá que esté completo.' },
        { id: 'senasa', label: 'Stock SENASA', criterios: 'Debe ser el certificado o detalle de stock de hacienda emitido por SENASA.' },
        { id: 'sisa_ip1', label: 'SISA IP1', criterios: 'Debe ser el formulario SISA IP1 del sistema de información simplificada agrícola.' },
        { id: 'sisa_ip2', label: 'SISA IP2', criterios: 'Debe ser el formulario SISA IP2 del sistema de información simplificada agrícola.' }
      )
    }
    if (construccion) {
      checklist.push({ id: 'backlog', label: 'Backlog de obras en curso', criterios: 'Debe ser un detalle de obras actualmente en ejecución con estado de avance y montos.' })
    }

    const currentYear = new Date().getFullYear()
    const checklistText = checklist.map(c => `- ID: ${c.id} | ${c.label}: ${c.criterios}`).join('\n')

    const prompt = `Sos un analista de riesgos senior de Argenpymes SGR. Estás analizando la documentación de una PyME.

TIPO DE SOLICITANTE: ${tipo === 'fisica' ? 'Persona Física / Sociedad de Hecho' : 'Persona Jurídica'}
ES RENOVACIÓN: ${renovacion ? 'SÍ' : 'NO'}
ES AGROPECUARIA: ${agropecuaria ? 'SÍ' : 'NO'}
ES CONSTRUCCIÓN: ${construccion ? 'SÍ' : 'NO'}
AÑO ACTUAL: ${currentYear}

Los archivos están adjuntos arriba. LEELOS COMPLETAMENTE — no te guíes por el nombre del archivo, sino por el contenido real.

REQUISITOS A VERIFICAR:
${checklistText}

INSTRUCCIONES CRÍTICAS:
1. Leé el contenido real de cada archivo, ignorá el nombre
2. Para cada requisito del checklist, determiná si está CUMPLIDO (ok), INCOMPLETO (incompleto) o FALTANTE (faltante)
3. Sé MUY específico en las observaciones — si falta una firma, decí "falta firma del CPN". Si el balance es de 2023, decí "balance del ejercicio 2023, se requiere 2024 o 2025". Si el Anexo IV no tiene el campo email, decí "falta completar el campo email en el Anexo IV"
4. Si un archivo no corresponde a ningún requisito, agregalo a documentos_no_identificados
5. El certificado MiPyME vence al año — si venció, marcalo como incompleto
6. El Anexo IV tiene vigencia de 1 año — si tiene más, marcalo

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después:
{
  "resumen": "2-3 oraciones describiendo el estado del paquete con los problemas principales",
  "estado_general": "completo" | "incompleto" | "con_observaciones",
  "resultados": [
    {
      "id": "id_del_requisito",
      "label": "nombre del requisito",
      "estado": "ok" | "incompleto" | "faltante",
      "archivo_encontrado": "nombre exacto del archivo o null",
      "observacion": "detalle específico y concreto"
    }
  ],
  "documentos_no_identificados": ["archivos que no corresponden a ningún requisito"]
}`

    // Process files one by one to avoid size limits
    let resultadoFinal = null

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i]
      
      // Skip files larger than 3MB — try as text extraction fallback
      let batch = [archivo]
      
      let respuesta
      try {
        respuesta = await callGeminiWithFiles(prompt, batch, apiKey)
      } catch (e) {
        // If file is too large, skip it and note it
        console.error(`Error procesando ${archivo.nombre}:`, e.message)
        continue
      }
      
      let resultado
      try {
        const jsonMatch = respuesta.match(/\{[\s\S]*\}/)
        resultado = JSON.parse(jsonMatch ? jsonMatch[0] : respuesta)
      } catch {
        continue
      }

      if (!resultadoFinal) {
        resultadoFinal = resultado
      } else {
        for (const item of resultado.resultados || []) {
          const existing = resultadoFinal.resultados.find(r => r.id === item.id)
          if (existing) {
            if (item.estado === 'ok' || (item.estado === 'incompleto' && existing.estado === 'faltante')) {
              Object.assign(existing, item)
            }
          } else {
            resultadoFinal.resultados.push(item)
          }
        }
        if (resultado.documentos_no_identificados?.length) {
          resultadoFinal.documentos_no_identificados = [
            ...(resultadoFinal.documentos_no_identificados || []),
            ...resultado.documentos_no_identificados
          ]
        }
      }
    }

    if (!resultadoFinal) {
      return NextResponse.json({ error: 'No se pudo procesar ningún archivo' }, { status: 500 })
    }

    // Recalculate estado_general
    const items = resultadoFinal.resultados || []
    const faltantes = items.filter(r => r.estado === 'faltante').length
    const incompletos = items.filter(r => r.estado === 'incompleto').length
    if (faltantes > 0) resultadoFinal.estado_general = 'incompleto'
    else if (incompletos > 0) resultadoFinal.estado_general = 'con_observaciones'
    else resultadoFinal.estado_general = 'completo'

    return NextResponse.json(resultadoFinal)

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
