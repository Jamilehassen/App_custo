import type { Material, Pedido, Produto } from '../db'
import { formatarDataCurta, situacaoDoPrazo } from '../lib/datas'
import { formatarQuantidade } from '../lib/estoque'
import {
  disponivelDoProduto,
  listaDeCompras,
  reservadoPorPedidosProntos,
} from '../lib/estoquePedidos'
import { itensAProduzir } from '../lib/pedidos'
import { useEstoque } from '../lib/useEstoque'

type Props = {
  pedidos: Pedido[]
  produtos: Produto[]
  materiais: Material[]
}

export default function AProduzir({ pedidos, produtos, materiais }: Props) {
  const estoque = useEstoque()
  if (!estoque) return null

  const reservado = reservadoPorPedidosProntos(pedidos)

  // Para cada linha: quanto precisa, quanto já tem pronto livre e quanto falta fazer.
  const linhas = itensAProduzir(pedidos).map((l) => {
    if (l.encomenda || l.produtoId === undefined) {
      return { ...l, disponivel: 0, falta: l.quantidade }
    }
    const disponivel = disponivelDoProduto(
      estoque.saldoDe('produto', l.produtoId),
      reservado.get(l.produtoId),
    )
    return { ...l, disponivel, falta: Math.max(0, l.quantidade - disponivel) }
  })

  const pecasParaFazer = linhas.reduce((soma, l) => soma + l.falta, 0)

  const compras = listaDeCompras(
    linhas.flatMap((l) =>
      !l.encomenda && l.produtoId !== undefined
        ? [{ produtoId: l.produtoId, falta: l.falta }]
        : [],
    ),
    produtos,
    (id) => estoque.saldoDe('material', id),
  )
    .flatMap((c) => {
      const material = materiais.find((m) => m.id === c.materialId)
      return material ? [{ ...c, material }] : []
    })
    .sort((a, b) => a.material.nome.localeCompare(b.material.nome, 'pt-BR'))

  const paraComprar = compras.filter((c) => c.comprar !== undefined && c.comprar > 0)
  const semControle = compras.filter((c) => c.comprar === undefined)

  const textoDaLista = [
    'Lista de compras:',
    ...paraComprar.map(
      (c) => `- ${c.material.nome}: ${formatarQuantidade(c.material.tipoMedida, c.comprar ?? 0)}`,
    ),
  ].join('\n')

  if (linhas.length === 0) {
    return (
      <p className="text-gray-500">
        Nada para produzir agora. Os itens dos pedidos novos e em produção aparecem aqui.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {pecasParaFazer === 0
          ? 'Tudo o que os pedidos pedem já está pronto no estoque.'
          : `${pecasParaFazer === 1 ? '1 peça' : `${pecasParaFazer} peças`} para fazer, já descontando o que você tem pronto.`}
      </p>

      <ul className="space-y-2">
        {linhas.map((l) => {
          const prazo = situacaoDoPrazo(l.prazo)
          return (
            <li key={l.chave} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-gray-800">
                  {l.quantidade}× {l.descricao}
                </p>
                {l.encomenda && (
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    encomenda
                  </span>
                )}
              </div>

              {!l.encomenda && (
                <p className="mt-1 text-sm">
                  {l.falta === 0 ? (
                    <span className="font-semibold text-green-700">Já tem no estoque</span>
                  ) : (
                    <>
                      <span className="text-gray-600">
                        Tem pronto: {l.disponivel} ·{' '}
                      </span>
                      <span className="font-semibold text-rose-600">Falta fazer: {l.falta}</span>
                    </>
                  )}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${prazo.classes}`}>
                  Entrega mais próxima: {formatarDataCurta(l.prazo)} · {prazo.texto}
                </span>
                {!l.encomenda && l.pedidos > 1 && (
                  <span className="text-gray-500">em {l.pedidos} pedidos</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <h3 className="font-semibold text-gray-800">Lista de compras</h3>

        {compras.length === 0 && (
          <p className="text-sm text-gray-500">
            Nenhum material para comprar: os produtos que faltam fazer ainda não têm materiais na
            ficha técnica, ou já está tudo pronto.
          </p>
        )}

        {compras.length > 0 && paraComprar.length === 0 && (
          <p className="text-sm font-semibold text-green-700">
            Seu estoque de materiais cobre tudo o que falta fazer.
          </p>
        )}

        {paraComprar.length > 0 && (
          <ul className="space-y-2">
            {paraComprar.map((c) => (
              <li key={c.materialId} className="rounded-xl bg-rose-50 p-3 text-sm">
                <p className="font-semibold text-gray-800">{c.material.nome}</p>
                <p className="font-semibold text-rose-600">
                  Comprar {formatarQuantidade(c.material.tipoMedida, c.comprar ?? 0)}
                </p>
                <p className="text-xs text-gray-500">
                  Precisa de {formatarQuantidade(c.material.tipoMedida, c.necessario)} · tem{' '}
                  {formatarQuantidade(c.material.tipoMedida, Math.max(0, c.emEstoque ?? 0))}
                </p>
              </li>
            ))}
          </ul>
        )}

        {paraComprar.length > 0 && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(textoDaLista)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-green-600 p-3 text-center text-base font-semibold text-white"
          >
            Enviar a lista pelo WhatsApp
          </a>
        )}

        {semControle.length > 0 && (
          <div className="space-y-1 text-sm text-gray-600">
            <p className="font-semibold text-gray-700">Confira no seu estoque:</p>
            <ul className="space-y-1">
              {semControle.map((c) => (
                <li key={c.materialId}>
                  {c.material.nome}: precisa de{' '}
                  {formatarQuantidade(c.material.tipoMedida, c.necessario)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500">
              Esses materiais ainda não têm contagem no Estoque, então o app não sabe se você tem.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Encomendas personalizadas não entram na lista, porque o app não sabe quais materiais
          elas usam.
        </p>
      </section>
    </div>
  )
}