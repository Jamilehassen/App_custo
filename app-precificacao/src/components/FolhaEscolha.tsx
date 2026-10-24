import { useState, type ReactNode } from 'react'
import { filtrar } from '../lib/busca'
import CampoBusca from './CampoBusca'

type Props<T> = {
  titulo: string
  itens: T[]
  chave: (item: T) => number
  campos: (item: T) => string[] // textos onde a busca procura
  renderizar: (item: T) => ReactNode
  aoEscolher: (item: T) => void
  aoFechar: () => void
  vazio: string
  topo?: ReactNode // opção extra no começo da lista
}

export default function FolhaEscolha<T>({
  titulo,
  itens,
  chave,
  campos,
  renderizar,
  aoEscolher,
  aoFechar,
  vazio,
  topo,
}: Props<T>) {
  const [busca, setBusca] = useState('')
  const visiveis = filtrar(itens, busca, campos)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={aoFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-t-3xl bg-white p-5"
      >
        <h3 className="text-lg font-semibold text-gray-800">{titulo}</h3>

        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Digite para buscar..." />

        <ul className="flex-1 space-y-1 overflow-y-auto">
          {topo && <li>{topo}</li>}
          {itens.length === 0 && <li className="p-3 text-gray-500">{vazio}</li>}
          {itens.length > 0 && visiveis.length === 0 && (
            <li className="p-3 text-gray-500">Nada encontrado.</li>
          )}
          {visiveis.map((item) => (
            <li key={chave(item)}>
              <button
                type="button"
                onClick={() => aoEscolher(item)}
                className="w-full rounded-xl p-3 text-left active:bg-rose-50"
              >
                {renderizar(item)}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={aoFechar}
            className="p-2 font-semibold text-rose-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}