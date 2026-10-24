// Todos os valores em dinheiro estão em CENTAVOS (R$ 10,00 = 1000).
// Isso evita erros de arredondamento do computador com casas decimais.

export type MaterialUsado = {
  custoUnitarioCentavos: number // quanto custa 1 unidade de uso (1 cm, 1 g, 1 botão...)
  quantidade: number // quantas unidades o produto usa
}

// Quanto vale 1 hora do seu trabalho.
export function custoPorHora(
  retiradaDesejadaCentavos: number,
  custosFixosMensaisCentavos: number[],
  horasProdutivasPorMes: number,
): number {
  if (horasProdutivasPorMes <= 0) {
    throw new Error('Informe quantas horas por mês você trabalha.')
  }
  const totalFixos = custosFixosMensaisCentavos.reduce((soma, v) => soma + v, 0)
  return Math.round(
    (retiradaDesejadaCentavos + totalFixos) / horasProdutivasPorMes,
  )
}

// Quanto custa 1 unidade de um material (ex.: tecido pago por rolo).
export function custoUnitario(
  precoPagoCentavos: number,
  quantidadeComprada: number,
): number {
  if (quantidadeComprada <= 0) {
    throw new Error('A quantidade comprada precisa ser maior que zero.')
  }
  return precoPagoCentavos / quantidadeComprada
}

// Descobre o preço de 1 metro a partir do que foi comprado.
export function precoPorMetro(
  precoPagoCentavos: number,
  quantidade: number,
  unidade: 'cm' | 'm',
): number {
  if (quantidade <= 0) {
    throw new Error('A quantidade precisa ser maior que zero.')
  }
  const metros = unidade === 'cm' ? quantidade / 100 : quantidade
  return Math.round(precoPagoCentavos / metros)
}

// Custo de cada cm² de um tecido, a partir do tamanho inteiro e do preço pago.
export function custoPorCm2(
  precoPagoCentavos: number,
  larguraCm: number,
  alturaCm: number,
): number {
  if (larguraCm <= 0 || alturaCm <= 0) {
    throw new Error('Largura e altura precisam ser maiores que zero.')
  }
  return precoPagoCentavos / (larguraCm * alturaCm)
}

type EntradaPreco = {
  materiais: MaterialUsado[]
  minutosProducao: number
  custoHoraCentavos: number
  lucroPercent: number // em cima do custo (pode passar de 100%)
  taxasPercent: number // sobre o preço final
}

export function calcularPreco(entrada: EntradaPreco) {
  if (entrada.lucroPercent < 0) {
    throw new Error('O lucro não pode ser negativo.')
  }
  if (entrada.taxasPercent < 0 || entrada.taxasPercent >= 100) {
    throw new Error('As taxas precisam ficar entre 0% e 99%.')
  }

  const custoMateriais = Math.round(
    entrada.materiais.reduce(
      (soma, m) => soma + m.custoUnitarioCentavos * m.quantidade,
      0,
    ),
  )
  const custoMaoDeObra = Math.round(
    (entrada.minutosProducao / 60) * entrada.custoHoraCentavos,
  )
  const custoTotal = custoMateriais + custoMaoDeObra

  const lucro = Math.round((custoTotal * entrada.lucroPercent) / 100)
  const precoBase = custoTotal + lucro

  // As taxas são cobradas em cima do preço final, por isso dividimos.
  const total = Math.round(precoBase / (1 - entrada.taxasPercent / 100))

  return {
    custoMateriais,
    custoMaoDeObra,
    custoTotal,
    lucro,
    precoBase,
    taxas: total - precoBase,
    total,
  }
}

// Quando ela escolhe o preço final na mão: quanto sobra de lucro?
export function calcularLucroNoPreco(
  precoFinalCentavos: number,
  custoTotalCentavos: number,
  taxasPercent: number,
) {
  const taxas = Math.round((precoFinalCentavos * taxasPercent) / 100)
  const precoBase = precoFinalCentavos - taxas
  const lucro = precoBase - custoTotalCentavos
  const lucroPercent =
    custoTotalCentavos > 0 ? (lucro / custoTotalCentavos) * 100 : 0
  return { taxas, precoBase, lucro, lucroPercent }
}