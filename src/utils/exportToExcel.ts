import * as ExcelJS from 'exceljs'
import type { Cell, Workbook, Worksheet } from 'exceljs'
import type { Account, Goal, Transaction, UserPreferences } from '../types'
import { categoryExpenses, currentBalance, totals } from './calculations'
import { daysUntil } from './format'

const COLORS = {
  navy: 'FF07111F',
  navy2: 'FF0B1728',
  navy3: 'FF122238',
  blue: 'FF2D8CFF',
  blueSoft: 'FFDCEBFF',
  white: 'FFFFFFFF',
  text: 'FF172033',
  muted: 'FF667085',
  light: 'FFF6F8FB',
  line: 'FFD8E0EA',
  green: 'FF16A36A',
  greenSoft: 'FFE6F6EF',
  yellow: 'FFF4B740',
  yellowSoft: 'FFFFF4D6',
  orange: 'FFF28C28',
  orangeSoft: 'FFFFEAD8',
  red: 'FFE5484D',
  redSoft: 'FFFFE5E6',
}

const currencyFormat = 'R$ #,##0.00;[Red]-R$ #,##0.00'
const percentFormat = '0.0%'
const dateFormat = 'dd/mm/yyyy'

const safe = (value?: string) => {
  if (!value) return ''
  const trimmed = value.trim()
  return /^[=+\-@]/.test(trimmed) ? `'${value}` : value
}

const asDate = (iso: string) => new Date(`${iso}T12:00:00`)

const saveWorkbook = async (workbook: Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

const todayFile = () => new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')

const setWorkbookMetadata = (workbook: Workbook) => {
  workbook.creator = 'Web Kivora Finance'
  workbook.lastModifiedBy = 'Web Kivora Finance'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.company = 'Web Kivora'
  workbook.subject = 'Relatório de gestão financeira'
  workbook.title = 'Web Kivora Finance — Relatório Financeiro'
  workbook.description = 'Relatório financeiro gerado pelo Web Kivora Finance.'
}

const configureSheet = (sheet: Worksheet, tabColor = COLORS.blue) => {
  sheet.properties.tabColor = { argb: tabColor }
  sheet.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }]
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
  }
  sheet.headerFooter.oddFooter = '&LWeb Kivora Finance&CRelatório financeiro&R&P / &N'
}

const paintTitle = (sheet: Worksheet, title: string, subtitle: string, endColumn: number) => {
  sheet.mergeCells(1, 1, 1, endColumn)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = title
  titleCell.font = { name: 'Aptos Display', size: 22, bold: true, color: { argb: COLORS.white } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(1).height = 38

  sheet.mergeCells(2, 1, 2, endColumn)
  const subtitleCell = sheet.getCell(2, 1)
  subtitleCell.value = subtitle
  subtitleCell.font = { name: 'Aptos', size: 10, color: { argb: 'FFD5DDEA' } }
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy2 } }
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(2).height = 24
}

const sectionTitle = (sheet: Worksheet, row: number, title: string, start = 1, end = 8) => {
  sheet.mergeCells(row, start, row, end)
  const cell = sheet.getCell(row, start)
  cell.value = title
  cell.font = { name: 'Aptos', size: 12, bold: true, color: { argb: COLORS.white } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy3 } }
  cell.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(row).height = 24
}

const styleHeader = (cell: Cell) => {
  cell.font = { name: 'Aptos', bold: true, color: { argb: COLORS.white } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy2 } }
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  cell.border = {
    bottom: { style: 'thin', color: { argb: COLORS.blue } },
  }
}

const styleBodyRow = (sheet: Worksheet, rowNumber: number, colCount: number, striped = false) => {
  const row = sheet.getRow(rowNumber)
  row.height = 20
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col)
    cell.font = { name: 'Aptos', size: 10, color: { argb: COLORS.text } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: striped ? 'FFF8FAFD' : COLORS.white } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'hair', color: { argb: COLORS.line } } }
  }
}

const addTableHeader = (sheet: Worksheet, rowNumber: number, headers: string[]) => {
  const row = sheet.getRow(rowNumber)
  row.values = headers
  row.height = 28
  headers.forEach((_, index) => styleHeader(row.getCell(index + 1)))
}

const addEmptyMessage = (sheet: Worksheet, row: number, colCount: number, message: string) => {
  sheet.mergeCells(row, 1, row + 1, colCount)
  const cell = sheet.getCell(row, 1)
  cell.value = message
  cell.font = { italic: true, color: { argb: COLORS.muted } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.light } }
}

const addTotalRow = (sheet: Worksheet, row: number, labelColumn: number, valueColumn: number, label: string, value: number, colCount: number) => {
  for (let col = 1; col <= colCount; col++) {
    const cell = sheet.getCell(row, col)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueSoft } }
    cell.border = { top: { style: 'thin', color: { argb: COLORS.blue } } }
  }
  sheet.getCell(row, labelColumn).value = label
  sheet.getCell(row, labelColumn).font = { bold: true, color: { argb: COLORS.text } }
  sheet.getCell(row, valueColumn).value = value
  sheet.getCell(row, valueColumn).numFmt = currencyFormat
  sheet.getCell(row, valueColumn).font = { bold: true, color: { argb: COLORS.text } }
}

const priority = (account: Account) => {
  if (account.status === 'pago' || account.status === 'recebido') return { label: 'Concluído', color: COLORS.greenSoft, font: COLORS.green }
  const days = daysUntil(account.dueDate)
  if (days < 0 || account.status === 'atrasado') return { label: 'Crítica', color: COLORS.redSoft, font: COLORS.red }
  if (days <= 1) return { label: 'Crítica', color: COLORS.redSoft, font: COLORS.red }
  if (days <= 4) return { label: 'Alta', color: COLORS.orangeSoft, font: COLORS.orange }
  if (days <= 8) return { label: 'Média', color: COLORS.yellowSoft, font: 'FF946200' }
  return { label: 'Baixa', color: COLORS.greenSoft, font: COLORS.green }
}

const dueText = (account: Account) => {
  if (account.status === 'pago') return 'Pago'
  if (account.status === 'recebido') return 'Recebido'
  const days = daysUntil(account.dueDate)
  if (days < 0) return `Atrasada há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${days} dias`
}

const monthRows = (transactions: Transaction[], months = 12) => {
  const now = new Date()
  return Array.from({ length: months }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1)
    const year = date.getFullYear()
    const month = date.getMonth()
    const items = transactions.filter((item) => {
      const itemDate = asDate(item.date)
      return itemDate.getFullYear() === year && itemDate.getMonth() === month
    })
    const revenue = items.filter((x) => x.type === 'receita').reduce((sum, x) => sum + x.amount, 0)
    const expenses = items.filter((x) => x.type === 'despesa').reduce((sum, x) => sum + x.amount, 0)
    const result = revenue - expenses
    return {
      period: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date),
      revenue,
      expenses,
      result,
      savingsRate: revenue > 0 ? result / revenue : 0,
    }
  })
}

const reportPeriod = (transactions: Transaction[]) => {
  if (!transactions.length) return 'Sem movimentações registradas'
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  const format = (iso: string) => asDate(iso).toLocaleDateString('pt-BR')
  return `${format(sorted[0].date)} a ${format(sorted[sorted.length - 1].date)}`
}

const addKpi = (
  sheet: Worksheet,
  range: string,
  label: string,
  value: number | string,
  options?: { money?: boolean; percent?: boolean; accent?: string },
) => {
  const [start, end] = range.split(':')
  const startCell = sheet.getCell(start)
  const endCell = sheet.getCell(end)
  const startRow = startCell.row
  const endRow = endCell.row
  const startCol = startCell.col
  const endCol = endCell.col
  sheet.mergeCells(startRow, startCol, startRow, endCol)
  sheet.mergeCells(startRow + 1, startCol, endRow, endCol)

  const labelCell = sheet.getCell(startRow, startCol)
  labelCell.value = label
  labelCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: COLORS.muted } }
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.light } }
  labelCell.alignment = { vertical: 'middle', horizontal: 'left' }

  const valueCell = sheet.getCell(startRow + 1, startCol)
  valueCell.value = value
  if (options?.money && typeof value === 'number') valueCell.numFmt = currencyFormat
  if (options?.percent && typeof value === 'number') valueCell.numFmt = percentFormat
  valueCell.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: options?.accent ?? COLORS.text } }
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } }
  valueCell.alignment = { vertical: 'middle', horizontal: 'left' }

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      sheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: COLORS.line } },
        left: { style: 'thin', color: { argb: COLORS.line } },
        bottom: { style: 'thin', color: { argb: COLORS.line } },
        right: { style: 'thin', color: { argb: COLORS.line } },
      }
    }
  }
}

const addTransactionSheet = (workbook: Workbook, name: string, items: Transaction[], title = name) => {
  const sheet = workbook.addWorksheet(name)
  configureSheet(sheet)
  paintTitle(sheet, `Web Kivora Finance — ${title}`, 'Detalhamento das movimentações financeiras', 8)
  sheet.getCell('A3').value = `Registros: ${items.length}`
  sheet.getCell('A3').font = { color: { argb: COLORS.muted }, italic: true }
  addTableHeader(sheet, 4, ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Forma de pagamento', 'Status', 'Observação'])

  if (!items.length) {
    addEmptyMessage(sheet, 5, 8, 'Nenhuma transação encontrada para este relatório.')
  } else {
    items.forEach((item, index) => {
      const rowNumber = index + 5
      const row = sheet.getRow(rowNumber)
      row.values = [
        asDate(item.date),
        item.type === 'receita' ? 'Receita' : 'Despesa',
        safe(item.description),
        safe(item.category),
        item.amount,
        safe(item.paymentMethod),
        item.status === 'confirmado' ? 'Confirmado' : 'Pendente',
        safe(item.notes),
      ]
      styleBodyRow(sheet, rowNumber, 8, index % 2 === 1)
      row.getCell(1).numFmt = dateFormat
      row.getCell(5).numFmt = currencyFormat
      const typeCell = row.getCell(2)
      typeCell.font = { bold: true, color: { argb: item.type === 'receita' ? COLORS.green : COLORS.red } }
    })
    const totalValue = items.reduce((sum, item) => sum + item.amount, 0)
    addTotalRow(sheet, items.length + 5, 4, 5, 'Total', totalValue, 8)
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: items.length + 4, column: 8 } }
  }

  sheet.columns = [
    { width: 14 }, { width: 13 }, { width: 30 }, { width: 20 }, { width: 17 }, { width: 22 }, { width: 16 }, { width: 34 },
  ]
  return sheet
}

const addAccountsSheet = (workbook: Workbook, name: string, items: Account[], kind: 'pagar' | 'receber') => {
  const sheet = workbook.addWorksheet(name)
  configureSheet(sheet, kind === 'pagar' ? COLORS.orange : COLORS.green)
  paintTitle(sheet, `Web Kivora Finance — ${name}`, kind === 'pagar' ? 'Controle de compromissos financeiros' : 'Controle de valores previstos para entrada', 11)
  sheet.getCell('A3').value = `Registros: ${items.length}`
  sheet.getCell('A3').font = { color: { argb: COLORS.muted }, italic: true }
  addTableHeader(sheet, 4, ['Vencimento', 'Nome', 'Descrição', 'Categoria', 'Valor', 'Status', 'Forma de pagamento', 'Prazo', 'Prioridade', 'Dias', 'Observação'])

  if (!items.length) {
    addEmptyMessage(sheet, 5, 11, 'Nenhuma conta encontrada para este relatório.')
  } else {
    items.forEach((item, index) => {
      const rowNumber = index + 5
      const days = daysUntil(item.dueDate)
      const p = priority(item)
      const row = sheet.getRow(rowNumber)
      row.values = [
        asDate(item.dueDate),
        safe(item.name),
        safe(item.description),
        safe(item.category),
        item.amount,
        safe(item.status),
        safe(item.paymentMethod),
        dueText(item),
        p.label,
        days,
        safe(item.notes),
      ]
      styleBodyRow(sheet, rowNumber, 11, index % 2 === 1)
      row.getCell(1).numFmt = dateFormat
      row.getCell(5).numFmt = currencyFormat
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.color } }
      row.getCell(9).font = { bold: true, color: { argb: p.font } }
      if (p.label === 'Crítica') row.getCell(8).font = { bold: true, color: { argb: COLORS.red } }
    })
    addTotalRow(sheet, items.length + 5, 4, 5, 'Total', items.reduce((sum, item) => sum + item.amount, 0), 11)
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: items.length + 4, column: 11 } }
  }

  sheet.columns = [
    { width: 14 }, { width: 24 }, { width: 30 }, { width: 18 }, { width: 17 }, { width: 15 },
    { width: 21 }, { width: 21 }, { width: 14 }, { width: 10 }, { width: 32 },
  ]
  return sheet
}

const addMonthlySheet = (workbook: Workbook, transactions: Transaction[]) => {
  const sheet = workbook.addWorksheet('Fluxo Mensal')
  configureSheet(sheet)
  paintTitle(sheet, 'Web Kivora Finance — Fluxo Mensal', 'Comparativo de receitas, despesas e resultado dos últimos 12 meses', 5)
  addTableHeader(sheet, 4, ['Período', 'Receitas', 'Despesas', 'Resultado', 'Taxa de poupança'])
  const data = monthRows(transactions)
  data.forEach((item, index) => {
    const rowNumber = index + 5
    const row = sheet.getRow(rowNumber)
    row.values = [item.period, item.revenue, item.expenses, item.result, item.savingsRate]
    styleBodyRow(sheet, rowNumber, 5, index % 2 === 1)
    row.getCell(2).numFmt = currencyFormat
    row.getCell(3).numFmt = currencyFormat
    row.getCell(4).numFmt = currencyFormat
    row.getCell(5).numFmt = percentFormat
    row.getCell(4).font = { bold: true, color: { argb: item.result >= 0 ? COLORS.green : COLORS.red } }
  })
  const totalRow = data.length + 5
  sheet.getCell(totalRow, 1).value = 'TOTAL / MÉDIA'
  sheet.getCell(totalRow, 2).value = data.reduce((s, x) => s + x.revenue, 0)
  sheet.getCell(totalRow, 3).value = data.reduce((s, x) => s + x.expenses, 0)
  sheet.getCell(totalRow, 4).value = data.reduce((s, x) => s + x.result, 0)
  const revenueTotal = data.reduce((s, x) => s + x.revenue, 0)
  sheet.getCell(totalRow, 5).value = revenueTotal > 0 ? data.reduce((s, x) => s + x.result, 0) / revenueTotal : 0
  for (let c = 1; c <= 5; c++) {
    sheet.getCell(totalRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueSoft } }
    sheet.getCell(totalRow, c).font = { bold: true, color: { argb: COLORS.text } }
  }
  sheet.getCell(totalRow, 2).numFmt = currencyFormat
  sheet.getCell(totalRow, 3).numFmt = currencyFormat
  sheet.getCell(totalRow, 4).numFmt = currencyFormat
  sheet.getCell(totalRow, 5).numFmt = percentFormat
  sheet.columns = [{ width: 23 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }]
  sheet.autoFilter = { from: 'A4', to: `E${data.length + 4}` }
  return sheet
}

const addCategoriesSheet = (workbook: Workbook, transactions: Transaction[]) => {
  const sheet = workbook.addWorksheet('Categorias')
  configureSheet(sheet)
  paintTitle(sheet, 'Web Kivora Finance — Categorias', 'Análise da distribuição das despesas por categoria', 6)
  addTableHeader(sheet, 4, ['Ranking', 'Categoria', 'Total gasto', '% das despesas', 'Qtd. transações', 'Ticket médio'])
  const categories = categoryExpenses(transactions)
  const expenseTransactions = transactions.filter((item) => item.type === 'despesa')
  const totalExpenses = categories.reduce((sum, item) => sum + item.value, 0)

  if (!categories.length) addEmptyMessage(sheet, 5, 6, 'Nenhuma despesa encontrada para análise de categorias.')
  categories.forEach((item, index) => {
    const categoryItems = expenseTransactions.filter((x) => x.category === item.name)
    const rowNumber = index + 5
    const row = sheet.getRow(rowNumber)
    row.values = [index + 1, safe(item.name), item.value, totalExpenses > 0 ? item.value / totalExpenses : 0, categoryItems.length, categoryItems.length ? item.value / categoryItems.length : 0]
    styleBodyRow(sheet, rowNumber, 6, index % 2 === 1)
    row.getCell(3).numFmt = currencyFormat
    row.getCell(4).numFmt = percentFormat
    row.getCell(6).numFmt = currencyFormat
    if (index < 3) row.getCell(1).font = { bold: true, color: { argb: COLORS.blue } }
  })
  if (categories.length) {
    addTotalRow(sheet, categories.length + 5, 2, 3, 'Total de despesas', totalExpenses, 6)
    sheet.autoFilter = { from: 'A4', to: `F${categories.length + 4}` }
  }
  sheet.columns = [{ width: 11 }, { width: 25 }, { width: 19 }, { width: 18 }, { width: 18 }, { width: 19 }]
  return sheet
}

const addGoalsSheet = (workbook: Workbook, goals: Goal[]) => {
  const sheet = workbook.addWorksheet('Planejamento')
  configureSheet(sheet, 'FF8B5CF6')
  paintTitle(sheet, 'Web Kivora Finance — Planejamento', 'Metas financeiras e projeção de conclusão', 10)
  addTableHeader(sheet, 4, ['Meta', 'Descrição', 'Objetivo', 'Reservado', 'Falta', 'Progresso', 'Aporte mensal', 'Meses estimados', 'Data objetivo', 'Situação'])

  if (!goals.length) addEmptyMessage(sheet, 5, 10, 'Nenhuma meta financeira cadastrada.')
  goals.forEach((goal, index) => {
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
    const progress = goal.targetAmount > 0 ? Math.min(1, goal.savedAmount / goal.targetAmount) : 0
    const months = remaining === 0 ? 0 : goal.monthlyAmount > 0 ? Math.ceil(remaining / goal.monthlyAmount) : null
    const target = asDate(goal.targetDate)
    const estimatedDate = months === null ? null : new Date(new Date().getFullYear(), new Date().getMonth() + months, new Date().getDate())
    const situation = remaining === 0 ? 'Concluída' : estimatedDate && estimatedDate <= target ? 'No prazo' : 'Revisar aporte/prazo'
    const rowNumber = index + 5
    const row = sheet.getRow(rowNumber)
    row.values = [safe(goal.name), safe(goal.description), goal.targetAmount, goal.savedAmount, remaining, progress, goal.monthlyAmount, months ?? '—', target, situation]
    styleBodyRow(sheet, rowNumber, 10, index % 2 === 1)
    ;[3, 4, 5, 7].forEach((col) => { row.getCell(col).numFmt = currencyFormat })
    row.getCell(6).numFmt = percentFormat
    row.getCell(9).numFmt = dateFormat
    const statusCell = row.getCell(10)
    const positive = situation === 'Concluída' || situation === 'No prazo'
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: positive ? COLORS.greenSoft : COLORS.yellowSoft } }
    statusCell.font = { bold: true, color: { argb: positive ? COLORS.green : 'FF946200' } }
  })
  sheet.columns = [
    { width: 26 }, { width: 34 }, { width: 17 }, { width: 17 }, { width: 17 }, { width: 15 },
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 23 },
  ]
  if (goals.length) sheet.autoFilter = { from: 'A4', to: `J${goals.length + 4}` }
  return sheet
}

const addSummarySheet = (
  workbook: Workbook,
  transactions: Transaction[],
  accounts: Account[],
  goals: Goal[],
  preferences?: UserPreferences,
) => {
  const sheet = workbook.addWorksheet('Resumo Executivo', { views: [{ showGridLines: false }] })
  sheet.properties.tabColor = { argb: COLORS.blue }
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  sheet.headerFooter.oddFooter = '&LWeb Kivora Finance&CResumo Executivo&R&P / &N'
  sheet.columns = Array.from({ length: 8 }, () => ({ width: 17 }))
  paintTitle(sheet, 'WEB KIVORA FINANCE', 'Relatório executivo de gestão financeira', 8)

  sheet.mergeCells('A3:H3')
  sheet.getCell('A3').value = `Perfil: ${safe(preferences?.displayName || 'Usuário')}  •  Modo: ${preferences?.mode === 'empresa' ? 'Empresa' : 'Pessoal'}  •  Período: ${reportPeriod(transactions)}  •  Gerado em: ${new Date().toLocaleString('pt-BR')}`
  sheet.getCell('A3').font = { size: 9, color: { argb: COLORS.muted } }
  sheet.getCell('A3').alignment = { horizontal: 'left', vertical: 'middle' }
  sheet.getRow(3).height = 22

  const txTotals = totals(transactions)
  const balance = currentBalance(transactions)
  const pendingPayable = accounts.filter((a) => a.kind === 'pagar' && a.status !== 'pago').reduce((s, a) => s + a.amount, 0)
  const pendingReceivable = accounts.filter((a) => a.kind === 'receber' && a.status !== 'recebido').reduce((s, a) => s + a.amount, 0)
  const overduePayable = accounts.filter((a) => a.kind === 'pagar' && (a.status === 'atrasado' || (a.status !== 'pago' && daysUntil(a.dueDate) < 0)))
  const overdueAmount = overduePayable.reduce((s, a) => s + a.amount, 0)
  const projected = balance + pendingReceivable - pendingPayable
  const savingsRate = txTotals.receitas > 0 ? txTotals.resultado / txTotals.receitas : 0
  const expenseRate = txTotals.receitas > 0 ? txTotals.despesas / txTotals.receitas : 0

  addKpi(sheet, 'A5:B7', 'SALDO ATUAL', balance, { money: true, accent: balance >= 0 ? COLORS.green : COLORS.red })
  addKpi(sheet, 'C5:D7', 'RECEITAS', txTotals.receitas, { money: true, accent: COLORS.green })
  addKpi(sheet, 'E5:F7', 'DESPESAS', txTotals.despesas, { money: true, accent: COLORS.red })
  addKpi(sheet, 'G5:H7', 'RESULTADO', txTotals.resultado, { money: true, accent: txTotals.resultado >= 0 ? COLORS.green : COLORS.red })

  addKpi(sheet, 'A9:B11', 'SALDO PROJETADO', projected, { money: true, accent: projected >= 0 ? COLORS.blue : COLORS.red })
  addKpi(sheet, 'C9:D11', 'CONTAS A PAGAR', pendingPayable, { money: true, accent: COLORS.orange })
  addKpi(sheet, 'E9:F11', 'A RECEBER', pendingReceivable, { money: true, accent: COLORS.green })
  addKpi(sheet, 'G9:H11', 'TAXA DE POUPANÇA', savingsRate, { percent: true, accent: savingsRate >= 0 ? COLORS.green : COLORS.red })

  sectionTitle(sheet, 13, 'Diagnóstico financeiro', 1, 8)
  const topCategories = categoryExpenses(transactions).slice(0, 5)
  const topCategory = topCategories[0]
  const plannedTotal = goals.reduce((s, g) => s + g.targetAmount, 0)
  const savedGoals = goals.reduce((s, g) => s + g.savedAmount, 0)
  const goalProgress = plannedTotal > 0 ? savedGoals / plannedTotal : 0

  const diagnostics: Array<[string, string | number, string]> = [
    ['Renda comprometida com despesas', expenseRate, percentFormat],
    ['Contas vencidas', overduePayable.length, '0'],
    ['Valor total vencido', overdueAmount, currencyFormat],
    ['Principal categoria de gasto', topCategory ? `${topCategory.name} (${(txTotals.despesas > 0 ? topCategory.value / txTotals.despesas : 0).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 })})` : 'Sem despesas', '@'],
    ['Progresso geral das metas', goalProgress, percentFormat],
    ['Quantidade de transações', transactions.length, '0'],
  ]

  diagnostics.forEach(([label, value, format], index) => {
    const row = 14 + index
    sheet.mergeCells(row, 1, row, 4)
    sheet.mergeCells(row, 5, row, 8)
    const labelCell = sheet.getCell(row, 1)
    const valueCell = sheet.getCell(row, 5)
    labelCell.value = label
    valueCell.value = value
    labelCell.font = { bold: true, color: { argb: COLORS.text } }
    valueCell.font = { bold: true, color: { argb: COLORS.text } }
    valueCell.numFmt = format
    ;[labelCell, valueCell].forEach((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? COLORS.white : COLORS.light } }
      cell.border = { bottom: { style: 'hair', color: { argb: COLORS.line } } }
      cell.alignment = { vertical: 'middle' }
    })
  })

  sectionTitle(sheet, 21, 'Maiores categorias de despesa', 1, 4)
  sectionTitle(sheet, 21, 'Próximos compromissos', 5, 8)
  sheet.getRow(22).values = ['Categoria', 'Valor', '%', '', 'Vencimento', 'Conta', 'Valor', 'Prioridade']
  ;[1, 2, 3, 5, 6, 7, 8].forEach((col) => styleHeader(sheet.getCell(22, col)))

  for (let index = 0; index < 5; index++) {
    const rowNumber = 23 + index
    const category = topCategories[index]
    if (category) {
      sheet.getCell(rowNumber, 1).value = category.name
      sheet.getCell(rowNumber, 2).value = category.value
      sheet.getCell(rowNumber, 2).numFmt = currencyFormat
      sheet.getCell(rowNumber, 3).value = txTotals.despesas > 0 ? category.value / txTotals.despesas : 0
      sheet.getCell(rowNumber, 3).numFmt = percentFormat
    }
    const account = accounts
      .filter((a) => a.kind === 'pagar' && a.status !== 'pago')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[index]
    if (account) {
      const p = priority(account)
      sheet.getCell(rowNumber, 5).value = asDate(account.dueDate)
      sheet.getCell(rowNumber, 5).numFmt = dateFormat
      sheet.getCell(rowNumber, 6).value = safe(account.name)
      sheet.getCell(rowNumber, 7).value = account.amount
      sheet.getCell(rowNumber, 7).numFmt = currencyFormat
      sheet.getCell(rowNumber, 8).value = p.label
      sheet.getCell(rowNumber, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.color } }
      sheet.getCell(rowNumber, 8).font = { bold: true, color: { argb: p.font } }
    }
    for (let c = 1; c <= 8; c++) {
      const cell = sheet.getCell(rowNumber, c)
      cell.border = { bottom: { style: 'hair', color: { argb: COLORS.line } } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    }
  }

  sectionTitle(sheet, 30, 'Leitura rápida', 1, 8)
  const notes = [
    txTotals.resultado >= 0
      ? `O período apresenta resultado positivo de ${txTotals.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
      : `O período apresenta resultado negativo de ${Math.abs(txTotals.resultado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    overduePayable.length
      ? `Existem ${overduePayable.length} conta(s) vencida(s), somando ${overdueAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
      : 'Não há contas a pagar vencidas no momento.',
    projected >= 0
      ? `Após considerar contas e recebíveis pendentes, o saldo projetado é ${projected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
      : `O saldo projetado está negativo em ${Math.abs(projected).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}; vale revisar os próximos compromissos.`,
  ]
  notes.forEach((text, index) => {
    sheet.mergeCells(31 + index, 1, 31 + index, 8)
    const cell = sheet.getCell(31 + index, 1)
    cell.value = `• ${text}`
    cell.font = { color: { argb: COLORS.text } }
    cell.alignment = { wrapText: true, vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? COLORS.white : COLORS.light } }
    sheet.getRow(31 + index).height = 24
  })

  sheet.getRow(35).height = 10
  sheet.mergeCells('A36:H36')
  sheet.getCell('A36').value = 'Relatório gerado automaticamente. Utilize as abas seguintes para análise detalhada dos dados.'
  sheet.getCell('A36').font = { italic: true, size: 9, color: { argb: COLORS.muted } }
  sheet.getCell('A36').alignment = { horizontal: 'center' }
  return sheet
}

export async function exportTransactionsXlsx(items: Transaction[]) {
  const workbook = new ExcelJS.Workbook()
  setWorkbookMetadata(workbook)
  addTransactionSheet(workbook, 'Transações', items, 'Transações Exportadas')
  await saveWorkbook(workbook, `WebKivora_Transacoes_${todayFile()}.xlsx`)
}

export async function exportFinancialReport(
  transactions: Transaction[],
  accounts: Account[],
  goals: Goal[] = [],
  preferences?: UserPreferences,
) {
  const workbook = new ExcelJS.Workbook()
  setWorkbookMetadata(workbook)

  addSummarySheet(workbook, transactions, accounts, goals, preferences)
  addMonthlySheet(workbook, transactions)
  addCategoriesSheet(workbook, transactions)
  addTransactionSheet(workbook, 'Transações', transactions)
  addTransactionSheet(workbook, 'Receitas', transactions.filter((item) => item.type === 'receita'))
  addTransactionSheet(workbook, 'Despesas', transactions.filter((item) => item.type === 'despesa'))
  addAccountsSheet(workbook, 'Contas a Pagar', accounts.filter((item) => item.kind === 'pagar'), 'pagar')
  addAccountsSheet(workbook, 'Contas a Receber', accounts.filter((item) => item.kind === 'receber'), 'receber')
  addGoalsSheet(workbook, goals)

  await saveWorkbook(workbook, `WebKivora_Relatorio_Completo_${todayFile()}.xlsx`)
}
