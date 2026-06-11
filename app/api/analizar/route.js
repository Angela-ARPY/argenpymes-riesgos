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
    { id: 'bbpp_socios', label: 'DDJJ Bienes Personales de los socios', descripcion: 'Última DDJJ de Bienes Personales de cada socio con presentación y apertura de bienes' },
    { id: 'estatuto', label: 'Estatuto o contrato social', descripcion: 'Copia del estatuto o contrato social y todas sus modificaciones' },
    { id: 'acta', label: 'Última acta de asamblea', descripcion: 'Última acta de asamblea con designación de autoridades vigentes' },
    { id: 'eecc', label: 'Últimos estados contables', descripcion: 'Copia simple de los últimos estados contables certificados por Consejo Profesional de Ciencias Económicas' },
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
    if (ext === 'docx' || ext === 'doc') {
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = (await import('xlsx')).default
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let text = ''
      workbook.SheetNames.forEach(name => {
        text += XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + '\n'
      })
      return text
    }
    if (ext === 'txt') return buffer.toString('utf-8')
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return `[IMAGEN: ${filename}]`
    return `[Formato no soportado: ${filename}]`
  } catch (e) {
    return `[Error al leer ${filename}: ${e.message}]`
  }
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    })
  })
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// POST /api/analizar — receives ONE file at a time + metadata
export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const body = await request.json()
    const { tipo, renovacion, agropecuaria, construccion, archivos } = body
    // archivos: [{ nombre, contenido_base64, mimeType }]

    if (!archivos || !archivos.length) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 })
    }

    let checklist = [...CHECKLIST[tipo]]
    const excluirFisica = ['resena', 'dni']
    const excluirJuridica = ['resena', 'estatuto', 'dni']

    if (renovacion) {
      const excluir = tipo === 'fisica' ? excluirFisica : excluirJuridica
      checklist = checklist.filter(i => !excluir.includes(i.id))
    }
    if (agropecuaria) {
      checklist.push(
        { id: 'form_agro', label: 'Formulario Agropecuario', descripcion: 'Formulario específico para actividad agropecuaria' },
        { id: 'senasa', label: 'Stock SENASA', descripcion: 'Certificado o detalle de stock del SENASA' },
        { id: 'sisa_ip1', label: 'SISA IP1', descripcion: 'Formulario SISA IP1' },
        { id: 'sisa_ip2', label: 'SISA IP2', descripcion: 'Formulario SISA IP2' }
      )
    }
    if (construccion) {
      checklist.push({ id: 'backlog', label: 'Backlog de obras en curso', descripcion: 'Detalle de obras en ejecución' })
    }

    // Extract text from each file
    const documentos = []
    for (const arch of archivos) {
      const buffer = Buffer.from(arch.contenido_base64, 'base64')
      const texto = await extractTextFromFile(buffer, arch.nombre, arch.mimeType)
      documentos.push({ nombre: arch.nombre, texto: texto.slice(0, 4000) })
    }

    const currentYear = new Date().getFullYear()
    const docsText = documentos.map((d, i) => `--- DOCUMENTO ${i+1}: "${d.nombre}" ---\n${d.texto}\n`).join('\n')
    const checklistText = checklist.map(c => `- ${c.id}: ${c.label} → ${c.descripcion}`).join('\n')

    const prompt = `Sos un analista de riesgos de Argenpymes SGR. Analizá los documentos y verificá si cumplen los requisitos.

TIPO: ${tipo === 'fisica' ? 'Persona Física / SH' : 'Persona Jurídica'}
ES RENOVACIÓN: ${renovacion ? 'SÍ' : 'NO'}
ES AGROPECUARIA: ${agropecuaria ? 'SÍ' : 'NO'}
ES CONSTRUCCIÓN: ${construccion ? 'SÍ' : 'NO'}
AÑO ACTUAL: ${currentYear}

DOCUMENTOS:
${docsText}

REQUISITOS:
${checklistText}

INSTRUCCIONES:
1. Analizá el CONTENIDO REAL, no el nombre del archivo
2. Para cada requisito: CUMPLIDO, INCOMPLETO o FALTANTE
3. Sé específico: si falta certificación, firma, o el año es incorrecto, decilo con detalle
4. Chequeá fechas: balances y DDJJ deben ser del ejercicio más reciente (${currentYear} o ${currentYear-1})
5. Si el Certificado MiPyME está vencido (vigencia 1 año), marcalo
6. No te fiés del nombre del archivo

Respondé SOLO con JSON válido, sin texto antes ni después:
{
  "resumen": "1-2 oraciones sobre el estado general",
  "estado_general": "completo" | "incompleto" | "con_observaciones",
  "resultados": [
    {
      "id": "id_requisito",
      "label": "nombre",
      "estado": "ok" | "incompleto" | "faltante",
      "archivo_encontrado": "nombre archivo o null",
      "observacion": "detalle específico"
    }
  ],
  "documentos_no_identificados": ["archivos que no corresponden a ningún requisito"]
}`

    const respuesta = await callGemini(prompt, apiKey)
    let resultado
    try {
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/)
      resultado = JSON.parse(jsonMatch ? jsonMatch[0] : respuesta)
    } catch {
      return NextResponse.json({ error: 'Error al procesar respuesta de IA', raw: respuesta }, { status: 500 })
    }

    return NextResponse.json(resultado)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
