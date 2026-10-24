import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatarDataCurta } from '../lib/datas'
import { totalDaVenda } from '../lib/feiras'
import { formatarReais } from '../lib/formato'
import { formasDePagamento, resumoDosItens, statusInfo, totalDoPedido } from '../lib/pedidos'

export default function PedidosDoCliente({ clienteId }: { clienteId: number }) {
  const pedidos = useLiveQuery(
    async () =>
      (await db.pedidos.where('clienteId').equals(clienteId).toArray()).sort((a, b) =>
        b.criadoEm.localeCompare(a.criadoEm),
      ),
    [clienteId],
  )
  const compras = useLiveQuery(
    async () =>
      (await db.vendasFeira.filter((v) => v.clienteId === clienteId).toArray()).sort((a, b) =>
        b.criadoEm.localeCompare(a.criadoEm),
      ),
    [clienteId],
  )
  const feiras = useLiveQuery(() => db.feiras.toArray())

  if (!pedidos || !compras || !feiras) return null

  // Orçamentos ainda não aprovados e pedidos cancelados não entram na soma.
  const validos = pedidos.filter((p) => p.status !== 'cancelado' && p.status !== 'orcamento')
  const totalPedidos = validos.reduce((soma, p) => soma + totalDoPedido(p.itens), 0)
  const totalFeira = compras.reduce((soma, v) => soma + totalDaVenda(v.itens), 0)

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow">
      <h3 className="font-semibold text-gray-800">Histórico deste cliente</h3>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Pedidos</h4>
        {pedidos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum pedido ainda.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {validos.length === 1 ? '1 pedido' : `${validos.length} pedidos`} ·{' '}
              {formatarReais(totalPedidos)} no total
            </p>
            <ul className="space-y-2">
              {pedidos.map((p) => (
                <li key={p.id} className="rounded-xl bg-rose-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">
                      {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusInfo[p.status].classes}`}
                    >
                      {statusInfo[p.status].rotulo}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-800">{resumoDosItens(p.itens)}</p>
                  <p className="font-semibold text-rose-600">
                    {formatarReais(totalDoPedido(p.itens))}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Compras na feira</h4>
        {compras.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma compra na feira ainda.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {compras.length === 1 ? '1 compra' : `${compras.length} compras`} ·{' '}
              {formatarReais(totalFeira)} no total
            </p>
            <ul className="space-y-2">
              {compras.map((v) => {
                const feira = feiras.find((f) => f.id === v.feiraId)
                return (
                  <li key={v.id} className="rounded-xl bg-rose-50 p-3 text-sm">
                    <p className="font-semibold text-gray-800">
                      {feira
                        ? `${feira.nome} · ${formatarDataCurta(feira.data)}`
                        : 'Feira removida'}
                    </p>
                    <p className="mt-1 text-gray-800">
                      {v.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join(', ')}
                    </p>
                    <p className="font-semibold text-rose-600">
                      {formatarReais(totalDaVenda(v.itens))}
                      {v.formaPagamento && (
                        <span className="font-normal text-gray-500">
                          {' '}
                          · {formasDePagamento[v.formaPagamento]}
                        </span>
                      )}
                    </p>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}