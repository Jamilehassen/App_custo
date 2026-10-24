import type { ItemFicha, Material } from '../db'
import { calcularLucroNoPreco, calcularPreco } from './precificacao'

export function criarMapa(materiais: Material[]) {
  return new Map(materiais.map((m) => [m.id, m]))
}

type DadosProduto = {
  materiais: ItemFicha[]
  minutosProducao: number
  lucroPercent: number
  taxasPercent: number
  precoPraticadoCentavos?: number
}

export function calcularProduto(
  produto: DadosProduto,
  materiais: Map<number, Material>,
  custoHoraCentavos: number,
) {
  // Junta cada item da ficha com o custo atual do material.
  // Se o material foi excluído, o item é ignorado.
  const usados = produto.materiais.flatMap((item) => {
    const material = materiais.get(item.materialId)
    return material
      ? [{ custoUnitarioCentavos: material.custoUnitarioCentavos, quantidade: item.quantidade }]
      : []
  })

  const r = calcularPreco({
    materiais: usados,
    minutosProducao: produto.minutosProducao,
    custoHoraCentavos,
    lucroPercent: produto.lucroPercent,
    taxasPercent: produto.taxasPercent,
  })

  const comum = {
    custoMateriais: r.custoMateriais,
    custoMaoDeObra: r.custoMaoDeObra,
    custoTotal: r.custoTotal,
    precoCalculado: r.total, // o preço que o app calculou
  }

  // Sem preço editado: vale o preço calculado.
  if (produto.precoPraticadoCentavos === undefined) {
    return {
      ...comum,
      lucro: r.lucro,
      lucroPercent: produto.lucroPercent,
      precoBase: r.precoBase,
      taxas: r.taxas,
      total: r.total,
      editado: false,
    }
  }

  // Com preço editado: o lucro é o que sobra desse preço.
  const l = calcularLucroNoPreco(
    produto.precoPraticadoCentavos,
    r.custoTotal,
    produto.taxasPercent,
  )
  return {
    ...comum,
    lucro: l.lucro,
    lucroPercent: l.lucroPercent,
    precoBase: l.precoBase,
    taxas: l.taxas,
    total: produto.precoPraticadoCentavos,
    editado: true,
  }
}

export type ResumoProduto = ReturnType<typeof calcularProduto>