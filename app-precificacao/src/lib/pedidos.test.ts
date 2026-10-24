import { describe, expect, it } from 'vitest'
import type { ItemPedido, Pedido } from '../db'
import {
  feirasUsadas,
  proximoNomeDeFeira,
  restanteAPagar,
  totalDoPedido,
} from './pedidos'

const itens: ItemPedido[] = [
  { tipo: 'produto', produtoId: 1, descricao: 'Necessaire', quantidade: 2, precoUnitarioCentavos: 3000 },
  { tipo: 'encomenda', descricao: 'Bolsa azul', quantidade: 1, precoUnitarioCentavos: 4550 },
]

function pedidoDe(clienteAvulso: string, criadoEm: string): Pedido {
  return {
    id: 1,
    clienteAvulso,
    criadoEm,
    prazoEntrega: '2026-11-01',
    status: 'novo',
    itens: [],
    pagoCentavos: 0,
  }
}

describe('pedidos', () => {
  it('soma quantidade × preço de cada item', () => {
    expect(totalDoPedido(itens)).toBe(10550) // R$ 105,50
  })

  it('calcula quanto falta receber', () => {
    expect(restanteAPagar({ itens, pagoCentavos: 5000 })).toBe(5550)
  })

  it('não deixa o que falta receber ficar negativo', () => {
    expect(restanteAPagar({ itens, pagoCentavos: 20000 })).toBe(0)
  })
})

describe('clientes de feira', () => {
  it('começa em 1 numa feira nova', () => {
    expect(proximoNomeDeFeira([], 'Feira Millenium')).toBe('Cliente 1 - Feira Millenium')
  })

  it('continua a numeração da mesma feira, sem misturar com outras', () => {
    const pedidos = [
      pedidoDe('Cliente 1 - Feira Millenium', '2026-10-01T10:00:00Z'),
      pedidoDe('Cliente 2 - feira millenium', '2026-10-01T11:00:00Z'),
      pedidoDe('Cliente 9 - Feira do Centro', '2026-10-02T10:00:00Z'),
    ]
    expect(proximoNomeDeFeira(pedidos, 'Feira Millenium')).toBe('Cliente 3 - Feira Millenium')
    expect(proximoNomeDeFeira(pedidos, 'Feira do Centro')).toBe('Cliente 10 - Feira do Centro')
  })

  it('lista as feiras já usadas, da mais recente para a mais antiga', () => {
    const pedidos = [
      pedidoDe('Cliente 1 - Feira Millenium', '2026-10-01T10:00:00Z'),
      pedidoDe('Cliente 2 - Feira Millenium', '2026-10-01T11:00:00Z'),
      pedidoDe('Cliente 9 - Feira do Centro', '2026-10-02T10:00:00Z'),
    ]
    expect(feirasUsadas(pedidos)).toEqual(['Feira do Centro', 'Feira Millenium'])
  })
})