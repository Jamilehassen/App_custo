import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MessageCircle, Plus, Trash2 } from 'lucide-react'
import { db, type Cliente } from '../db'
import { filtrar } from '../lib/busca'
import { formatarTelefone, linkWhatsapp } from '../lib/formato'
import CampoBusca from '../components/CampoBusca'
import EditarCliente from './EditarCliente'

export default function Clientes() {
  // Em ordem alfabética, sem se importar com maiúsculas e acentos.
  const clientes = useLiveQuery(async () =>
    (await db.clientes.toArray()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
  )
  const [editando, setEditando] = useState<Cliente | 'novo' | null>(null)
  const [busca, setBusca] = useState('')

  if (!clientes) return null

  if (editando) {
    return (
      <EditarCliente
        inicial={editando === 'novo' ? undefined : editando}
        aoFechar={() => setEditando(null)}
      />
    )
  }

  const visiveis = filtrar(clientes, busca, (c) => [
    c.nome,
    c.whatsapp ?? '',
    c.observacoes ?? '',
  ])

  async function excluir(id: number, nome: string) {
    if (confirm(`Excluir "${nome}"?`)) {
      await db.clientes.delete(id)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditando('novo')}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        <Plus size={20} /> Novo cliente
      </button>

      <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar cliente..." />

      {clientes.length > 0 && (
        <p className="text-sm text-gray-500">
          {clientes.length === 1 ? '1 cliente' : `${clientes.length} clientes`}
        </p>
      )}
      {clientes.length === 0 && (
        <p className="text-gray-500">Você ainda não cadastrou nenhum cliente.</p>
      )}
      {clientes.length > 0 && visiveis.length === 0 && (
        <p className="text-gray-500">Nenhum cliente encontrado.</p>
      )}

      <ul className="space-y-2">
        {visiveis.map((c) => {
          const primeiroNome = c.nome.trim().split(/\s+/)[0]
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-xl bg-white p-3 shadow"
            >
              <button
                type="button"
                onClick={() => setEditando(c)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg font-bold text-rose-600">
                  {c.nome.trim().charAt(0).toUpperCase()}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-gray-800">{c.nome}</span>
                  {c.whatsapp && (
                    <span className="block text-sm text-gray-600">
                      {formatarTelefone(c.whatsapp)}
                    </span>
                  )}
                  {c.observacoes && (
                    <span className="line-clamp-1 block text-xs text-gray-500">
                      {c.observacoes}
                    </span>
                  )}
                </span>
              </button>

              {c.whatsapp && (
                <a
                  href={linkWhatsapp(c.whatsapp, `Olá, ${primeiroNome}!`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chamar ${c.nome} no WhatsApp`}
                  className="rounded-full bg-green-600 p-2 text-white"
                >
                  <MessageCircle size={20} />
                </a>
              )}

              <button
                type="button"
                onClick={() => excluir(c.id, c.nome)}
                aria-label={`Excluir ${c.nome}`}
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