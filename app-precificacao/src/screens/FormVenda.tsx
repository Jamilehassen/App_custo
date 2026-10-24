import { useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import {
  db,
  type Cliente,
  type Feira,
  type FormaPagamento,
  type ItemVenda,
  type Produto,
  type VendaFeira,
} from '../db'
import {
  formatarReais,
  formatarTelefone,
  numeroParaTexto,
  reaisParaCentavos,
} from '../lib/formato'
import { filtrar } from '../lib/busca'
import { formasDePagamento, TODAS_FORMAS } from '../lib/pedidos'
import { proximoNumeroDeCliente } from '../lib/feiras'
import { registrarVendaNoEstoque, removerEstoqueDaVenda } from '../lib/estoquePedidos'
import Cabecalho from '../components/Cabecalho'
import CampoBusca from '../components/CampoBusca'
import FolhaEscolha from '../components/FolhaEscolha'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'
const cartao = 'space-y-3 rounded-2xl bg-white p-4 shadow'
const chip = 'rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700'
const chipAtivo =
  'rounded-full border border-rose-600 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600'
const botaoPrincipal = 'w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white'
const botaoSecundario =
  'w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600'
const botaoCinza =
  'w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700'

// Uma linha da venda enquanto ela é montada (o preço fica como texto para digitar).
type Linha = {
  uid: number
  produtoId?: number
  descricao: string
  quantidade: number
  precoTexto: string
}

type Props = {
  feira: Feira
  inicial?: VendaFeira
  numeroNovo: number
  produtos: Produto[]
  clientes: Cliente[]
  precoDe: (produto: Produto) => number | null
  aoSalvar: (outraVenda: boolean) => void
  aoFechar: () => void
}

export default function FormVenda({
  feira,
  inicial,
  numeroNovo,
  produtos,
  clientes,
  precoDe,
  aoSalvar,
  aoFechar,
}: Props) {
  const proximoUid = useRef((inicial?.itens.length ?? 0) + 1)
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    (inicial?.itens ?? []).map((item, i) => ({
      uid: i + 1,
      produtoId: item.produtoId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      precoTexto: numeroParaTexto(item.precoUnitarioCentavos / 100),
    })),
  )
  const [clienteId, setClienteId] = useState<number | undefined>(inicial?.clienteId)
  const [escolhendoCliente, setEscolhendoCliente] = useState(false)
  const [nomeCliente, setNomeCliente] = useState(inicial?.nomeCliente ?? '')
  const [forma, setForma] = useState<FormaPagamento | undefined>(inicial?.formaPagamento)
  const [busca, setBusca] = useState('')
  const [avulso, setAvulso] = useState<{ descricao: string; preco: string } | null>(null)
  const [erro, setErro] = useState('')

  const cliente = clientes.find((c) => c.id === clienteId)
  const visiveis = filtrar(produtos, busca, (p) => [p.nome])
  const total = linhas.reduce(
    (soma, l) => soma + Math.round(l.quantidade * reaisParaCentavos(l.precoTexto)),
    0,
  )

  function adicionarProduto(produto: Produto) {
    const preco = precoDe(produto)
    const texto = preco !== null ? numeroParaTexto(preco / 100) : ''
    const uid = proximoUid.current++
    setLinhas((atual) => {
      // Tocar de novo no mesmo produto soma mais uma unidade.
      const existente = atual.find((l) => l.produtoId === produto.id && l.precoTexto === texto)
      if (existente) {
        return atual.map((l) =>
          l.uid === existente.uid ? { ...l, quantidade: l.quantidade + 1 } : l,
        )
      }
      return [
        ...atual,
        { uid, produtoId: produto.id, descricao: produto.nome, quantidade: 1, precoTexto: texto },
      ]
    })
  }

  function mudarQuantidade(uid: number, delta: number) {
    setLinhas((atual) =>
      atual
        .map((l) => (l.uid === uid ? { ...l, quantidade: l.quantidade + delta } : l))
        .filter((l) => l.quantidade > 0),
    )
  }

  function mudarPreco(uid: number, texto: string) {
    setLinhas((atual) => atual.map((l) => (l.uid === uid ? { ...l, precoTexto: texto } : l)))
  }

  function remover(uid: number) {
    setLinhas((atual) => atual.filter((l) => l.uid !== uid))
  }

  function adicionarAvulso() {
    if (!avulso) return
    const centavos = reaisParaCentavos(avulso.preco)
    if (!avulso.descricao.trim() || centavos <= 0) {
      setErro('Para o item avulso, preencha o nome e o preço.')
      return
    }
    const uid = proximoUid.current++
    setLinhas((atual) => [
      ...atual,
      {
        uid,
        descricao: avulso.descricao.trim(),
        quantidade: 1,
        precoTexto: numeroParaTexto(centavos / 100),
      },
    ])
    setAvulso(null)
    setErro('')
  }

  async function salvar(outraVenda: boolean) {
    if (linhas.length === 0) {
      setErro('Adicione pelo menos um item.')
      return
    }
    if (linhas.some((l) => reaisParaCentavos(l.precoTexto) <= 0)) {
      setErro('Confira o preço de todos os itens.')
      return
    }

    const itens: ItemVenda[] = linhas.map((l) => ({
      produtoId: l.produtoId,
      descricao: l.descricao,
      quantidade: l.quantidade,
      precoUnitarioCentavos: reaisParaCentavos(l.precoTexto),
    }))

    // Se escolheu alguém da agenda, o nome digitado não vale.
    const nomeDigitado = clienteId === undefined ? nomeCliente.trim() || undefined : undefined

    let vendaId: number
    if (inicial) {
      vendaId = inicial.id
      await db.vendasFeira.put({
        ...inicial,
        clienteId,
        nomeCliente: nomeDigitado,
        itens,
        formaPagamento: forma,
      })
    } else {
      // O número do cliente é conferido na hora de salvar, para nunca repetir.
      const existentes = await db.vendasFeira.where('feiraId').equals(feira.id).toArray()
      vendaId = await db.vendasFeira.add({
        feiraId: feira.id,
        numero: proximoNumeroDeCliente(existentes),
        clienteId,
        nomeCliente: nomeDigitado,
        itens,
        formaPagamento: forma,
        criadoEm: new Date().toISOString(),
      })
    }

    // Dá baixa nas peças vendidas (refaz a baixa se a venda foi editada).
    await registrarVendaNoEstoque(vendaId, itens)
    aoSalvar(outraVenda)
  }

  async function excluir() {
    if (inicial && confirm('Excluir esta venda?')) {
      await removerEstoqueDaVenda(inicial.id)
      await db.vendasFeira.delete(inicial.id)
      aoSalvar(false)
    }
  }

  return (
    <div className="space-y-4">
      <Cabecalho
        titulo={`${inicial ? 'Editar venda' : 'Nova venda'} · Cliente ${inicial?.numero ?? numeroNovo}`}
        aoVoltar={aoFechar}
      />

      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Cliente</h3>

        {cliente ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 p-3">
            <span>
              <span className="block font-semibold text-gray-800">{cliente.nome}</span>
              {cliente.whatsapp && (
                <span className="block text-sm text-gray-600">
                  {formatarTelefone(cliente.whatsapp)}
                </span>
              )}
            </span>
            <span className="flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => setEscolhendoCliente(true)}
                className="font-semibold text-rose-600"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={() => setClienteId(undefined)}
                className="text-gray-500"
              >
                Tirar
              </button>
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEscolhendoCliente(true)}
              className={botaoSecundario}
            >
              Escolher cliente cadastrado
            </button>
            <label className="block text-sm text-gray-600">
              Ou só um nome (opcional)
              <input
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Só se a pessoa disser"
                className={campo}
              />
            </label>
          </>
        )}
      </section>

      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Produtos</h3>
        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar produto..." />

        {produtos.length === 0 && (
          <p className="text-sm text-gray-500">Você ainda não cadastrou nenhum produto.</p>
        )}

        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {visiveis.map((p) => {
            const preco = precoDe(p)
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-rose-50 p-3">
                <span className="flex-1">
                  <span className="block font-semibold text-gray-800">{p.nome}</span>
                  <span className="block text-sm text-rose-600">
                    {preco !== null ? formatarReais(preco) : 'sem preço calculado'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => adicionarProduto(p)}
                  aria-label={`Adicionar ${p.nome}`}
                  className="rounded-full bg-rose-600 p-2 text-white"
                >
                  <Plus size={20} />
                </button>
              </li>
            )
          })}
        </ul>

        {avulso ? (
          <div className="space-y-3 rounded-xl border border-rose-200 p-3">
            <label className="block text-sm text-gray-600">
              O que vendeu?
              <input
                value={avulso.descricao}
                onChange={(e) => setAvulso({ ...avulso, descricao: e.target.value })}
                placeholder="Ex.: Chaveiro"
                className={campo}
              />
            </label>
            <label className="block text-sm text-gray-600">
              Preço (R$)
              <input
                value={avulso.preco}
                onChange={(e) => setAvulso({ ...avulso, preco: e.target.value })}
                inputMode="decimal"
                placeholder="0,00"
                className={campo}
              />
            </label>
            <button type="button" onClick={adicionarAvulso} className={botaoPrincipal}>
              Adicionar item avulso
            </button>
            <button type="button" onClick={() => setAvulso(null)} className={botaoCinza}>
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAvulso({ descricao: '', preco: '' })}
            className={botaoSecundario}
          >
            Item avulso (que não está na lista)
          </button>
        )}
      </section>

      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Itens da venda</h3>

        {linhas.length === 0 && (
          <p className="text-sm text-gray-500">Toque no + de um produto para começar.</p>
        )}

        <ul className="space-y-2">
          {linhas.map((l) => (
            <li key={l.uid} className="space-y-2 rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800">{l.descricao}</p>
                <button
                  type="button"
                  onClick={() => remover(l.uid)}
                  aria-label="Remover item"
                  className="text-gray-400"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mudarQuantidade(l.uid, -1)}
                    aria-label="Menos um"
                    className="rounded-full border border-gray-300 p-1.5 text-gray-700"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-semibold">{l.quantidade}</span>
                  <button
                    type="button"
                    onClick={() => mudarQuantidade(l.uid, 1)}
                    aria-label="Mais um"
                    className="rounded-full border border-gray-300 p-1.5 text-gray-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <label className="flex flex-1 items-center gap-1 text-sm text-gray-600">
                  × R$
                  <input
                    value={l.precoTexto}
                    onChange={(e) => mudarPreco(l.uid, e.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-lg border border-gray-300 p-2 text-base"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600">Total da venda</span>
          <span className="text-2xl font-bold text-rose-600">{formatarReais(total)}</span>
        </div>
      </section>

      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Forma de pagamento</h3>
        <div className="flex flex-wrap gap-2">
          {TODAS_FORMAS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setForma(forma === f ? undefined : f)}
              className={forma === f ? chipAtivo : chip}
            >
              {formasDePagamento[f]}
            </button>
          ))}
        </div>
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {inicial ? (
        <>
          <button type="button" onClick={() => salvar(false)} className={botaoPrincipal}>
            Salvar alterações
          </button>
          <button type="button" onClick={aoFechar} className={botaoCinza}>
            Cancelar
          </button>
          <button type="button" onClick={excluir} className="w-full p-2 text-sm text-red-600">
            Excluir venda
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => salvar(false)} className={botaoPrincipal}>
            Registrar venda
          </button>
          <button type="button" onClick={() => salvar(true)} className={botaoSecundario}>
            Registrar e fazer outra venda
          </button>
          <button type="button" onClick={aoFechar} className={botaoCinza}>
            Cancelar
          </button>
        </>
      )}

      {escolhendoCliente && (
        <FolhaEscolha
          titulo="Escolher cliente"
          itens={clientes}
          chave={(c) => c.id}
          campos={(c) => [c.nome, c.whatsapp ?? '']}
          renderizar={(c) => (
            <span className="block">
              <span className="block font-semibold text-gray-800">{c.nome}</span>
              {c.whatsapp && (
                <span className="block text-xs text-gray-500">{formatarTelefone(c.whatsapp)}</span>
              )}
            </span>
          )}
          aoEscolher={(c) => {
            setClienteId(c.id)
            setEscolhendoCliente(false)
          }}
          aoFechar={() => setEscolhendoCliente(false)}
          vazio="Você ainda não cadastrou nenhum cliente. Cadastre na aba Clientes."
        />
      )}
    </div>
  )
}