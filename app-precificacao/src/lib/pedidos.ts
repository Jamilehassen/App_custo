import type { FormaPagamento, ItemPedido, Pedido, StatusPedido } from '../db'
import { hojeISO, somarDias } from './datas'

// Cada status: nome, cor e qual é o próximo passo.
export const statusInfo: Record<
  StatusPedido,
  { rotulo: string; classes: string; proximo?: StatusPedido; acao?: string }
> = {
  orcamento: {
    rotulo: 'Orçamento',
    classes: 'bg-purple-100 text-purple-700',
    proximo: 'novo',
    acao: 'Aprovar orçamento',
  },
  novo: {
    rotulo: 'Novo',
    classes: 'bg-blue-100 text-blue-700',
    proximo: 'producao',
    acao: 'Iniciar produção',
  },
  producao: {
    rotulo: 'Em produção',
    classes: 'bg-amber-100 text-amber-800',
    proximo: 'pronto',
    acao: 'Marcar como pronto',
  },
  pronto: {
    rotulo: 'Pronto',
    classes: 'bg-green-100 text-green-700',
    proximo: 'entregue',
    acao: 'Marcar como entregue',
  },
  entregue: { rotulo: 'Entregue', classes: 'bg-gray-200 text-gray-700' },
  cancelado: { rotulo: 'Cancelado', classes: 'bg-red-100 text-red-700' },
}

export const TODOS_STATUS: StatusPedido[] = [
  'orcamento',
  'novo',
  'producao',
  'pronto',
  'entregue',
  'cancelado',
]

// Pedidos que ainda estão "andando".
export const ABERTOS: StatusPedido[] = ['novo', 'producao', 'pronto']

export function totalDoPedido(itens: ItemPedido[]): number {
  return itens.reduce(
    (soma, item) => soma + Math.round(item.quantidade * item.precoUnitarioCentavos),
    0,
  )
}

export function restanteAPagar(pedido: Pick<Pedido, 'itens' | 'pagoCentavos'>): number {
  return Math.max(0, totalDoPedido(pedido.itens) - pedido.pagoCentavos)
}

// Ex.: "2× Necessaire, 1× Bolsa azul com o nome Ana"
export function resumoDosItens(itens: ItemPedido[]): string {
  return itens.map((item) => `${item.quantidade}× ${item.descricao}`).join(', ')
}

// Gera "Cliente 3 - Feira Millenium", continuando a numeração daquela feira.
export function proximoNomeDeFeira(pedidos: Pedido[], feira: string): string {
  const local = feira.trim()
  let maior = 0

  for (const p of pedidos) {
    const achado = p.clienteAvulso?.match(/^Cliente (\d+)(?: - (.*))?$/i)
    if (!achado) continue
    const localDoPedido = (achado[2] ?? '').trim()
    if (localDoPedido.toLowerCase() === local.toLowerCase()) {
      maior = Math.max(maior, Number(achado[1]))
    }
  }

  const numero = maior + 1
  return local ? `Cliente ${numero} - ${local}` : `Cliente ${numero}`
}

// Feiras já usadas nos nomes rápidos, da mais recente para a mais antiga.
export function feirasUsadas(pedidos: Pedido[]): string[] {
  const vistas = new Map<string, string>() // em minúsculas → como foi escrita
  const recentes = [...pedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

  for (const p of recentes) {
    const local = p.clienteAvulso?.match(/^Cliente \d+ - (.+)$/i)?.[1]?.trim()
    if (local && !vistas.has(local.toLowerCase())) {
      vistas.set(local.toLowerCase(), local)
    }
  }
  return [...vistas.values()]
}

export type LinhaDeProducao = {
  chave: string
  descricao: string
  quantidade: number
  prazo: string // a entrega mais próxima entre os pedidos
  pedidos: number // em quantos pedidos aparece
  encomenda: boolean
  produtoId?: number // só nas linhas de produto cadastrado
}

// O que ainda precisa ser feito: itens de pedidos novos ou em produção.
export function itensAProduzir(pedidos: Pedido[]): LinhaDeProducao[] {
  const linhas = new Map<string, LinhaDeProducao>()

  for (const pedido of pedidos) {
    if (pedido.status !== 'novo' && pedido.status !== 'producao') continue

    pedido.itens.forEach((item, indice) => {
      // Produtos iguais somam; cada encomenda fica separada.
      const chave =
        item.tipo === 'produto' && item.produtoId !== undefined
          ? `p${item.produtoId}`
          : `e${pedido.id}-${indice}`

      const atual = linhas.get(chave)
      if (atual) {
        atual.quantidade += item.quantidade
        atual.pedidos += 1
        if (pedido.prazoEntrega < atual.prazo) atual.prazo = pedido.prazoEntrega
      } else {
        linhas.set(chave, {
          chave,
          descricao: item.descricao,
          quantidade: item.quantidade,
          prazo: pedido.prazoEntrega,
          pedidos: 1,
          encomenda: item.tipo === 'encomenda',
          produtoId: item.tipo === 'produto' ? item.produtoId : undefined,
        })
      }
    })
  }

  // Quem entrega primeiro aparece primeiro.
  return [...linhas.values()].sort(
    (a, b) => a.prazo.localeCompare(b.prazo) || a.descricao.localeCompare(b.descricao, 'pt-BR'),
  )
}

// Nome de cada forma de pagamento, na ordem em que aparecem na tela.
export const formasDePagamento: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferência',
  outro: 'Outro',
}

export const TODAS_FORMAS = Object.keys(formasDePagamento) as FormaPagamento[]

// Quando o orçamento é aprovado, a entrega conta a partir de hoje.
export function prazoAoAprovar(
  orcamento: Pick<Pedido, 'prazoDias'>,
  hoje: string = hojeISO(),
): string {
  return somarDias(hoje, orcamento.prazoDias ?? 7)
}

export function textoDoPrazoDoOrcamento(dias: number): string {
  if (dias === 0) return 'no mesmo dia da aprovação'
  return `${dias} ${dias === 1 ? 'dia' : 'dias'} após a aprovação`
}