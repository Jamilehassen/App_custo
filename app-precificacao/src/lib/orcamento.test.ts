import { afterEach, describe, expect, it, vi } from 'vitest'
import { situacaoDaValidade } from './datas'
import { prazoAoAprovar, textoDoPrazoDoOrcamento } from './pedidos'

afterEach(() => {
  vi.useRealTimers()
})

describe('aprovar orçamento', () => {
  it('marca a entrega pelos dias combinados no orçamento', () => {
    expect(prazoAoAprovar({ prazoDias: 10 }, '2026-10-21')).toBe('2026-10-31')
  })

  it('usa 7 dias quando o orçamento não tem prazo', () => {
    expect(prazoAoAprovar({}, '2026-10-21')).toBe('2026-10-28')
  })

  it('escreve o prazo por extenso', () => {
    expect(textoDoPrazoDoOrcamento(7)).toBe('7 dias após a aprovação')
    expect(textoDoPrazoDoOrcamento(1)).toBe('1 dia após a aprovação')
    expect(textoDoPrazoDoOrcamento(0)).toBe('no mesmo dia da aprovação')
  })
})

describe('validade do orçamento', () => {
  it('avisa quanto tempo falta ou se já venceu', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 21, 15, 0)) // 21/10/2026
    expect(situacaoDaValidade('2026-10-25').texto).toBe('Vale por mais 4 dias')
    expect(situacaoDaValidade('2026-10-21').texto).toBe('Vale até hoje')
    expect(situacaoDaValidade('2026-10-20').texto).toBe('Venceu ontem')
    expect(situacaoDaValidade('2026-10-18').texto).toBe('Venceu há 3 dias')
  })
})