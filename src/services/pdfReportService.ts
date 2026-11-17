import { jsPDF } from 'jspdf'
import {
  complianceRisks,
  policyComparison,
  testCases,
  type ComplianceRisk,
  type TestCase,
} from '../data/complianceAnalysis'

export type ComplianceReportData = {
  fileName: string
  workflowId: string
  generatedAt: Date
  reportId: string
}

export function createComplianceReportId() {
  return `CIDAN-${createUniqueToken()}`
}

function createUniqueToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()
}

function pdfText(value: string) {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}

function addComplianceReportContent(doc: jsPDF, data: ComplianceReportData) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  const bottomLimit = pageHeight - 22
  let y = margin

  const colors = {
    navy: [16, 19, 49] as [number, number, number],
    purple: [118, 80, 245] as [number, number, number],
    muted: [92, 102, 125] as [number, number, number],
    line: [215, 220, 232] as [number, number, number],
    pale: [244, 246, 251] as [number, number, number],
    green: [28, 125, 76] as [number, number, number],
    amber: [158, 105, 22] as [number, number, number],
    red: [174, 53, 68] as [number, number, number],
  }

  function addPageIfNeeded(height: number) {
    if (y + height > bottomLimit) {
      doc.addPage()
      y = margin
    }
  }

  function writeText(text: string, x: number, top: number, width: number, fontSize: number, color: [number, number, number], bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(pdfText(text), width) as string[]
    const lineHeight = fontSize * 0.48
    for (const line of lines) {
      addPageIfNeeded(lineHeight + 1)
      doc.text(line, x, y + lineHeight)
      y += lineHeight
    }
    y = Math.max(y, top + lineHeight)
    return lines.length * lineHeight
  }

  function sectionHeading(title: string) {
    addPageIfNeeded(16)
    y += 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...colors.navy)
    doc.text(pdfText(title), margin, y + 4)
    y += 8
    doc.setDrawColor(...colors.purple)
    doc.setLineWidth(0.65)
    doc.line(margin, y, margin + 18, y)
    y += 5
  }

  function drawTable(headers: string[], rows: Array<{ cells: string[]; statusColor?: [number, number, number] }>, widths: number[]) {
    const padding = 3
    const fontSize = 8
    const lineHeight = 4.1
    const headerHeight = 9

    addPageIfNeeded(headerHeight)
    doc.setFillColor(...colors.pale)
    doc.setDrawColor(...colors.line)
    doc.rect(margin, y, contentWidth, headerHeight, 'FD')
    let x = margin
    headers.forEach((header, index) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSize)
      doc.setTextColor(...colors.navy)
      const lines = doc.splitTextToSize(pdfText(header), widths[index] - padding * 2) as string[]
      doc.text(lines, x + padding, y + 5.8)
      x += widths[index]
    })
    y += headerHeight

    rows.forEach((row) => {
      const cellLines = row.cells.map((cell, index) => {
        doc.setFont('helvetica', index === 0 ? 'bold' : 'normal')
        doc.setFontSize(fontSize)
        return doc.splitTextToSize(pdfText(cell), widths[index] - padding * 2) as string[]
      })
      const rowHeight = Math.max(9, ...cellLines.map((lines) => lines.length * lineHeight + padding * 2))
      addPageIfNeeded(rowHeight)
      doc.setDrawColor(...colors.line)
      doc.setFillColor(255, 255, 255)
      doc.rect(margin, y, contentWidth, rowHeight, 'FD')
      x = margin
      cellLines.forEach((lines, index) => {
        doc.setFont('helvetica', index === 0 ? 'bold' : 'normal')
        doc.setFontSize(fontSize)
        doc.setTextColor(...(index === row.cells.length - 1 && row.statusColor ? row.statusColor : colors.muted))
        doc.text(lines, x + padding, y + padding + 3.2)
        if (index > 0) doc.line(x, y, x, y + rowHeight)
        x += widths[index]
      })
      y += rowHeight
    })
    y += 4
  }

  function drawInfoCard(label: string, value: string, highlight: boolean) {
    const textWidth = contentWidth - 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(pdfText(value), textWidth) as string[]
    const boxHeight = 11 + lines.length * 4.6
    addPageIfNeeded(boxHeight + 3)
    doc.setFillColor(...(highlight ? [240, 249, 246] as [number, number, number] : [250, 251, 253] as [number, number, number]))
    doc.setDrawColor(...(highlight ? [179, 220, 204] as [number, number, number] : colors.line))
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...(highlight ? colors.green : colors.navy))
    doc.text(pdfText(label), margin + 4, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colors.muted)
    doc.text(lines, margin + 4, y + 10)
    y += boxHeight + 3
  }

  function drawRisk(risk: ComplianceRisk) {
    const severityColor = risk.severity === 'red' ? colors.red : risk.severity === 'amber' ? colors.amber : colors.muted
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const descriptionLines = doc.splitTextToSize(pdfText(risk.description), contentWidth - 12) as string[]
    const titleLines = doc.splitTextToSize(pdfText(`${risk.category}: ${risk.title}`), contentWidth - 12) as string[]
    const cardHeight = 7 + titleLines.length * 4.2 + descriptionLines.length * 4.1 + 4
    addPageIfNeeded(cardHeight)
    doc.setDrawColor(...colors.line)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD')
    doc.setFillColor(...severityColor)
    doc.circle(margin + 4, y + 5, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...severityColor)
    doc.text(titleLines, margin + 9, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.muted)
    doc.text(descriptionLines, margin + 9, y + 6 + titleLines.length * 4.2)
    y += cardHeight + 3
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...colors.navy)
  doc.text('CIDAN REGULATORY COMPLIANCE AI', margin, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colors.muted)
  doc.text('Automated Regulatory Ingestion & Validation Report', margin, y + 13)
  doc.setFillColor(255, 245, 224)
  doc.setDrawColor(238, 216, 174)
  doc.roundedRect(pageWidth - margin - 35, y, 35, 8, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...colors.amber)
  doc.text('REVIEW PENDING', pageWidth - margin - 32.5, y + 5.2)
  y += 18
  doc.setDrawColor(...colors.navy)
  doc.setLineWidth(0.7)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  sectionHeading('REPORT METADATA')
  const metaRows = [
    [`Report ID: ${data.reportId}`, `Workflow ID: ${data.workflowId}`],
    [`Generated At: ${data.generatedAt.toLocaleString()}`, `Source Circular: ${data.fileName}`],
    ['Target Sector: Personal Loan & Consumer Credit', 'Review Status: Awaiting Compliance Officer Signature'],
  ]
  metaRows.forEach((row) => {
    const colWidth = contentWidth / 2 - 3
    const leftLines = doc.splitTextToSize(pdfText(row[0]), colWidth - 4) as string[]
    const rightLines = doc.splitTextToSize(pdfText(row[1]), colWidth - 4) as string[]
    const rowHeight = Math.max(11, Math.max(leftLines.length, rightLines.length) * 4.3 + 5)
    addPageIfNeeded(rowHeight)
    doc.setFillColor(250, 251, 253)
    doc.setDrawColor(...colors.line)
    doc.roundedRect(margin, y, colWidth, rowHeight, 1.5, 1.5, 'FD')
    doc.roundedRect(margin + colWidth + 6, y, colWidth, rowHeight, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colors.muted)
    doc.text(leftLines, margin + 3, y + 5)
    doc.text(rightLines, margin + colWidth + 9, y + 5)
    y += rowHeight + 2
  })

  sectionHeading('1. EXECUTIVE METRICS SUMMARY')
  const passedCount = testCases.filter((test) => test.status === 'PASS').length
  const reviewCount = testCases.filter((test) => test.status === 'NEEDS REVIEW').length
  const metrics = [
    { cells: ['Obligations extracted', '1', 'OBL-001 - human confirmation required'], statusColor: colors.amber },
    { cells: ['Policy gap findings', String(complianceRisks.filter((risk) => risk.category === 'POLICY GAP ISSUE').length), 'Requires human review'], statusColor: colors.amber },
    { cells: ['Test cases passed', `${passedCount} / ${testCases.length}`, `${reviewCount} needs review`], statusColor: reviewCount ? colors.amber : colors.green },
    { cells: ['Draft rules generated', '1', 'Sandbox baseline - review pending'], statusColor: colors.amber },
  ]
  drawTable(['Metric', 'Count', 'Audit status'], metrics, [55, 22, contentWidth - 77])

  sectionHeading('2. RULE EVOLUTION (OLD RULE VS NEW RULE ADDED)')
  drawInfoCard(
    'OLD RULE - Existing Handbook',
    `Existing Rule: ${policyComparison.oldRule.title}. ${policyComparison.oldRule.description}`,
    false,
  )
  drawInfoCard(
    `NEW RULE ADDED - ${policyComparison.newRule.badge}`,
    `${policyComparison.newRule.title}. ${policyComparison.newRule.description}`,
    true,
  )

  sectionHeading('3. TEST CASES PERFORMED TO VERIFY')
  drawTable(
    ['ID', 'Test scenario', 'Result'],
    testCases.map((test: TestCase) => ({
      cells: [test.id, `${test.title}: ${test.description}`, test.status],
      statusColor: test.status === 'PASS' ? colors.green : colors.amber,
    })),
    [24, contentWidth - 54, 30],
  )

  sectionHeading('4. PROBLEMS & ACTIONABLE RISKS')
  complianceRisks.forEach(drawRisk)

  sectionHeading('5. REVIEW AND VERIFICATION')
  addPageIfNeeded(24)
  doc.setFillColor(255, 250, 240)
  doc.setDrawColor(238, 216, 174)
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD')
  doc.setFillColor(255, 242, 216)
  doc.circle(margin + 8, y + 10, 4, 'F')
  doc.setFillColor(...colors.amber)
  doc.circle(margin + 6.2, y + 10, 0.5, 'F')
  doc.circle(margin + 8, y + 10, 0.5, 'F')
  doc.circle(margin + 9.8, y + 10, 0.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...colors.amber)
  doc.text('Reviewed & Verified By:', margin + 16, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colors.navy)
  doc.text('Awaiting Compliance Officer Signature', margin + 16, y + 14)
  y += 25

  y += 2
  const disclaimer =
    'Disclaimer: This report is generated by the CIDAN Regulatory Compliance AI prototype for demonstration and review purposes. Findings require validation by authorized compliance professionals. This report does not constitute legal advice, official regulatory approval, or confirmation of final compliance.'
  writeText(disclaimer, margin, y, contentWidth, 7.5, colors.muted)

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.35)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...colors.muted)
    doc.text('CIDAN - Regulatory Compliance AI | Confidential', margin, pageHeight - 9)
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' })
  }
}

export function generateComplianceReport(data: ComplianceReportData) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true })
  addComplianceReportContent(doc, data)
  return doc.output('blob')
}
