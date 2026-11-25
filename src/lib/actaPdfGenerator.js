import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Genera y descarga directamente un PDF oficial del Acta de Ubicación y Evaluación 2026,
 * replicando el diseño de la vista previa oficial en formato Carta vertical.
 */
export function downloadActaOficialPDF(actaToPrint, getEvaluationPlacementData) {
  if (!actaToPrint) return

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2
  let y = 15

  // 1. Membrete Institucional Oficial
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(49, 46, 129) // indigo-900
  doc.text(
    'REPÚBLICA DE EL SALVADOR • MINISTERIO DE EDUCACIÓN, CIENCIA Y TECNOLOGÍA',
    pageWidth / 2,
    y,
    { align: 'center' }
  )

  y += 6
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(17, 24, 39) // gray-900
  doc.text('COLEGIO SALESIANO SAN JOSÉ', pageWidth / 2, y, { align: 'center' })

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(75, 85, 99) // gray-600
  doc.text(
    'DEPARTAMENTO DE IDIOMAS EXTRANJEROS • EVALUACIÓN DIAGNÓSTICA DE INGLÉS 2026',
    pageWidth / 2,
    y,
    { align: 'center' }
  )

  // Pill: ACTA OFICIAL DE UBICACIÓN Y COMPETENCIAS MCER
  y += 4.5
  const pillText = 'ACTA OFICIAL DE UBICACIÓN Y COMPETENCIAS MCER'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  const pillWidth = doc.getTextWidth(pillText) + 12
  const pillX = (pageWidth - pillWidth) / 2
  doc.setFillColor(243, 244, 246)
  doc.setDrawColor(209, 213, 219)
  doc.roundedRect(pillX, y, pillWidth, 6.5, 3, 3, 'FD')
  doc.setTextColor(31, 41, 55)
  doc.text(pillText, pageWidth / 2, y + 4.4, { align: 'center' })

  y += 10
  doc.setDrawColor(31, 41, 55)
  doc.setLineWidth(0.5)
  doc.line(marginX, y, pageWidth - marginX, y)

  // 2. Metadatos del Acta (4 columnas)
  y += 5
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginX, y, contentWidth, 14, 2.5, 2.5, 'FD')

  const metaCols = [
    { label: 'GRADO / NIVEL:', value: String(actaToPrint.grade || '') },
    { label: 'FILTRO DE NIVEL:', value: String(actaToPrint.level || '') },
    { label: 'DOCENTE / EVALUADOR:', value: String(actaToPrint.teacher || '') },
    {
      label: 'FECHA DE EMISIÓN:',
      value: actaToPrint.generatedAt
        ? new Date(actaToPrint.generatedAt).toLocaleDateString('es-SV')
        : new Date().toLocaleDateString('es-SV')
    }
  ]

  const colW = contentWidth / 4
  metaCols.forEach((col, i) => {
    const cx = marginX + 4 + i * colW
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(156, 163, 175)
    doc.text(col.label, cx, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(17, 24, 39)
    const clipped = doc.splitTextToSize(col.value, colW - 6)[0] || col.value
    doc.text(clipped, cx, y + 10)
  })

  // 3. Resumen de Distribución de Grupos
  y += 18
  const items = actaToPrint.items || []
  const total = items.length
  const countByCat = (catKey) =>
    items.filter(it => getEvaluationPlacementData(it).category === catKey).length
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)

  const basicCount = countByCat('basic')
  const interCount = countByCat('intermediate')
  const advCount = countByCat('advanced')

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(marginX, y, contentWidth, 17, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(55, 65, 81)
  doc.text('DISTRIBUCIÓN DE UBICACIÓN OFICIAL EN MATRIZ (LIBROS Y GRUPOS):', marginX + 4, y + 5.5)

  const chips = [
    `Básico (0-40%): ${basicCount} alumnos (${pct(basicCount)}%)`,
    `Intermedio (41-70%): ${interCount} alumnos (${pct(interCount)}%)`,
    `Avanzado (>=71%): ${advCount} alumnos (${pct(advCount)}%)`
  ]

  let chipX = marginX + 4
  const chipY = y + 8.5
  doc.setFontSize(7.2)
  chips.forEach((txt) => {
    const w = doc.getTextWidth(txt) + 5
    doc.setFillColor(243, 244, 246)
    doc.setDrawColor(209, 213, 219)
    doc.roundedRect(chipX, chipY, w, 6, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(txt, chipX + 2.5, chipY + 4.1)
    chipX += w + 2.5
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(17, 24, 39)
  doc.text(`Total Registros: ${total}`, pageWidth - marginX - 4, y + 13.5, { align: 'right' })

  // 4. Tabla del Acta Oficial
  y += 21
  const tableRows = items.map((it, idx) => {
    const p = getEvaluationPlacementData(it)
    return [
      String(idx + 1),
      it.studentCarnet || 'N/A',
      it.studentName || '',
      `${it.grade || ''} - ${it.section || ''}`,
      p.group || '',
      `${p.scorePercent}%`,
      p.cefr || '',
      it.teacherName || it.teacherEmail || 'Docente',
      it.completedAt ? new Date(it.completedAt).toLocaleDateString('es-SV') : 'Hoy'
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, top: 14, bottom: 18 },
    head: [[
      'N°',
      'CARNET',
      'NOMBRE COMPLETO DEL ESTUDIANTE',
      'GRADO / SECC.',
      'NIVEL MATRIZ (GRUPO)',
      'PUNTAJE GLOBAL (%)',
      'MCER',
      'DOCENTE EVALUADOR',
      'FECHA'
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { fontStyle: 'bold', cellWidth: 19 },
      2: { fontStyle: 'bold', cellWidth: 46 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 13 },
      7: { cellWidth: 26 },
      8: { halign: 'center', cellWidth: 18 }
    },
    didDrawPage: (data) => {
      // Número de página discreto al pie
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(156, 163, 175)
      doc.text(
        `Colegio Salesiano San José • Acta Oficial 2026 • Pág. ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
    }
  })

  // 5. Cláusula de Validez y Bloque de Firmas Oficiales
  let finalY = (doc.lastAutoTable?.finalY || y) + 10
  if (finalY + 38 > pageHeight - 14) {
    doc.addPage()
    finalY = 24
  }

  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.3)
  doc.line(marginX, finalY, pageWidth - marginX, finalY)

  finalY += 6
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(75, 85, 99)
  doc.text(
    'Se hace constar que los resultados anteriores corresponden a la evaluación diagnóstica estandarizada, aplicada conforme al Marco Común Europeo de Referencia (MCER).',
    pageWidth / 2,
    finalY,
    { align: 'center', maxWidth: contentWidth }
  )

  const sigY = finalY + 22
  const sigW = (contentWidth - 16) / 3
  const signatures = [
    { name: String(actaToPrint.teacher || 'Docente Evaluador'), role: 'DOCENTE EVALUADOR / TITULAR' },
    { name: 'Coordinación Pedagógica', role: 'ÁREA DE INGLÉS & BILINGÜISMO' },
    { name: 'Dirección Académica', role: 'COLEGIO SALESIANO SAN JOSÉ' }
  ]

  signatures.forEach((sig, i) => {
    const sx = marginX + i * (sigW + 8)
    doc.setDrawColor(107, 114, 128)
    doc.setLineWidth(0.3)
    doc.line(sx, sigY, sx + sigW, sigY)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(31, 41, 55)
    doc.text(sig.name, sx + sigW / 2, sigY + 4.5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(107, 114, 128)
    doc.text(sig.role, sx + sigW / 2, sigY + 8.5, { align: 'center' })
  })

  const safeGrade = String(actaToPrint.grade || 'General').replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateTag = new Date().toISOString().slice(0, 10)
  doc.save(`Acta_Oficial_2026_${safeGrade}_${dateTag}.pdf`)
}
