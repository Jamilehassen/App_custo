import type { FormaPagamento, ItemVenda, VendaFeira } from '../db'

export function totalDaVenda(itens: ItemVenda[]): number {
  return itens.reduce(
    (soma, item) => soma + Math.round(item.quantidade * item.precoUnitarioCentavos),
    0,
  )
}

// "Cliente 1", "Cliente 2"... em sequência dentro da feira.
export function proximoNumeroDeCliente(vendas: Pick<VendaFeira, 'numero'>[]): number {
  return vendas.reduce((maior, v) => Math.max(maior, v.numero), 0) + 1
}

export function rotuloDaVenda(
  venda: Pick<VendaFeira, 'numero' | 'nomeCliente'>,
  nomeCadastrado?: string, // nome do cliente da agenda, se foi escolhido
): string {
  const nome = nomeCadastrado ?? venda.nomeCliente
  return nome ? `${nome} (Cliente ${venda.numero})` : `Cliente ${venda.numero}`
}

export type ResumoDaFeira = {
  total: number
  clientes: number
  pecas: number
  porForma: Partial<Record<FormaPagamento, number>> // quanto entrou em cada forma
  semForma: number // quanto foi vendido sem forma de pagamento informada
}

export function resumirFeira(vendas: VendaFeira[]): ResumoDaFeira {
  const resumo: ResumoDaFeira = {
    total: 0,
    clientes: vendas.length,
    pecas: 0,
    porForma: {},
    semForma: 0,
  }

  for (const venda of vendas) {
    const total = totalDaVenda(venda.itens)
    resumo.total += total
    resumo.pecas += venda.itens.reduce((soma, item) => soma + item.quantidade, 0)

    if (venda.formaPagamento) {
      resumo.porForma[venda.formaPagamento] =
        (resumo.porForma[venda.formaPagamento] ?? 0) + total
    } else {
      resumo.semForma += total
    }
  }
  return resumo
}