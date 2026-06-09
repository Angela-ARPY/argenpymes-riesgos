import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60



const CHECKLIST = {
  fisica: [
    { id: 'anexo4', label: 'Anexo IV – Res 212/2013', descripcion: 'Formulario Anexo IV de la resolución 212/2013, debe estar firmado por el titular' },
    { id: 'mipyme', label: 'Certificado MiPyME', descripcion: 'Certificado MiPyME vigente emitido por el Ministerio de Producción' },
    { id: 'ventas', label: 'Detalle de ventas y compras mensuales', descripcion: 'Planilla con ventas y compras mensuales netas de IVA de los últimos 3 años más año actual, firmada por titular y contador público certificado por Consejo Profesional de Ciencias Económicas' },
    { id: 'f1272', label: 'F1272', descripcion: 'Formulario F1272 de AFIP' },
    { id: 'deudas', label: 'Detalle de deudas', descripcion: 'Detalle completo de deudas actuales de la empresa o persona' },
    { id: 'resena', label: 'Reseña de actividad', descripcion: 'Texto describiendo la actividad principal de la empresa' },
    { id: 'ganancias', label: 'Últimas 2 DDJJ de Ganancias', descripcion: 'Declaraciones juradas de Ganancias de los últimos 2 años con papeles de trabajo y comprobantes de presentación ante AFIP' },
    { id: 'bbpp', label: 'Últimas 2 DDJJ de Bienes Personales', descripcion: 'Declaraciones juradas de Bienes Personales de los últimos 2 años con presentación y apertura detallada de bienes' },
    { id: 'dni', label: 'Copia DNI titular/socios y fiador', descripcion: 'Copia del DNI del titular o socios de la SH y del fiador de la operación, más última DDJJ de Bienes Personales o balance del fiador' },
    { id: 'patrimonio', label: 'Manifestación de Bienes / Estado Patrimonial', descripcion: 'Última manifestación de bienes o estado de situación patrimonial firmado' },
  ],
  juridica: [
    { id: 'anexo4', label: 'Anexo IV – Res 212/2013 con % de socios', descripcion: 'Formulario Anexo IV con el porcentaje de participación de cada socio' },
    { id: 'mipyme', label: 'Certificado MiPyME', descripcion: 'Certificado MiPyME vigente emitido por el Ministerio de Producción' },
    { id: 'resena', label: 'Reseña de actividad', descripcion: 'Texto describiendo la actividad principal de la empresa' },
    { id: 'bbpp_socios', label: 'DDJJ Bienes Personales de los socios', descripcion: 'Última DDJJ de Bienes Personales de cada socio con presentación y apertura de bienes. Si el CPN que firma no coincide con el que firma el balance, su firma debe estar certificada por el Consejo Profesional' },
    { id: 'estatuto', label: 'Estatuto o contrato social', descripcion: 'Copia del estatuto o contrato social y todas sus modificaciones' },
    { id: 'acta', label: 'Última acta de asamblea', descripcion: 'Última acta de asamblea con designación de autoridades vigentes' },
    { id: 'eecc', label: 'Últimos estados contables', descripcion: 'Copia simple de los últimos estados contables (balance) certificados por Consejo Profesional de Ciencias Económicas. Deben ser recientes, idealmente del último ejercicio cerrado' },
    { id: 'dni', label: 'Copia DNI de los socios', descripcion: 'Copia del DNI de todos los socios' },
    { id: 'ventas_post', label: 'Ventas mensuales post balance', descripcion: 'Detalle de ventas mensuales del período posterior al cierre del último balance' },
    { id: 'deudas', label: 'Detalle de deuda', descripcion: 'Detalle completo de deudas actuales de la empresa' },
  ]
}

async function extractTextFromFile(buffer, filename, mimeType) {
  const ext = filename.toLowerCase().split('.').pop()
  
  try {
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
      const data = await pdfParse(buffer)
      return data.text || ''
    }
    
    if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    }
    
    if (ext === 'doc') {
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    }
    
    if (ext === 'xlsx' || ext === 'xls' || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      const XLSX = (await import('xlsx')).default
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let text = ''
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name]
        text += `[Hoja: ${name}]\n`
        text += XLSX.utils.sheet_to_csv(sheet) + '\n'
      })
      return text
    }
    
    if (ext === 'txt' || mimeType === 'text/plain') {
      return buffer.toString('utf-8')
    }

    // Images: return placeholder so Gemini knows it's an image
    if (['jpg','jpeg','png','gif','webp','bmp','tiff'].includes(ext) || mimeType?.startsWith('image/')) {
      return `[IMAGEN: ${filename} — contenido visual, no texto extraíble automáticamente]`
    }

    return `[Archivo ${filename}: formato no soportado para extracción de texto]`
  } catch (e) {
    return `[Error al leer ${filename}: ${e.message}]`
  }
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    let formData
    try {
      formData = await request.formData()
    } catch (e) {
      return NextResponse.json({ 
        error: 'Los archivos superan el límite. Subí los archivos en tandas más chicas (máx 15MB por vez).' 
      }, { status: 413 })
    }

    const tipo = formData.get('tipo')
    const esRenovacion = formData.get('renovacion') === 'true'
    const esAgro = formData.get('agropecuaria') === 'true'
    const esConstruccion = formData.get('construccion') === 'true'
    const files = formData.getAll('archivos')

    if (!files.length) return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 })

    const documentos = []
    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const texto = await extractTextFromFile(buffer, file.name, file.type)
        documentos.push({ nombre: file.name, tipo: file.type, texto: texto.slice(0, 5000) })
      } catch (e) {
        documentos.push({ nombre: file.name, tipo: file.type, texto: '[Error al leer el archivo: ' + e.message + ']' })
      }
    }

    // Build checklist for this operation type
    let checklist = [...CHECKLIST[tipo]]
    
    if (esAgro) {
      checklist.push(
        { id: 'form_agro', label: 'Formulario Agropecuario', descripcion: 'Formulario específico para actividad agropecuaria' },
        { id: 'senasa', label: 'Stock SENASA', descripcion: 'Certificado o detalle de stock de hacienda del SENASA' },
        { id: 'sisa_ip1', label: 'SISA IP1', descripcion: 'Formulario SISA IP1 del sistema de información simplificada agrícola' },
        { id: 'sisa_ip2', label: 'SISA IP2', descripcion: 'Formulario SISA IP2 del sistema de información simplificada agrícola' }
      )
    }
    if (esConstruccion) {
      checklist.push({ id: 'backlog', label: 'Backlog de obras en curso', descripcion: 'Detalle de obras actualmente en ejecución con estado de avance' })
    }
    
    // Remove items not needed for renovation
    if (esRenovacion) {
      const excluirFisica = ['resena', 'dni']
      const excluirJuridica = ['resena', 'estatuto', 'dni']
      const excluir = tipo === 'fisica' ? excluirFisica : excluirJuridica
      checklist = checklist.filter(item => !excluir.includes(item.id))
    }

    const currentYear = new Date().getFullYear()
    const docsText = documentos.map((d, i) => 
      `--- DOCUMENTO ${i+1}: "${d.nombre}" ---\n${d.texto}\n`
    ).join('\n')

    const checklistText = checklist.map(c => 
      `- ${c.id}: ${c.label} → ${c.descripcion}`
    ).join('\n')

    const prompt = `Sos un analista de riesgos de una Sociedad de Garantía Recíproca (SGR) argentina llamada Argenpymes. 
Tu tarea es analizar los documentos que subió un agente comercial y determinar si cumplen con los requisitos para el análisis de una PyME.

TIPO DE SOLICITANTE: ${tipo === 'fisica' ? 'Persona Física / Sociedad de Hecho' : 'Persona Jurídica'}
ES RENOVACIÓN: ${esRenovacion ? 'SÍ' : 'NO'}
ES AGROPECUARIA: ${esAgro ? 'SÍ' : 'NO'}
ES CONSTRUCCIÓN: ${esConstruccion ? 'SÍ' : 'NO'}
AÑO ACTUAL: ${currentYear}

DOCUMENTOS RECIBIDOS:
${docsText}

REQUISITOS A VERIFICAR:
${checklistText}

INSTRUCCIONES IMPORTANTES:
1. Analizá el CONTENIDO REAL de cada documento, no el nombre del archivo
2. Para cada requisito, determiná si está CUMPLIDO, INCOMPLETO o FALTANTE
3. Sé muy específico: si falta la certificación del Consejo Profesional, decilo. Si el balance es del año anterior al requerido, decilo con el año concreto
4. Si un documento está presente pero le falta algo (firma, certificación, fecha, etc.), marcalo como INCOMPLETO con detalle
5. Chequeá fechas: balances, DDJJ y certificados deben ser recientes. El año actual es ${currentYear}
6. Si el Certificado MiPyME está vencido (tiene vigencia de 1 año), marcalo
7. Si el Anexo IV tiene más de 1 año, marcalo como vencido
8. No te fiés del nombre del archivo — un archivo llamado "balance.pdf" puede ser otra cosa

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto antes ni después:
{
  "resumen": "Texto breve de 1-2 oraciones describiendo el estado general del paquete",
  "estado_general": "completo" | "incompleto" | "con_observaciones",
  "resultados": [
    {
      "id": "id_del_requisito",
      "label": "nombre del requisito",
      "estado": "ok" | "incompleto" | "faltante",
      "archivo_encontrado": "nombre del archivo donde se encontró o null",
      "observacion": "detalle específico del problema o confirmación de que está bien"
    }
  ],
  "documentos_no_identificados": ["lista de archivos que no pudieron asociarse a ningún requisito"]
}`

    const respuesta = await callGemini(prompt, apiKey)
    
    // Parse JSON from response
    let resultado
    try {
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/)
      resultado = JSON.parse(jsonMatch ? jsonMatch[0] : respuesta)
    } catch {
      return NextResponse.json({ error: 'Error al procesar la respuesta de la IA', raw: respuesta }, { status: 500 })
    }

    return NextResponse.json(resultado)

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
