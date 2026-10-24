import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db, type Feira, type Produto, type VendaFeira } from '../db'
import { calcularProduto, criarMapa } from '../lib/produtos'
import { useCustoHora } from '../lib/useCustoHora'
import { formatarDataCurta } from '../lib/datas'
import { formatarReais } from '../lib/formato'
import { formasDePagamento, TODAS_FORMAS } from '../lib/pedidos'
import { proximoNumeroDeCliente, resumirFeira, rotuloDaVenda, totalDaVenda } from '../lib/feiras'
import Cabecalho from '../components/Cabecalho'
import FormVenda from './FormVenda'

type Props = {
  feira: Feira
  vendas: VendaFeira[]
  aoVoltar: () => void
}

export default function DiaDeFeira({ feira, vendas, aoVoltar }: Props) {
  const produtos = useLiveQuery(() => db.produtos.orderBy('nome').toArray())
  const materiais = useLiveQuery(() => db.materiais.toArray())
  const clientes = useLiveQuery(() => db.clientes.toArray())
  const { valorHora } = useCustoHora()
  const [editando, setEditando] = useState<VendaFeira | 'nova' | null>(null)
  const [chaveForm, setChaveForm] = useState(0)

  if (!produtos || !materiais || !clientes) return null

  const mapaMateriais = criarMapa(materiais)

  // Preço atual de um produto (sugestão na hora de vender).
  function precoDe(produto: Produto): number | null {
    if (valorHora === null) return null
    try {
      return calcularProduto(produto, mapaMateriais, valorHora).total
    } catch {
      return null
    }
  }

  // Nome da cliente da agenda, quando a venda foi ligada a uma.
  const nomeCadastrado = (v: VendaFeira) => clientes.find((c) => c.id === v.clienteId)?.nome

  if (editando) {
    return (
      <FormVenda
        key={`${chaveForm}-${editando === 'nova' ? 'nova' : editando.id}`}
        feira={feira}
        inicial={editando === 'nova' ? undefined : editando}
        numeroNovo={proximoNumeroDeCliente(vendas)}
        produtos={produtos}
        clientes={clientes}
        precoDe={precoDe}
        aoSalvar={(outraVenda) => {
          if (outraVenda) setChaveForm((k) => k + 1) // limpa o formulário para o próximo cliente
          else setEditando(null)
        }}
        aoFechar={() => setEditando(null)}
      />
    )
  }

  const resumo = resumirFeira(vendas)
  const ordenadas = [...vendas].sort((a, b) => b.numero - a.numero)

  async function excluirFeira() {
    const aviso =
      vendas.length > 0
        ? `Excluir "${feira.nome}" e as ${vendas.length} vendas dela? Isso não dá para desfazer.`
        : `Excluir "${feira.nome}"?`
    if (!confirm(aviso)) return
    await db.transaction('rw', db.feiras, db.vendasFeira, db.movimentos, async () => {
      await db.movimentos
        .where('vendaFeiraId')
        .anyOf(vendas.map((v) => v.id))
        .delete()
      await db.vendasFeira.where('feiraId').equals(feira.id).delete()
      await db.feiras.delete(feira.id)
    })
    aoVoltar()
  }

  return (
    <div className="space-y-4">
      <Cabecalho titulo={`${feira.nome} · ${formatarDataCurta(feira.data)}`} aoVoltar={aoVoltar} />

      <section className="rounded-2xl bg-rose-600 p-5 text-white shadow">
        <p className="text-sm opacity-90">Total vendido</p>
        <p className="text-3xl font-bold">{formatarReais(resumo.total)}</p>
        <p className="mt-1 text-sm opacity-90">
          {resumo.clientes === 1 ? '1 cliente' : `${resumo.clientes} clientes`} ·{' '}
          {resumo.pecas === 1 ? '1 peça' : `${resumo.pecas} peças`}
        </p>

        {resumo.total > 0 && (
          <dl className="mt-3 space-y-1 border-t border-white/30 pt-3 text-sm">
            {TODAS_FORMAS.filter((f) => resumo.porForma[f]).map((f) => (
              <div key={f} className="flex justify-between">
                <dt>{formasDePagamento[f]}</dt>
                <dd>{formatarReais(resumo.porForma[f] ?? 0)}</dd>
              </div>
            ))}
            {resumo.semForma > 0 && (
              <div className="flex justify-between">
                <dt>Sem forma informada</dt>
                <dd>{formatarReais(resumo.semForma)}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <button
        type="button"
        onClick={() => setEditando('nova')}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        <Plus size={20} /> Nova venda
      </button>

      {ordenadas.length === 0 && (
        <p className="text-gray-500">Nenhuma venda registrada nesta feira ainda.</p>
      )}

      <ul className="space-y-2">
        {ordenadas.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => setEditando(v)}
              className="w-full rounded-xl bg-white p-4 text-left shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800">
                  {rotuloDaVenda(v, nomeCadastrado(v))}
                </p>
                <span className="font-bold text-rose-600">
                  {formatarReais(totalDaVenda(v.itens))}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {v.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join(', ')}
              </p>
              {v.formaPagamento && (
                <p className="mt-1 text-xs text-gray-500">{formasDePagamento[v.formaPagamento]}</p>
              )}
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={excluirFeira} className="w-full p-2 text-sm text-red-600">
        Excluir esta feira
      </button>
    </div>
  )
}