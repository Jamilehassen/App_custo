import type { jsPDF } from 'jspdf'
import type { ItemCatalogo, Loja, Produto } from '../db'
import { formatarReais, formatarTelefone } from './formato'

export type EntradaCatalogo = {
  produto: Produto
  item: ItemCatalogo
  preco: number | null
}

// Medidas da página, em milímetros (A4 = 210 × 297).
const LARGURA_PAGINA = 210
const MARGEM_LATERAL = 16
const TOPO = 12
const LIMITE_INFERIOR = 285 // abaixo daqui fica só o rodapé
const LARGURA_CARTAO = 85
const ESPACO = 8
const ALTURA_TEXTO = 46
const ALTURA_CARTAO = LARGURA_CARTAO + ALTURA_TEXTO

type Cor = [number, number, number]
const ROSA: Cor = [225, 29, 72]
const ROSA_CLARO: Cor = [255, 228, 230]
const CINZA: Cor = [90, 90, 90]
const ESCURO: Cor = [31, 41, 55]
const VERDE: Cor = [22, 163, 74]

// A fonte padrão do PDF só entende letras latinas: tiramos emojis e símbolos raros.
export function limpar(texto: string) {
  return texto
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\n\u0020-\u007E\u00A0-\u00FF]/g, '')
}

// Mantém só as primeiras linhas e termina com "..." quando o texto é longo.
function cortar(linhas: string[], maximo: number) {
  if (linhas.length <= maximo) return linhas
  const visiveis = linhas.slice(0, maximo)
  const ultima = visiveis[maximo - 1]
  visiveis[maximo - 1] = (ultima.length > 3 ? ultima.slice(0, -3) : ultima).trimEnd() + '...'
  return visiveis
}

function linkWhatsapp(whatsapp: string, produto: string) {
  const mensagem = `Olá! Tenho interesse em "${produto}" do seu catálogo.`
  return `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`
}

function desenharCartao(
  doc: jsPDF,
  { produto, item, preco }: EntradaCatalogo,
  x: number,
  y: number,
  whatsapp: string,
) {
  const w = LARGURA_CARTAO

  // Foto (ou um quadrado rosa quando ainda não tem foto)
  if (item.foto) {
    doc.addImage(item.foto, 'JPEG', x, y, w, w)
  } else {
    doc.setFillColor(...ROSA_CLARO)
    doc.rect(x, y, w, w, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...ROSA)
    doc.text('Sem foto', x + w / 2, y + w / 2, { align: 'center' })
  }

  // Moldura do cartão
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, ALTURA_CARTAO)

  const textoX = x + 3
  const larguraTexto = w - 6
  let ty = y + w + 6

  // Nome (até 2 linhas)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ESCURO)
  const nome = cortar(doc.splitTextToSize(limpar(produto.nome), larguraTexto) as string[], 2)
  nome.forEach((linha, i) => doc.text(linha, textoX, ty + i * 4.8))
  ty += nome.length * 4.8 + 0.5

  // Descrição (até 3 linhas)
  if (item.descricao) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    const descricao = cortar(
      doc.splitTextToSize(limpar(item.descricao), larguraTexto) as string[],
      3,
    )
    descricao.forEach((linha, i) => doc.text(linha, textoX, ty + i * 3.8))
  }

  // Preço (sempre na mesma altura, no pé do cartão)
  if (preco !== null) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...ROSA)
    doc.text(formatarReais(preco), textoX, y + ALTURA_CARTAO - 12.5)
  }

  // Botão "Pedir pelo WhatsApp" (clicável)
  if (whatsapp) {
    const bx = x + 3
    const by = y + ALTURA_CARTAO - 9
    const bw = w - 6
    const bh = 7
    doc.setFillColor(...VERDE)
    doc.roundedRect(bx, by, bw, bh, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('Pedir pelo WhatsApp', bx + bw / 2, by + 4.7, { align: 'center' })
    doc.link(bx, by, bw, bh, { url: linkWhatsapp(whatsapp, produto.nome) })
  }
}

export async function gerarPdfCatalogo(
  loja: Loja | undefined,
  entradas: EntradaCatalogo[],
): Promise<Blob> {
  // A biblioteca só é carregada na hora de gerar o PDF, para o app abrir rápido.
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const centro = LARGURA_PAGINA / 2
  const nomeLoja = limpar(loja?.nome || 'Catálogo')
  const whatsapp = loja?.whatsapp ?? ''

  // ----- Capa (topo da primeira página) -----
  let y = TOPO + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...ROSA)
  doc.text(nomeLoja, centro, y, { align: 'center' })
  y += 8

  if (loja?.apresentacao) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...CINZA)
    const linhas = cortar(
      doc.splitTextToSize(limpar(loja.apresentacao), 150) as string[],
      3,
    )
    linhas.forEach((linha, i) =>
      doc.text(linha, centro, y + i * 4.5, { align: 'center' }),
    )
    y += linhas.length * 4.5 + 1
  }

  if (whatsapp) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...ESCURO)
    doc.text(`WhatsApp: ${formatarTelefone(whatsapp)}`, centro, y + 1, {
      align: 'center',
    })
    y += 6
  }

  doc.setDrawColor(...ROSA)
  doc.setLineWidth(0.6)
  doc.line(MARGEM_LATERAL, y, LARGURA_PAGINA - MARGEM_LATERAL, y)
  y += 8

  // ----- Produtos em duas colunas -----
  const colunas = [MARGEM_LATERAL, MARGEM_LATERAL + LARGURA_CARTAO + ESPACO]

  entradas.forEach((entrada, i) => {
    const coluna = i % 2
    if (coluna === 0 && i > 0) y += ALTURA_CARTAO + ESPACO
    if (coluna === 0 && y + ALTURA_CARTAO > LIMITE_INFERIOR) {
      doc.addPage()
      y = TOPO
    }
    desenharCartao(doc, entrada, colunas[coluna], y, whatsapp)
  })

  // ----- Rodapé em todas as páginas -----
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`${nomeLoja}  -  página ${pagina} de ${total}`, centro, 291, {
      align: 'center',
    })
  }

  return doc.output('blob')
}