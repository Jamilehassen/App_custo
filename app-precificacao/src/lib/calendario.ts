import { paraISO } from './datas'

export type EstadoCalendario = {
  ano: number
  mes: number // 0 = janeiro ... 11 = dezembro
  selecionado: string // dia escolhido, 'AAAA-MM-DD'
}

export type DiaDoCalendario = {
  iso: string
  dia: number
  doMes: boolean // false = dia do mês anterior ou seguinte, só para completar a semana
}

// Todos os quadradinhos do mês, em semanas completas (domingo a sábado).
export function diasDoMes(ano: number, mes: number): DiaDoCalendario[] {
  const primeiro = new Date(ano, mes, 1)
  const ultimo = new Date(ano, mes + 1, 0)
  const total = Math.ceil((primeiro.getDay() + ultimo.getDate()) / 7) * 7

  const dias: DiaDoCalendario[] = []
  for (let i = 0; i < total; i++) {
    const data = new Date(ano, mes, 1 - primeiro.getDay() + i)
    dias.push({
      iso: paraISO(data),
      dia: data.getDate(),
      doMes: data.getMonth() === mes,
    })
  }
  return dias
}

// Anda de mês em mês, passando de dezembro para janeiro sozinho.
export function mudarMes(ano: number, mes: number, passo: number) {
  const data = new Date(ano, mes + passo, 1)
  return { ano: data.getFullYear(), mes: data.getMonth() }
}

// Ex.: "Outubro de 2026"
export function nomeDoMes(ano: number, mes: number): string {
  const texto = new Date(ano, mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}