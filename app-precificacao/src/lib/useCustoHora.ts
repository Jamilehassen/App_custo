import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { custoPorHora } from './precificacao'

const SEMANAS_POR_MES = 52 / 12
// const SEMANAS_POR_MES = 4

// Devolve o valor da hora de trabalho (em centavos) e as horas por mês.
// valorHora é null enquanto ela não preencher a seção "Seu trabalho".
export function useCustoHora() {
  const custos = useLiveQuery(() => db.custosFixos.toArray())
  const config = useLiveQuery(() => db.configuracao.get(1))

  if (!config || !custos) return { valorHora: null, horasPorMes: 0 }

  const horasPorMes = Math.round(
    config.diasPorSemana * config.horasPorDia * SEMANAS_POR_MES,
  )
  if (horasPorMes <= 0) return { valorHora: null, horasPorMes }

  const valorHora = custoPorHora(
    config.retiradaDesejadaCentavos,
    custos.map((c) => c.valorMensalCentavos),
    horasPorMes,
  )
  return { valorHora, horasPorMes }
}