import type { TipoMedida } from '../db'

// Para cada tipo de material: como ele é vendido (preço) e como é usado na peça.
export const medidas: Record<
  TipoMedida,
  {
    rotulo: string // nome no seletor
    rotuloPreco: string // texto do campo de preço
    sufixo: string // "R$ 15,00 por ..."
    unidadeUso: string // unidade usada dentro das peças
    divisor: number // quantas unidades de uso cabem em 1 unidade do preço
    exemplo: string
  }
> = {
  unidade: {
    rotulo: 'Unidade',
    rotuloPreco: 'Preço de 1 unidade (R$)',
    sufixo: 'unidade',
    unidadeUso: 'un',
    divisor: 1,
    exemplo: 'Ex.: botão, zíper, etiqueta',
  },
  comprimento: {
    rotulo: 'Comprimento',
    rotuloPreco: 'Preço de 1 metro (R$)',
    sufixo: 'metro',
    unidadeUso: 'cm',
    divisor: 100,
    exemplo: 'Ex.: fita, viés, elástico, cordão',
  },
  area: {
    rotulo: 'Área',
    rotuloPreco: 'Preço de 1 metro quadrado (R$)',
    sufixo: 'm²',
    unidadeUso: 'cm²',
    divisor: 10000,
    exemplo: 'Ex.: tecido usado em recortes (largura × altura)',
  },
  peso: {
    rotulo: 'Peso (Kg)',
    rotuloPreco: 'Preço de 1 quilo (R$)',
    sufixo: 'kg',
    unidadeUso: 'g',
    divisor: 1000,
    exemplo: 'Ex.: fibra, enchimento, linha vendida por peso',
  },
  volume: {
    rotulo: 'Volume (L)',
    rotuloPreco: 'Preço de 1 litro (R$)',
    sufixo: 'litro',
    unidadeUso: 'ml',
    divisor: 1000,
    exemplo: 'Ex.: cola, tinta',
  },
}