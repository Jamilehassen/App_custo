import { describe, expect, it } from 'vitest'
import type { ItemPedido, Pedido, Produto, StatusPedido } from '../db'
import {
  disponivelDoProduto,
  etapasValidas,
  linhasParaMarcarPronto,
  listaDeCompras,
  materiaisDaProducao,
  reservadoPorPedidosProntos,
  somarMateriais,
} from './estoquePedidos'

function produto(id: number, nome: string, materiais: Produto['materiais']): Produto {
  return { id, nome, minutosProducao: 30, lucroPercent: 50, taxasPercent: 0, materiais }
}

function pedido(id: number, status: StatusPedido, itens: ItemPedido[]): Pedido {
  return {
    id,
    criadoEm: '2026-10-01T10:00:00Z',
    prazoEntrega: '2026-11-01',
    status,
    itens,
    pagoCentavos: 0,
  }
}

const item = (produtoId: number, quantidade: number): ItemPedido => ({
  tipo: 'produto',
  produtoId,
  descricao: 'Peça',
  quantidade,
  precoUnitarioCentavos: 3000,
})

// Necessaire: 900 cm² de tecido (material 1) e 1 botão (material 2) por peça.
const necessaire = produto(1, 'Necessaire', [
  { materialId: 1, quantidade: 900 },
  { materialId: 2, quantidade: 1 },
])
// Bolsa: 2 botões por peça.
const bolsa = produto(2, 'Bolsa', [{ materialId: 2, quantidade: 2 }])

describe('materiais da produção', () => {
  it('multiplica a ficha técnica pela quantidade de peças', () => {
    const total = materiaisDaProducao(necessaire, 3)
    expect(total.get(1)).toBe(2700)
    expect(total.get(2)).toBe(3)
  })

  it('soma os materiais de produtos diferentes', () => {
    const total = somarMateriais([
      materiaisDaProducao(necessaire, 3),
      materiaisDaProducao(bolsa, 2),
    ])
    expect(total.get(1)).toBe(2700)
    expect(total.get(2)).toBe(7) // 3 + 4 botões
  })
})

describe('peças reservadas e disponíveis', () => {
  it('só os pedidos prontos reservam peças', () => {
    const reservado = reservadoPorPedidosProntos([
      pedido(1, 'pronto', [item(1, 2)]),
      pedido(2, 'pronto', [item(1, 1)]),
      pedido(3, 'novo', [item(1, 5)]),
      pedido(4, 'entregue', [item(1, 9)]),
    ])
    expect(reservado.get(1)).toBe(3)
  })

  it('desconta o reservado do saldo e nunca fica negativo', () => {
    expect(disponivelDoProduto(5, 2)).toBe(3)
    expect(disponivelDoProduto(undefined, undefined)).toBe(0)
    expect(disponivelDoProduto(1, 4)).toBe(0)
  })

  it('sugere produzir só o que falta', () => {
    const linhas = linhasParaMarcarPronto(
      pedido(1, 'producao', [item(1, 3), item(1, 1)]),
      [necessaire],
      () => 1,
    )
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({ necessario: 4, disponivel: 1, sugerido: 3 })
  })
})

describe('lista de compras', () => {
  it('compara o que falta fazer com o estoque de cada material', () => {
    const compras = listaDeCompras(
      [
        { produtoId: 1, falta: 3 },
        { produtoId: 2, falta: 2 },
      ],
      [necessaire, bolsa],
      (id) => (id === 1 ? 1000 : undefined),
    )
    const tecido = compras.find((c) => c.materialId === 1)
    const botao = compras.find((c) => c.materialId === 2)
    expect(tecido).toMatchObject({ necessario: 2700, emEstoque: 1000, comprar: 1700 })
    expect(botao).toMatchObject({ necessario: 7, comprar: undefined })
  })
})

describe('situação do pedido e estoque', () => {
  it('diz quais lançamentos continuam valendo', () => {
    expect(etapasValidas('novo')).toEqual([])
    expect(etapasValidas('producao')).toEqual([])
    expect(etapasValidas('pronto')).toEqual(['pronto'])
    expect(etapasValidas('entregue')).toEqual(['pronto', 'entregue'])
    expect(etapasValidas('cancelado')).toEqual(['pronto'])
  })
})