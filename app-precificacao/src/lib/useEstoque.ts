import { useLiveQuery } from 'dexie-react-hooks'
import { db, type AlvoEstoque } from '../db'
import { calcularSaldos, chaveDoItem, nivelDoEstoque, precisaDeAtencao } from './estoque'

// Devolve os materiais, os produtos, os movimentos e o saldo de cada item.
// Devolve null enquanto os dados ainda estão carregando.
export function useEstoque() {
  const movimentos = useLiveQuery(() => db.movimentos.toArray())
  const avisos = useLiveQuery(() => db.avisosEstoque.toArray())
  const materiais = useLiveQuery(() => db.materiais.toArray())
  const produtos = useLiveQuery(() => db.produtos.toArray())

  if (!movimentos || !avisos || !materiais || !produtos) return null

  const saldos = calcularSaldos(movimentos)
  const saldoDe = (alvo: AlvoEstoque, id: number) => saldos.get(chaveDoItem(alvo, id))
  const minimoDe = (alvo: AlvoEstoque, id: number) =>
    avisos.find((a) => a.alvo === alvo && a.alvoId === id)?.minimo

  const precisamDeAtencao =
    materiais.filter((m) =>
      precisaDeAtencao(nivelDoEstoque(saldoDe('material', m.id), minimoDe('material', m.id))),
    ).length +
    produtos.filter((p) =>
      precisaDeAtencao(nivelDoEstoque(saldoDe('produto', p.id), minimoDe('produto', p.id))),
    ).length

  return { movimentos, materiais, produtos, saldoDe, minimoDe, precisamDeAtencao }
}