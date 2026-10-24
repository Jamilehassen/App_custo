import { describe, expect, it } from 'vitest'
import type { ItemPedido, Pedido, StatusPedido } from '../db'
import { itensAProduzir } from './pedidos'

function pedido(
  id: number,
  status: StatusPedido,
  prazoEntrega: string,
  itens: ItemPedido[],
): Pedido {
  return { id, criadoEm: '2026-10-01T10:00:00Z', prazoEntrega, status, itens, pagoCentavos: 0 }
}

const necessaire = (quantidade: number): ItemPedido => ({
  tipo: 'produto',
  produtoId: 1,
  descricao: 'Necessaire',
  quantidade,
  precoUnitarioCentavos: 3000,
})

const bolsa: ItemPedido = {
  tipo: 'encomenda',
  descricao: 'Bolsa azul',
  quantidade: 1,
  precoUnitarioCentavos: 8000,
}

describe('itensAProduzir', () => {
  it('soma o mesmo produto de pedidos diferentes e guarda a entrega mais próxima', () => {
    const linhas = itensAProduzir([
      pedido(1, 'novo', '2026-11-10', [necessaire(2)]),
      pedido(2, 'producao', '2026-11-05', [necessaire(3)]),
    ])
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      descricao: 'Necessaire',
      quantidade: 5,
      prazo: '2026-11-05',
      pedidos: 2,
    })
  })

  it('mantém cada encomenda separada', () => {
    const linhas = itensAProduzir([
      pedido(1, 'novo', '2026-11-10', [bolsa]),
      pedido(2, 'novo', '2026-11-12', [bolsa]),
    ])
    expect(linhas).toHaveLength(2)
    expect(linhas.every((l) => l.encomenda)).toBe(true)
  })

  it('ignora pedidos prontos, entregues e cancelados', () => {
    const linhas = itensAProduzir([
      pedido(1, 'pronto', '2026-11-10', [necessaire(1)]),
      pedido(2, 'entregue', '2026-11-10', [necessaire(1)]),
      pedido(3, 'cancelado', '2026-11-10', [necessaire(1)]),
    ])
    expect(linhas).toEqual([])
  })
})