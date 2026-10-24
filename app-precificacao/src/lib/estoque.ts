import type { AlvoEstoque, MotivoEstoque, MovimentoEstoque, TipoMedida } from '../db'

export const motivos: Record<MotivoEstoque, string> = {
  compra: 'Compra',
  producao: 'Produção',
  venda: 'Venda ou entrega',
  consumo: 'Uso na produção',
  ajuste: 'Contagem (ajuste)',
  perda: 'Perda',
}

export function chaveDoItem(alvo: AlvoEstoque, id: number): string {
  return `${alvo}:${id}`
}

// Saldo de cada item = soma de todas as entradas e saídas.
// Quem nunca teve movimento não aparece no resultado.
export function calcularSaldos(
  movimentos: Pick<MovimentoEstoque, 'alvo' | 'alvoId' | 'quantidade'>[],
): Map<string, number> {
  const saldos = new Map<string, number>()
  for (const m of movimentos) {
    const chave = chaveDoItem(m.alvo, m.alvoId)
    saldos.set(chave, (saldos.get(chave) ?? 0) + m.quantidade)
  }
  // Evita sobras de arredondamento do computador (0,1 + 0,2).
  for (const [chave, valor] of saldos) {
    saldos.set(chave, Math.round(valor * 1000) / 1000)
  }
  return saldos
}

// Como ela digita cada tipo de material, e quanto vale na unidade de uso.
export type UnidadeDeEntrada = { id: string; rotulo: string; fator: number }

const UNIDADES: Record<TipoMedida, UnidadeDeEntrada[]> = {
  unidade: [{ id: 'un', rotulo: 'unidades', fator: 1 }],
  comprimento: [
    { id: 'm', rotulo: 'metros', fator: 100 },
    { id: 'cm', rotulo: 'centímetros', fator: 1 },
  ],
  area: [{ id: 'cm2', rotulo: 'cm²', fator: 1 }],
  peso: [
    { id: 'kg', rotulo: 'quilos (kg)', fator: 1000 },
    { id: 'g', rotulo: 'gramas (g)', fator: 1 },
  ],
  volume: [
    { id: 'l', rotulo: 'litros (L)', fator: 1000 },
    { id: 'ml', rotulo: 'mililitros (ml)', fator: 1 },
  ],
}

export function unidadesDeEntrada(tipo: TipoMedida): UnidadeDeEntrada[] {
  return UNIDADES[tipo]
}

function numero(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

// Mostra a quantidade do jeito que se fala: "2,5 m", "80 cm", "1,5 kg".
export function formatarQuantidade(tipo: TipoMedida, valor: number): string {
  const grande = (limite: number) => Math.abs(valor) >= limite
  switch (tipo) {
    case 'unidade':
      return `${numero(valor)} un`
    case 'comprimento':
      return grande(100) ? `${numero(valor / 100)} m` : `${numero(valor)} cm`
    case 'area':
      return grande(10000) ? `${numero(valor / 10000)} m²` : `${numero(valor)} cm²`
    case 'peso':
      return grande(1000) ? `${numero(valor / 1000)} kg` : `${numero(valor)} g`
    case 'volume':
      return grande(1000) ? `${numero(valor / 1000)} L` : `${numero(valor)} ml`
  }
}

// Produtos prontos contam em peças; materiais, na unidade do tipo.
export function formatarSaldo(alvo: AlvoEstoque, tipo: TipoMedida, valor: number): string {
  if (alvo === 'produto') return `${numero(valor)} ${valor === 1 ? 'peça' : 'peças'}`
  return formatarQuantidade(tipo, valor)
}

export type NivelDoEstoque = 'sem-controle' | 'ok' | 'baixo' | 'zerado'

export function nivelDoEstoque(saldo: number | undefined, minimo?: number): NivelDoEstoque {
  // Nunca teve movimento e não tem aviso: o estoque desse item não é controlado.
  if (saldo === undefined && minimo === undefined) return 'sem-controle'
  const atual = saldo ?? 0
  if (atual <= 0) return 'zerado'
  if (minimo !== undefined && atual <= minimo) return 'baixo'
  return 'ok'
}

export function precisaDeAtencao(nivel: NivelDoEstoque): boolean {
  return nivel === 'zerado' || nivel === 'baixo'
}