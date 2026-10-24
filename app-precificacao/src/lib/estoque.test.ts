import { describe, expect, it } from 'vitest'
import {
  calcularSaldos,
  chaveDoItem,
  formatarQuantidade,
  formatarSaldo,
  nivelDoEstoque,
} from './estoque'

describe('saldos do estoque', () => {
  it('soma as entradas e saídas de cada item separadamente', () => {
    const saldos = calcularSaldos([
      { alvo: 'material', alvoId: 1, quantidade: 1000 },
      { alvo: 'material', alvoId: 1, quantidade: -250 },
      { alvo: 'produto', alvoId: 1, quantidade: 5 },
    ])
    expect(saldos.get(chaveDoItem('material', 1))).toBe(750)
    expect(saldos.get(chaveDoItem('produto', 1))).toBe(5)
    expect(saldos.get(chaveDoItem('produto', 2))).toBeUndefined()
  })

  it('não deixa sobrar arredondamento', () => {
    const saldos = calcularSaldos([
      { alvo: 'material', alvoId: 1, quantidade: 0.1 },
      { alvo: 'material', alvoId: 1, quantidade: 0.2 },
    ])
    expect(saldos.get(chaveDoItem('material', 1))).toBe(0.3)
  })
})

describe('quantidades legíveis', () => {
  it('escreve do jeito que se fala', () => {
    expect(formatarQuantidade('comprimento', 250)).toBe('2,5 m')
    expect(formatarQuantidade('comprimento', 80)).toBe('80 cm')
    expect(formatarQuantidade('area', 15000)).toBe('1,5 m²')
    expect(formatarQuantidade('area', 900)).toBe('900 cm²')
    expect(formatarQuantidade('peso', 1500)).toBe('1,5 kg')
    expect(formatarQuantidade('volume', 250)).toBe('250 ml')
    expect(formatarSaldo('produto', 'unidade', 1)).toBe('1 peça')
    expect(formatarSaldo('produto', 'unidade', 3)).toBe('3 peças')
  })
})

describe('nível do estoque', () => {
  it('avisa quando acaba ou está baixo', () => {
    expect(nivelDoEstoque(undefined, undefined)).toBe('sem-controle')
    expect(nivelDoEstoque(0)).toBe('zerado')
    expect(nivelDoEstoque(-2)).toBe('zerado')
    expect(nivelDoEstoque(undefined, 3)).toBe('zerado')
    expect(nivelDoEstoque(5, 5)).toBe('baixo')
    expect(nivelDoEstoque(6, 5)).toBe('ok')
    expect(nivelDoEstoque(10)).toBe('ok')
  })
})