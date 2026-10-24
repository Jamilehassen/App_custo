import { afterEach, describe, expect, it, vi } from 'vitest'
import { diasAte, paraISO, situacaoDoPrazo, somarDias } from './datas'

afterEach(() => {
  vi.useRealTimers()
})

describe('somarDias', () => {
  it('passa para o mês seguinte', () => {
    expect(somarDias('2026-10-30', 3)).toBe('2026-11-02')
  })

  it('passa para o ano seguinte', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('escreve a data com dois dígitos', () => {
    expect(paraISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('prazo de entrega', () => {
  it('conta dias a partir de hoje', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 21, 15, 0)) // 21/10/2026
    expect(diasAte('2026-10-24')).toBe(3)
    expect(diasAte('2026-10-20')).toBe(-1)
    expect(situacaoDoPrazo('2026-10-21').texto).toBe('Hoje')
    expect(situacaoDoPrazo('2026-10-20').texto).toBe('Atrasado há 1 dia')
  })
})