import { useState } from 'react'
import type { Cliente, Pedido } from '../db'
import { feirasUsadas, proximoNomeDeFeira } from '../lib/pedidos'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base'
const chip = 'rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700'

type Props = {
  cliente?: Cliente // cliente cadastrado que foi escolhido
  clienteAvulso: string // nome rápido
  pedidos: Pedido[] // para numerar e sugerir feiras
  aoMudarNome: (nome: string) => void
  aoEscolherCadastrado: () => void
  aoTirarCliente: () => void
}

export default function ClienteDoPedido({
  cliente,
  clienteAvulso,
  pedidos,
  aoMudarNome,
  aoEscolherCadastrado,
  aoTirarCliente,
}: Props) {
  const [feira, setFeira] = useState('')
  const recentes = feirasUsadas(pedidos).slice(0, 4)

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h3 className="font-semibold text-gray-800">Cliente</h3>

      {cliente ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 p-3">
          <span className="font-semibold text-gray-800">{cliente.nome}</span>
          <span className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={aoEscolherCadastrado}
              className="font-semibold text-rose-600"
            >
              Trocar
            </button>
            <button type="button" onClick={aoTirarCliente} className="text-gray-500">
              Tirar
            </button>
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={aoEscolherCadastrado}
            className="w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600"
          >
            Escolher cliente cadastrado
          </button>

          <div className="space-y-3 rounded-xl bg-rose-50 p-3">
            <p className="text-sm font-semibold text-gray-800">
              Venda de feira ou cliente sem cadastro
            </p>

            <label className="block text-sm text-gray-600">
              Nome rápido
              <input
                value={clienteAvulso}
                onChange={(e) => aoMudarNome(e.target.value)}
                placeholder="Ex.: Cliente 1 - Feira Millenium"
                className={campo}
              />
            </label>

            <label className="block text-sm text-gray-600">
              Feira ou local (para numerar sozinho)
              <input
                value={feira}
                onChange={(e) => setFeira(e.target.value)}
                placeholder="Ex.: Feira Millenium"
                className={campo}
              />
            </label>

            {recentes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recentes.map((f) => (
                  <button key={f} type="button" onClick={() => setFeira(f)} className={chip}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => aoMudarNome(proximoNomeDeFeira(pedidos, feira))}
              className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
            >
              Gerar nome numerado
            </button>
          </div>
        </>
      )}
    </section>
  )
}