import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Material } from '../db'
import { filtrar } from '../lib/busca'
import CampoBusca from './CampoBusca'
import IconeMaterial from './IconeMaterial'

type Props = {
  materiais: Material[]
  aoEscolher: (material: Material) => void
  aoFechar: () => void
}

export default function EscolherMaterial({ materiais, aoEscolher, aoFechar }: Props) {
  const [busca, setBusca] = useState('')
  const visiveis = filtrar(materiais, busca, (m) => [m.nome, m.observacoes ?? ''])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={aoFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-t-3xl bg-white p-5"
      >
        <h3 className="text-lg font-semibold text-gray-800">Escolher material</h3>

        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Digite alguma coisa aqui..." />

        <ul className="flex-1 space-y-1 overflow-y-auto">
          {materiais.length === 0 && (
            <li className="p-3 text-gray-500">
              Você ainda não cadastrou nenhum material.
            </li>
          )}
          {materiais.length > 0 && visiveis.length === 0 && (
            <li className="p-3 text-gray-500">Nenhum material encontrado.</li>
          )}
          {visiveis.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => aoEscolher(m)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left active:bg-rose-50"
              >
                <IconeMaterial tipo={m.tipoMedida} />
                <span className="flex-1">
                  <span className="block font-semibold text-gray-800">{m.nome}</span>
                  {m.observacoes && (
                    <span className="block text-xs text-gray-500">{m.observacoes}</span>
                  )}
                </span>
                <ChevronRight size={22} className="text-rose-600" />
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