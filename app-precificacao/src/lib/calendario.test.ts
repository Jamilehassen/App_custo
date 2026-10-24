import { describe, expect, it } from 'vitest'
import { diasDoMes, mudarMes } from './calendario'

describe('calendário', () => {
  it('outubro de 2026 tem 5 semanas, de 27/09 a 31/10', () => {
    const dias = diasDoMes(2026, 9)
    expect(dias).toHaveLength(35)
    expect(dias[0].iso).toBe('2026-09-27') // domingo
    expect(dias[34].iso).toBe('2026-10-31')
  })

  it('fevereiro de 2026 cabe em 4 semanas certinhas', () => {
    const dias = diasDoMes(2026, 1)
    expect(dias).toHaveLength(28)
    expect(dias[0].iso).toBe('2026-02-01')
    expect(dias[27].iso).toBe('2026-02-28')
  })

  it('marca quais dias são do mês', () => {
    const dias = diasDoMes(2026, 9)
    expect(dias[0].doMes).toBe(false) // 27/09
    const primeiroDeOutubro = dias.find((d) => d.iso === '2026-10-01')
    expect(primeiroDeOutubro).toMatchObject({ dia: 1, doMes: true })
  })

  it('muda de mês passando de ano', () => {
    expect(mudarMes(2026, 11, 1)).toEqual({ ano: 2027, mes: 0 })
    expect(mudarMes(2026, 0, -1)).toEqual({ ano: 2025, mes: 11 })
  })
})