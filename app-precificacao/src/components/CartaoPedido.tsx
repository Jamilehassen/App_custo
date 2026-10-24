import type { Pedido } from '../db'
import { formatarDataCurta, situacaoDaValidade, situacaoDoPrazo } from '../lib/datas'
import { formatarReais } from '../lib/formato'
import {
  ABERTOS,
  formasDePagamento,
  resumoDosItens,
  restanteAPagar,
  statusInfo,
  textoDoPrazoDoOrcamento,
  totalDoPedido,
} from '../lib/pedidos'

type Props = {
  pedido: Pedido
  nomeCliente: string
  aoAbrir: () => void
  aoAvancar: () => void
  aoEnviar?: () => void // só usado nos orçamentos
}

export default function CartaoPedido({
  pedido: p,
  nomeCliente,
  aoAbrir,
  aoAvancar,
  aoEnviar,
}: Props) {
  const info = statusInfo[p.status]
  const ehOrcamento = p.status === 'orcamento'
  const aberto = ABERTOS.includes(p.status)
  const prazo = situacaoDoPrazo(p.prazoEntrega)
  const validade = p.validadeOrcamento ? situacaoDaValidade(p.validadeOrcamento) : null
  const falta = restanteAPagar(p)

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <button type="button" onClick={aoAbrir} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-800">{nomeCliente}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${info.classes}`}
          >
            {info.rotulo}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{resumoDosItens(p.itens)}</p>

        {p.observacoes && (
          <p className="mt-2 whitespace-pre-line rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
            <span className="font-semibold">Obs.:</span> {p.observacoes}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          {ehOrcamento ? (
            validade ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${validade.classes}`}
              >
                {validade.texto}
              </span>
            ) : (
              <span />
            )
          ) : aberto ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${prazo.classes}`}>
              {formatarDataCurta(p.prazoEntrega)} · {prazo.texto}
            </span>
          ) : (
            <span className="text-gray-500">Entrega: {formatarDataCurta(p.prazoEntrega)}</span>
          )}
          <span className="font-bold text-rose-600">{formatarReais(totalDoPedido(p.itens))}</span>
        </div>

        {ehOrcamento && p.prazoDias !== undefined && (
          <p className="mt-1 text-xs text-gray-500">
            Entrega: {textoDoPrazoDoOrcamento(p.prazoDias)}
          </p>
        )}

        {!ehOrcamento && p.status !== 'cancelado' && (
          <p
            className={`mt-1 text-xs ${falta > 0 ? 'font-semibold text-amber-700' : 'text-green-700'}`}
          >
            {falta > 0 ? `Falta receber ${formatarReais(falta)}` : 'Pago'}
            {p.formaPagamento && ` · ${formasDePagamento[p.formaPagamento]}`}
          </p>
        )}
      </button>

      {ehOrcamento ? (
        <div className="mt-3 space-y-2">
          {aoEnviar && (
            <button
              type="button"
              onClick={aoEnviar}
              className="w-full rounded-lg bg-rose-600 p-2 text-sm font-semibold text-white"
            >
              Enviar orçamento (PDF)
            </button>
          )}
          <button
            type="button"
            onClick={aoAvancar}
            className="w-full rounded-lg border border-rose-600 p-2 text-sm font-semibold text-rose-600"
          >
            {info.acao}
          </button>
        </div>
      ) : (
        info.proximo && (
          <button
            type="button"
            onClick={aoAvancar}
            className="mt-3 w-full rounded-lg border border-rose-600 p-2 text-sm font-semibold text-rose-600"
          >
            {info.acao}
          </button>
        )
      )}
    </div>
  )
}