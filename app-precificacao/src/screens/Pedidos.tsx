import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db, type Pedido, type Produto, type StatusPedido } from '../db'
import { calcularProduto, criarMapa } from '../lib/produtos'
import { useCustoHora } from '../lib/useCustoHora'
import { useEstoque } from '../lib/useEstoque'
import { formatarDataCurta, hojeISO } from '../lib/datas'
import { formatarReais } from '../lib/formato'
import { filtrar } from '../lib/busca'
import type { EstadoCalendario } from '../lib/calendario'
import {
  aplicarMudancaDeStatus,
  disponivelDoProduto,
  reservadoPorPedidosProntos,
} from '../lib/estoquePedidos'
import {
  ABERTOS,
  prazoAoAprovar,
  resumoDosItens,
  restanteAPagar,
  statusInfo,
} from '../lib/pedidos'
import AProduzir from '../components/AProduzir'
import Calendario from '../components/Calendario'
import CampoBusca from '../components/CampoBusca'
import CartaoPedido from '../components/CartaoPedido'
import ConfirmarPronto from '../components/ConfirmarPronto'
import EnviarOrcamento from '../components/EnviarOrcamento'
import EditarPedido from './EditarPedido'

type Visao = 'lista' | 'calendario' | 'produzir'
type Filtro = 'orcamentos' | 'abertos' | 'entregues' | 'cancelados' | 'todos'

const visoes: { id: Visao; rotulo: string }[] = [
  { id: 'lista', rotulo: 'Lista' },
  { id: 'calendario', rotulo: 'Calendário' },
  { id: 'produzir', rotulo: 'A produzir' },
]

const filtros: { id: Filtro; rotulo: string }[] = [
  { id: 'orcamentos', rotulo: 'Orçamentos' },
  { id: 'abertos', rotulo: 'Em aberto' },
  { id: 'entregues', rotulo: 'Entregues' },
  { id: 'cancelados', rotulo: 'Cancelados' },
  { id: 'todos', rotulo: 'Todos' },
]

function calendarioDeHoje(): EstadoCalendario {
  const agora = new Date()
  return { ano: agora.getFullYear(), mes: agora.getMonth(), selecionado: hojeISO() }
}

export default function Pedidos() {
  const pedidos = useLiveQuery(() => db.pedidos.toArray())
  const clientes = useLiveQuery(() => db.clientes.toArray())
  const produtos = useLiveQuery(() => db.produtos.toArray())
  const materiais = useLiveQuery(() => db.materiais.toArray())
  const loja = useLiveQuery(() => db.loja.get(1))
  const estoque = useEstoque()
  const { valorHora } = useCustoHora()
  const [editando, setEditando] = useState<Pedido | 'novo' | null>(null)
  const [enviando, setEnviando] = useState<Pedido | null>(null)
  const [confirmandoPronto, setConfirmandoPronto] = useState<Pedido | null>(null)
  const [visao, setVisao] = useState<Visao>('lista')
  const [filtro, setFiltro] = useState<Filtro>('orcamentos')
  const [busca, setBusca] = useState('')
  // O calendário fica aqui para lembrar o dia escolhido depois de abrir um pedido.
  const [calendario, setCalendario] = useState<EstadoCalendario>(calendarioDeHoje)

  if (!pedidos || !clientes || !produtos || !materiais) return null

  const mapaMateriais = criarMapa(materiais)
  const reservado = reservadoPorPedidosProntos(pedidos)

  // Preço atual de um produto (usado como sugestão ao montar o orçamento).
  function precoDe(produto: Produto): number | null {
    if (valorHora === null) return null
    try {
      return calcularProduto(produto, mapaMateriais, valorHora).total
    } catch {
      return null
    }
  }

  // Peças prontas que ainda estão livres (sem dono).
  const disponivelDe = (produtoId: number) =>
    disponivelDoProduto(estoque?.saldoDe('produto', produtoId), reservado.get(produtoId))

  // Todo pedido começa como orçamento.
  function novoOrcamento() {
    setFiltro('orcamentos')
    setVisao('lista')
    setEditando('novo')
  }

  // Único caminho para mudar a situação de um pedido já aprovado: acerta o estoque junto.
  async function mudarStatus(p: Pedido, novo: StatusPedido) {
    const falta = restanteAPagar(p)
    if (
      novo === 'entregue' &&
      falta > 0 &&
      !confirm(`Ainda falta receber ${formatarReais(falta)}. Marcar como entregue mesmo assim?`)
    ) {
      return
    }

    const temProduto = p.itens.some(
      (i) =>
        i.tipo === 'produto' &&
        i.produtoId !== undefined &&
        produtos!.some((pr) => pr.id === i.produtoId),
    )
    if (novo === 'pronto' && (p.status === 'novo' || p.status === 'producao') && temProduto) {
      setConfirmandoPronto(p) // pergunta quanto foi produzido agora
      return
    }

    await aplicarMudancaDeStatus(p, novo)
  }

  async function avancar(p: Pedido) {
    // Aprovar um orçamento: vira pedido novo, com a entrega contada a partir de hoje.
    if (p.status === 'orcamento') {
      const prazo = prazoAoAprovar(p)
      if (
        !confirm(
          `Aprovar este orçamento? Ele vira um pedido novo, com entrega em ${formatarDataCurta(prazo)}.`,
        )
      ) {
        return
      }
      await db.pedidos.update(p.id, { status: 'novo', prazoEntrega: prazo })
      setVisao('lista')
      setFiltro('abertos') // para ela ver o pedido que acabou de nascer
      return
    }

    const proximo = statusInfo[p.status].proximo
    if (proximo) await mudarStatus(p, proximo)
  }

  if (editando) {
    return (
      <EditarPedido
        inicial={editando === 'novo' ? undefined : editando}
        clientes={clientes}
        produtos={produtos}
        precoDe={precoDe}
        aoMudarStatus={mudarStatus}
        aoFechar={() => setEditando(null)}
      />
    )
  }

  const nomeDoCliente = (p: Pedido) =>
    clientes.find((c) => c.id === p.clienteId)?.nome ?? p.clienteAvulso ?? 'Sem cliente'

  const abertos = pedidos.filter((p) => ABERTOS.includes(p.status))
  const aReceber = abertos.reduce((soma, p) => soma + restanteAPagar(p), 0)
  const qtdOrcamentos = pedidos.filter((p) => p.status === 'orcamento').length

  const daLista = pedidos
    .filter((p) => {
      if (filtro === 'todos') return true
      if (filtro === 'abertos') return ABERTOS.includes(p.status)
      if (filtro === 'orcamentos') return p.status === 'orcamento'
      return p.status === (filtro === 'entregues' ? 'entregue' : 'cancelado')
    })
    // Em aberto: quem entrega primeiro vem primeiro. Orçamentos: os mais novos primeiro.
    .sort((a, b) => {
      if (filtro === 'abertos') return a.prazoEntrega.localeCompare(b.prazoEntrega)
      if (filtro === 'orcamentos') return b.criadoEm.localeCompare(a.criadoEm)
      return b.prazoEntrega.localeCompare(a.prazoEntrega)
    })

  const visiveis = filtrar(daLista, busca, (p) => [
    nomeDoCliente(p),
    resumoDosItens(p.itens),
    p.observacoes ?? '',
  ])

  return (
    <div className="space-y-4">
      <button
        onClick={novoOrcamento}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        <Plus size={20} /> Novo orçamento
      </button>

      <div className="flex rounded-lg bg-white p-1 shadow">
        {visoes.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVisao(v.id)}
            className={`flex-1 rounded-md p-2 text-sm font-semibold ${
              visao === v.id ? 'bg-rose-600 text-white' : 'text-gray-600'
            }`}
          >
            {v.rotulo}
          </button>
        ))}
      </div>

      {visao === 'calendario' && (
        <Calendario
          // Orçamentos e cancelados ainda não são entregas.
          pedidos={pedidos.filter((p) => p.status !== 'cancelado' && p.status !== 'orcamento')}
          estado={calendario}
          aoMudar={setCalendario}
          nomeDoCliente={nomeDoCliente}
          aoAbrir={(p) => setEditando(p)}
          aoAvancar={avancar}
        />
      )}

      {visao === 'produzir' && (
        <AProduzir pedidos={pedidos} produtos={produtos} materiais={materiais} />
      )}

      {visao === 'lista' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                  filtro === f.id
                    ? 'border-rose-600 bg-rose-50 font-semibold text-rose-600'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                {f.id === 'orcamentos' && qtdOrcamentos > 0
                  ? `${f.rotulo} (${qtdOrcamentos})`
                  : f.rotulo}
              </button>
            ))}
          </div>

          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar por cliente ou item..."
          />

          {abertos.length > 0 && (
            <p className="text-sm text-gray-600">
              {abertos.length === 1 ? '1 pedido em aberto' : `${abertos.length} pedidos em aberto`}
              {aReceber > 0 && ` · a receber ${formatarReais(aReceber)}`}
            </p>
          )}

          {pedidos.length === 0 && (
            <p className="text-gray-500">
              Nada por aqui ainda. Comece criando um orçamento: quando a cliente aprovar, ele vira
              um pedido.
            </p>
          )}
          {pedidos.length > 0 && visiveis.length === 0 && (
            <p className="text-gray-500">Nada encontrado.</p>
          )}

          <ul className="space-y-3">
            {visiveis.map((p) => (
              <li key={p.id}>
                <CartaoPedido
                  pedido={p}
                  nomeCliente={nomeDoCliente(p)}
                  aoAbrir={() => setEditando(p)}
                  aoAvancar={() => avancar(p)}
                  aoEnviar={() => setEnviando(p)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {enviando && (
        <EnviarOrcamento
          pedido={enviando}
          nomeCliente={nomeDoCliente(enviando)}
          loja={loja}
          aoFechar={() => setEnviando(null)}
        />
      )}

      {confirmandoPronto && (
        <ConfirmarPronto
          pedido={confirmandoPronto}
          produtos={produtos}
          materiais={materiais}
          disponivelDe={disponivelDe}
          saldoDeMaterial={(id) => estoque?.saldoDe('material', id)}
          aoConfirmar={async (producao) => {
            await aplicarMudancaDeStatus(confirmandoPronto, 'pronto', producao)
            setConfirmandoPronto(null)
          }}
          aoSemEstoque={async () => {
            await aplicarMudancaDeStatus(confirmandoPronto, 'pronto')
            setConfirmandoPronto(null)
          }}
          aoFechar={() => setConfirmandoPronto(null)}
        />
      )}
    </div>
  )
}