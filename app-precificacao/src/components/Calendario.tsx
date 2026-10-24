import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pedido } from '../db'
import { diasDoMes, mudarMes, nomeDoMes, type EstadoCalendario } from '../lib/calendario'
import { diasAte, formatarDataCurta, hojeISO } from '../lib/datas'
import { ABERTOS } from '../lib/pedidos'
import CartaoPedido from './CartaoPedido'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Props = {
  pedidos: Pedido[] // só as entregas (sem orçamentos e cancelados)
  estado: EstadoCalendario
  aoMudar: (estado: EstadoCalendario) => void
  nomeDoCliente: (pedido: Pedido) => string
  aoAbrir: (pedido: Pedido) => void
  aoAvancar: (pedido: Pedido) => void
}

// Cor da bolinha: pela urgência dos pedidos em aberto daquele dia.
function corDoDia(lista: Pedido[], iso: string) {
  const emAberto = lista.some((p) => ABERTOS.includes(p.status))
  if (!emAberto) return 'bg-gray-400'
  const dias = diasAte(iso)
  if (dias < 0) return 'bg-red-600'
  if (dias <= 1) return 'bg-amber-500'
  return 'bg-rose-600'
}

export default function Calendario({
  pedidos,
  estado,
  aoMudar,
  nomeDoCliente,
  aoAbrir,
  aoAvancar,
}: Props) {
  const hoje = hojeISO()
  const dias = diasDoMes(estado.ano, estado.mes)

  // Agrupa os pedidos pelo dia de entrega.
  const porDia = new Map<string, Pedido[]>()
  for (const p of pedidos) {
    const lista = porDia.get(p.prazoEntrega) ?? []
    lista.push(p)
    porDia.set(p.prazoEntrega, lista)
  }
  const doDia = porDia.get(estado.selecionado) ?? []

  function irParaMes(passo: number) {
    aoMudar({ ...estado, ...mudarMes(estado.ano, estado.mes, passo) })
  }

  function irParaHoje() {
    const agora = new Date()
    aoMudar({ ano: agora.getFullYear(), mes: agora.getMonth(), selecionado: hoje })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-3 shadow">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => irParaMes(-1)}
            aria-label="Mês anterior"
            className="p-2 text-gray-600"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-800">{nomeDoMes(estado.ano, estado.mes)}</p>
            <button
              type="button"
              onClick={irParaHoje}
              className="text-xs font-semibold text-rose-600"
            >
              Ir para hoje
            </button>
          </div>
          <button
            type="button"
            onClick={() => irParaMes(1)}
            aria-label="Próximo mês"
            className="p-2 text-gray-600"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400">
          {SEMANA.map((letra, i) => (
            <span key={i}>{letra}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const lista = porDia.get(d.iso) ?? []
            const selecionado = estado.selecionado === d.iso
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => aoMudar({ ...estado, selecionado: d.iso })}
                className={`flex h-12 flex-col items-center justify-center rounded-lg text-sm ${
                  d.doMes ? 'text-gray-800' : 'text-gray-300'
                } ${selecionado ? 'bg-rose-100 font-bold ring-2 ring-rose-600' : ''} ${
                  d.iso === hoje && !selecionado ? 'ring-1 ring-rose-400' : ''
                }`}
              >
                {d.dia}
                {lista.length > 0 && (
                  <span
                    className={`mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${corDoDia(lista, d.iso)}`}
                  >
                    {lista.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <p className="mt-2 text-center text-[11px] text-gray-500">
          Vermelho: atrasado · Laranja: hoje ou amanhã · Rosa: próximas · Cinza: já entregue
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-800">
          Entregas de {formatarDataCurta(estado.selecionado)}
        </h3>

        {doDia.length === 0 ? (
          <p className="text-gray-500">Nenhuma entrega neste dia.</p>
        ) : (
          <ul className="space-y-3">
            {doDia.map((p) => (
              <li key={p.id}>
                <CartaoPedido
                  pedido={p}
                  nomeCliente={nomeDoCliente(p)}
                  aoAbrir={() => aoAbrir(p)}
                  aoAvancar={() => aoAvancar(p)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}