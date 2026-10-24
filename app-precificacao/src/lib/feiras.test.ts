import { describe, expect, it } from 'vitest'
import type { FormaPagamento, ItemVenda, VendaFeira } from '../db'
import { proximoNumeroDeCliente, resumirFeira, rotuloDaVenda, totalDaVenda } from './feiras'

function item(quantidade: number, preco: number): ItemVenda {
  return { descricao: 'Naninha', quantidade, precoUnitarioCentavos: preco }
}

function venda(
  numero: number,
  itens: ItemVenda[],
  formaPagamento?: FormaPagamento,
): VendaFeira {
  return {
    id: numero,
    feiraId: 1,
    numero,
    itens,
    formaPagamento,
    criadoEm: '2026-10-25T10:00:00Z',
  }
}

describe('vendas de feira', () => {
  it('soma quantidade × preço de cada item', () => {
    expect(totalDaVenda([item(2, 3000), item(1, 4550)])).toBe(10550)
  })

  it('numera os clientes da feira em sequência', () => {
    expect(proximoNumeroDeCliente([])).toBe(1)
    expect(proximoNumeroDeCliente([venda(1, []), venda(4, [])])).toBe(5)
  })

  it('resume o total, as peças e o que entrou em cada forma de pagamento', () => {
    const resumo = resumirFeira([
      venda(1, [item(1, 3000)], 'pix'),
      venda(2, [item(2, 1500)], 'dinheiro'),
      venda(3, [item(1, 4500), item(1, 500)], 'pix'),
      venda(4, [item(1, 2000)]),
    ])
    expect(resumo).toEqual({
      total: 13000,
      clientes: 4,
      pecas: 6,
      porForma: { pix: 8000, dinheiro: 3000 },
      semForma: 2000,
    })
  })

  it('dá nome à venda, com ou sem o nome do cliente', () => {
    expect(rotuloDaVenda({ numero: 3 })).toBe('Cliente 3')
    expect(rotuloDaVenda({ numero: 3, nomeCliente: 'Maria' })).toBe('Maria (Cliente 3)')
  })

  it('mostra o nome da cliente cadastrada quando ela foi escolhida', () => {
    expect(rotuloDaVenda({ numero: 3 }, 'Alessandra Saad')).toBe('Alessandra Saad (Cliente 3)')
    // o nome cadastrado vale mais que o nome digitado
    expect(rotuloDaVenda({ numero: 3, nomeCliente: 'Alê' }, 'Alessandra Saad')).toBe(
      'Alessandra Saad (Cliente 3)',
    )
  })
})