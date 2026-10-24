import { describe, it, expect } from 'vitest'
import {
  calcularLucroNoPreco,
  calcularPreco,
  custoPorCm2,
  custoPorHora,
  custoUnitario,
  precoPorMetro,
} from './precificacao'

describe('custoPorHora', () => {
  it('soma retirada e custos fixos e divide pelas horas', () => {
    // retirada R$ 2.000 + custos fixos R$ 300 e R$ 100, 120 horas no mês
    expect(custoPorHora(200000, [30000, 10000], 120)).toBe(2000) // R$ 20,00/h
  })
})

describe('custoUnitario', () => {
  it('divide o preço pago pela quantidade comprada', () => {
    expect(custoUnitario(3000, 200)).toBe(15)
  })
})

describe('precoPorMetro', () => {
  it('converte centímetros em metros', () => {
    expect(precoPorMetro(3000, 200, 'cm')).toBe(1500)
  })

  it('aceita metros direto', () => {
    expect(precoPorMetro(4500, 3, 'm')).toBe(1500)
  })

  it('recusa quantidade zero', () => {
    expect(() => precoPorMetro(3000, 0, 'm')).toThrow()
  })
})

describe('custoPorCm2', () => {
  it('calcula o custo de um pedaço do tecido', () => {
    // tecido de 140 × 100 cm por R$ 28,00 → 0,2 centavo por cm²
    const porCm2 = custoPorCm2(2800, 140, 100)
    expect(porCm2).toBeCloseTo(0.2)
    // pedaço de 30 × 30 cm = 900 cm² → R$ 1,80
    expect(porCm2 * 30 * 30).toBeCloseTo(180)
  })

  it('recusa largura ou altura zero', () => {
    expect(() => custoPorCm2(2800, 0, 100)).toThrow()
  })
})

describe('calcularPreco', () => {
  it('põe o lucro em cima do custo e as taxas sobre o preço final', () => {
    // Mesmos números do exemplo: materiais R$ 6,06 + trabalho R$ 19,68
    const r = calcularPreco({
      materiais: [{ custoUnitarioCentavos: 606, quantidade: 1 }],
      minutosProducao: 60,
      custoHoraCentavos: 1968,
      lucroPercent: 85.9,
      taxasPercent: 5,
    })

    expect(r).toEqual({
      custoMateriais: 606,
      custoMaoDeObra: 1968,
      custoTotal: 2574, // R$ 25,74
      lucro: 2211, // R$ 22,11
      precoBase: 4785, // R$ 47,85
      taxas: 252, // R$ 2,52
      total: 5037, // R$ 50,37
    })
  })

  it('aceita lucro de 99% e acima de 100%', () => {
    const base = {
      materiais: [{ custoUnitarioCentavos: 180, quantidade: 1 }],
      minutosProducao: 30,
      custoHoraCentavos: 2506,
      taxasPercent: 0,
    }
    // custo total R$ 14,33
    expect(calcularPreco({ ...base, lucroPercent: 99 }).total).toBe(2852)
    expect(calcularPreco({ ...base, lucroPercent: 150 }).total).toBe(3583)
  })

  it('recusa lucro negativo e taxas de 100% ou mais', () => {
    const base = {
      materiais: [],
      minutosProducao: 30,
      custoHoraCentavos: 2000,
    }
    expect(() =>
      calcularPreco({ ...base, lucroPercent: -5, taxasPercent: 0 }),
    ).toThrow()
    expect(() =>
      calcularPreco({ ...base, lucroPercent: 50, taxasPercent: 100 }),
    ).toThrow()
  })
})

describe('calcularLucroNoPreco', () => {
  it('calcula o lucro de um preço final escolhido na mão', () => {
    // vende por R$ 50,00, custo R$ 20,00, taxas de 10% (R$ 5,00)
    expect(calcularLucroNoPreco(5000, 2000, 10)).toEqual({
      taxas: 500,
      precoBase: 4500,
      lucro: 2500,
      lucroPercent: 125,
    })
  })

  it('mostra prejuízo quando o preço não cobre o custo', () => {
    expect(calcularLucroNoPreco(1000, 2000, 0).lucro).toBe(-1000)
  })
})