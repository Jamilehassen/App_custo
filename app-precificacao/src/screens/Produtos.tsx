import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { db, type Produto } from '../db'
import { calcularProduto, criarMapa, type ResumoProduto } from '../lib/produtos'
import { useCustoHora } from '../lib/useCustoHora'
import { formatarPercentual, formatarReais } from '../lib/formato'
import { filtrar } from '../lib/busca'
import CampoBusca from '../components/CampoBusca'
import EditarProduto from './EditarProduto'
import { formatarSaldo } from '../lib/estoque'
import { useEstoque } from '../lib/useEstoque'

export default function Produtos() {
  const produtos = useLiveQuery(() => db.produtos.orderBy('nome').toArray())
  const materiais = useLiveQuery(() => db.materiais.orderBy('nome').toArray())
  const estoque = useEstoque()
  const { valorHora } = useCustoHora()
  const [editando, setEditando] = useState<Produto | 'novo' | null>(null)
  const [busca, setBusca] = useState('')

  if (!produtos || !materiais) return null

  if (editando) {
    return (
      <EditarProduto
        inicial={editando === 'novo' ? undefined : editando}
        materiais={materiais}
        valorHora={valorHora}
        aoFechar={() => setEditando(null)}
      />
    )
  }

  const mapa = criarMapa(materiais)
  const visiveis = filtrar(produtos, busca, (p) => [p.nome])

  async function excluir(id: number, nome: string) {
  if (confirm(`Excluir "${nome}"?`)) {
    await db.produtos.delete(id)
    await db.catalogo.delete(id)
  }
}
  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditando('novo')}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        <Plus size={20} /> Novo produto
      </button>

      <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar produto..." />

      {produtos.length === 0 && (
        <p className="text-gray-500">Você ainda não cadastrou nenhum produto.</p>
      )}
      {produtos.length > 0 && visiveis.length === 0 && (
        <p className="text-gray-500">Nenhum produto encontrado.</p>
      )}

      <ul className="space-y-2">
        {visiveis.map((p) => {
          let resumo: ResumoProduto | null = null
          if (valorHora !== null) {
            try {
              resumo = calcularProduto(p, mapa, valorHora)
            } catch {
              resumo = null
            }
          }

          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow"
            >
              <button onClick={() => setEditando(p)} className="flex-1 text-left">
                <p className="font-semibold text-gray-800">{p.nome}</p>
                {estoque && estoque.saldoDe('produto', p.id) !== undefined && (
                  <p className="text-xs font-semibold text-gray-600">
                    Estoque:{' '}
                    {formatarSaldo('produto', 'unidade', estoque.saldoDe('produto', p.id) ?? 0)}
                  </p>
                )}
                {resumo ? (
                  <>
                    <p className="text-rose-600">Preço: {formatarReais(resumo.total)}</p>
                    <p
                      className={
                        resumo.lucro < 0
                          ? 'text-sm font-semibold text-red-600'
                          : 'text-sm text-gray-600'
                      }
                    >
                      Lucro: {formatarReais(resumo.lucro)} (
                      {formatarPercentual(resumo.lucroPercent)}% sobre o custo)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Descubra o valor da sua hora na aba Mais.
                  </p>
                )}
              </button>
              <button
                onClick={() => excluir(p.id, p.nome)}
                aria-label={`Excluir ${p.nome}`}
                className="p-2 text-gray-400"
              >
                <Trash2 size={22} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}