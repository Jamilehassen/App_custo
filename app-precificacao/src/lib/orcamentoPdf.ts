import type { Loja, Pedido } from '../db'
import { dataDeISO } from './datas'
import { formatarReais, formatarTelefone } from './formato'
import { limpar } from './catalogoPdf'
import { textoDoPrazoDoOrcamento, totalDoPedido } from './pedidos'

// Medidas em milímetros (A4 = 210 × 297).
const LARGURA = 210
const MARGEM = 16
const DIREITA = LARGURA - MARGEM
const TOPO = 20
const LIMITE = 275 // abaixo daqui começa uma página nova

type Cor = [number, number, number]
const ROSA: Cor = [225, 29, 72]
const ROSA_CLARO: Cor = [255, 241, 242]
const ESCURO: Cor = [31, 41, 55]
const CINZA: Cor = [90, 90, 90]
const LINHA: Cor = [229, 231, 235]

function dataBR(iso: string) {
  return dataDeISO(iso).toLocaleDateString('pt-BR')
}

export async function gerarPdfOrcamento(
  pedido: Pedido,
  nomeCliente: string,
  loja?: Loja,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = TOPO

  // ----- Cabeçalho -----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...ROSA)
  doc.text(limpar(loja?.nome || 'Orçamento'), MARGEM, y)

  doc.setFontSize(16)
  doc.setTextColor(...ESCURO)
  doc.text('ORÇAMENTO', DIREITA, y, { align: 'right' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...CINZA)
  if (loja?.whatsapp) {
    doc.text(`WhatsApp: ${formatarTelefone(loja.whatsapp)}`, MARGEM, y)
  }
  doc.text(`Nº ${pedido.id}`, DIREITA, y, { align: 'right' })
  y += 4

  doc.setDrawColor(...ROSA)
  doc.setLineWidth(0.6)
  doc.line(MARGEM, y, DIREITA, y)
  y += 8

  // ----- Dados do orçamento -----
  const dados: [string, string][] = [
    ['Cliente', nomeCliente],
    ['Data', new Date(pedido.criadoEm).toLocaleDateString('pt-BR')],
  ]
  if (pedido.validadeOrcamento) dados.push(['Válido até', dataBR(pedido.validadeOrcamento)])
  if (pedido.prazoDias !== undefined) {
    dados.push(['Prazo de entrega', textoDoPrazoDoOrcamento(pedido.prazoDias)])
  }

  doc.setFontSize(10)
  for (const [rotulo, valor] of dados) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ESCURO)
    doc.text(`${rotulo}:`, MARGEM, y)
    doc.setFont('helvetica', 'normal')
    doc.text(limpar(valor), MARGEM + 38, y)
    y += 6
  }
  y += 4

  // ----- Tabela de itens -----
  const colQtd = 128
  const colUnit = 160
  const colTotal = DIREITA - 2

  doc.setFillColor(...ROSA_CLARO)
  doc.rect(MARGEM, y - 5, DIREITA - MARGEM, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ESCURO)
  doc.text('Item', MARGEM + 2, y)
  doc.text('Qtd.', colQtd, y, { align: 'center' })
  doc.text('Valor unit.', colUnit, y, { align: 'right' })
  doc.text('Subtotal', colTotal, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  for (const item of pedido.itens) {
    const linhas = doc.splitTextToSize(limpar(item.descricao), 96) as string[]
    const altura = linhas.length * 4.6 + 4
    if (y + altura > LIMITE) {
      doc.addPage()
      y = TOPO
    }

    doc.setTextColor(...ESCURO)
    linhas.forEach((linha, i) => doc.text(linha, MARGEM + 2, y + i * 4.6))
    doc.text(String(item.quantidade), colQtd, y, { align: 'center' })
    doc.text(formatarReais(item.precoUnitarioCentavos), colUnit, y, { align: 'right' })
    doc.text(
      formatarReais(Math.round(item.quantidade * item.precoUnitarioCentavos)),
      colTotal,
      y,
      { align: 'right' },
    )

    y += altura
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.2)
    doc.line(MARGEM, y - 3.5, DIREITA, y - 3.5)
  }

  // ----- Total -----
  y += 3
  if (y + 14 > LIMITE) {
    doc.addPage()
    y = TOPO
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...ESCURO)
  doc.text('Total:', colUnit, y, { align: 'right' })
  doc.setFontSize(15)
  doc.setTextColor(...ROSA)
  doc.text(formatarReais(totalDoPedido(pedido.itens)), colTotal, y, { align: 'right' })
  y += 12

  // ----- Observações e condições -----
  function bloco(titulo: string, texto: string) {
    const linhas = doc.splitTextToSize(limpar(texto), DIREITA - MARGEM) as string[]
    if (y + 10 > LIMITE) {
      doc.addPage()
      y = TOPO
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...ESCURO)
    doc.text(titulo, MARGEM, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...CINZA)
    for (const linha of linhas) {
      if (y > LIMITE) {
        doc.addPage()
        y = TOPO
      }
      doc.text(linha, MARGEM, y)
      y += 4.6
    }
    y += 4
  }

  if (pedido.observacoes) bloco('Observações', pedido.observacoes)
  if (loja?.condicoesOrcamento) bloco('Condições', loja.condicoesOrcamento)

  // ----- Rodapé em todas as páginas -----
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${limpar(loja?.nome || 'Orçamento')}  -  página ${pagina} de ${total}`,
      LARGURA / 2,
      291,
      { align: 'center' },
    )
  }

  return doc.output('blob')
}