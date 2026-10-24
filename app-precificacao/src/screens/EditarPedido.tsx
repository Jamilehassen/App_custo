import { useState, type ChangeEvent } from 'react'
import { Plus, X } from 'lucide-react'
import {
  db,
  type Cliente,
  type FormaPagamento,
  type ItemPedido,
  type Pedido,
  type Produto,
  type StatusPedido,
} from '../db'
import { formatarDataCurta, hojeISO, situacaoDoPrazo, somarDias } from '../lib/datas'
import { descartarEntregaDoPedido } from '../lib/estoquePedidos'
import {
  formatarReais,
  numeroParaTexto,
  paraNumero,
  reaisParaCentavos,
} from '../lib/formato'
import { prepararFoto } from '../lib/imagem'
import {
  formasDePagamento,
  restanteAPagar,
  statusInfo,
  TODAS_FORMAS,
  TODOS_STATUS,
  totalDoPedido,
} from '../lib/pedidos'
import Cabecalho from '../components/Cabecalho'
import ClienteDoOrcamento from '../components/ClienteDoOrcamento'
import FolhaEscolha from '../components/FolhaEscolha'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'
const cartao = 'space-y-3 rounded-2xl bg-white p-4 shadow'
const botaoPrincipal = 'w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white'
const botaoSecundario =
  'w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600'
const botaoCinza =
  'w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700'
const chip = 'rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700'
const chipAtivo =
  'rounded-full border border-rose-600 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600'

type NovoItem = { tipo: 'produto' | 'encomenda'; produto?: Produto }

type Props = {
  inicial?: Pedido
  clientes: Cliente[]
  produtos: Produto[]
  precoDe: (produto: Produto) => number | null
  // Mudar a situação de um pedido aprovado passa pelo estoque (veja Pedidos.tsx).
  aoMudarStatus: (pedido: Pedido, novo: StatusPedido) => void | Promise<void>
  aoFechar: () => void
}

export default function EditarPedido({
  inicial,
  clientes,
  produtos,
  precoDe,
  aoMudarStatus,
  aoFechar,
}: Props) {
  const [clienteId, setClienteId] = useState<number | undefined>(inicial?.clienteId)
  const [itens, setItens] = useState<ItemPedido[]>(inicial?.itens ?? [])
  const [prazo, setPrazo] = useState(inicial?.prazoEntrega ?? somarDias(hojeISO(), 7))
  const [prazoDiasTexto, setPrazoDiasTexto] = useState(String(inicial?.prazoDias ?? 7))
  const [validade, setValidade] = useState(
    inicial?.validadeOrcamento ?? somarDias(hojeISO(), 7),
  )
  const [status, setStatus] = useState<StatusPedido>(inicial?.status ?? 'orcamento')
  const [pago, setPago] = useState(
    inicial?.pagoCentavos ? numeroParaTexto(inicial.pagoCentavos / 100) : '',
  )
  const [forma, setForma] = useState<FormaPagamento | undefined>(inicial?.formaPagamento)
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [escolhendoCliente, setEscolhendoCliente] = useState(false)
  const [escolhendoProduto, setEscolhendoProduto] = useState(false)
  const [novoItem, setNovoItem] = useState<NovoItem | null>(null)
  const [erro, setErro] = useState('')

  const ehOrcamento = status === 'orcamento'
  const cliente = clientes.find((c) => c.id === clienteId)
  const total = totalDoPedido(itens)
  const pagoCentavos = reaisParaCentavos(pago)
  const falta = restanteAPagar({ itens, pagoCentavos })
  const situacao = prazo ? situacaoDoPrazo(prazo) : null
  const prazoDias = Math.max(0, Math.floor(paraNumero(prazoDiasTexto)))

  // Um orçamento só vira pedido ao ser aprovado (botão "Aprovar orçamento" na lista).
  const statusPermitidos: StatusPedido[] =
    !inicial || inicial.status === 'orcamento'
      ? ['orcamento', 'cancelado']
      : TODOS_STATUS.filter((s) => s !== 'orcamento')

  function escolherStatus(novo: StatusPedido) {
    // Ao aprovar pelo formulário, a entrega passa a contar a partir de hoje.
    if (status === 'orcamento' && novo !== 'orcamento') {
      setPrazo(somarDias(hojeISO(), prazoDias))
    }
    setStatus(novo)
  }

  async function salvar() {
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item.')
      return
    }
    if (ehOrcamento) {
      if (!cliente) {
        setErro('Escolha ou cadastre o cliente: o orçamento precisa do nome e do WhatsApp dele.')
        return
      }
      if (!cliente.whatsapp) {
        setErro('Este cliente está sem WhatsApp. Preencha o número no quadro do cliente.')
        return
      }
      if (!validade) {
        setErro('Escolha até quando o orçamento vale.')
        return
      }
    } else {
      if (!prazo) {
        setErro('Escolha a data de entrega.')
        return
      }
      if (pagoCentavos > total) {
        setErro('O valor pago não pode ser maior que o total do pedido.')
        return
      }
    }

    // Em pedidos já aprovados, a mudança de situação é feita à parte, acertando o estoque.
    const mudouSituacao =
      inicial !== undefined &&
      inicial.status !== 'orcamento' &&
      !ehOrcamento &&
      status !== inicial.status

    const dados = {
      clienteId,
      // Pedidos antigos podem ter só um nome anotado; os novos sempre têm cliente cadastrado.
      clienteAvulso: clienteId === undefined ? inicial?.clienteAvulso : undefined,
      itens,
      prazoEntrega: ehOrcamento ? somarDias(hojeISO(), prazoDias) : prazo,
      status: mudouSituacao && inicial ? inicial.status : status,
      pagoCentavos: ehOrcamento ? 0 : pagoCentavos,
      formaPagamento: ehOrcamento ? undefined : forma,
      observacoes: observacoes.trim() || undefined,
      validadeOrcamento: ehOrcamento ? validade : undefined,
      prazoDias: ehOrcamento ? prazoDias : undefined,
    }

    if (inicial) {
      const salvo = { ...inicial, ...dados }
      await db.pedidos.put(salvo)
      if (mudouSituacao) await aoMudarStatus(salvo, status)
    } else {
      await db.pedidos.add({ ...dados, criadoEm: new Date().toISOString() })
    }
    aoFechar()
  }

  async function excluir() {
    if (inicial && confirm(`Excluir este ${ehOrcamento ? 'orçamento' : 'pedido'}?`)) {
      await descartarEntregaDoPedido(inicial.id)
      await db.pedidos.delete(inicial.id)
      aoFechar()
    }
  }

  return (
    <div className="space-y-4">
      <Cabecalho
        titulo={`${inicial ? 'Editar' : 'Novo'} ${ehOrcamento ? 'orçamento' : 'pedido'}`}
        aoVoltar={aoFechar}
      />

      <ClienteDoOrcamento
        cliente={cliente}
        nomeAnterior={inicial?.clienteAvulso}
        obrigatorio={ehOrcamento}
        aoEscolherCadastrado={() => setEscolhendoCliente(true)}
        aoEscolherNovo={setClienteId}
        aoTirarCliente={() => setClienteId(undefined)}
      />

      {/* Itens */}
      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Itens</h3>

        <ul className="space-y-2">
          {itens.map((item, indice) => (
            <li
              key={indice}
              className="flex items-start gap-3 rounded-xl bg-rose-50 p-3 text-sm"
            >
              {item.foto && (
                <img
                  src={item.foto}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              )}
              <span className="flex-1">
                <span className="block font-semibold text-gray-800">{item.descricao}</span>
                <span className="block text-gray-600">
                  {item.quantidade} × {formatarReais(item.precoUnitarioCentavos)}
                  {item.tipo === 'encomenda' && ' · encomenda'}
                </span>
              </span>
              <span className="font-semibold text-rose-600">
                {formatarReais(Math.round(item.quantidade * item.precoUnitarioCentavos))}
              </span>
              <button
                type="button"
                onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}
                aria-label="Remover item"
                className="text-gray-400"
              >
                <X size={18} />
              </button>
            </li>
          ))}
        </ul>

        {novoItem ? (
          <FormItemPedido
            key={novoItem.produto?.id ?? 'encomenda'}
            novo={novoItem}
            precoSugerido={novoItem.produto ? precoDe(novoItem.produto) : null}
            aoAdicionar={(item) => {
              setItens((atual) => [...atual, item])
              setNovoItem(null)
            }}
            aoCancelar={() => setNovoItem(null)}
          />
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setEscolhendoProduto(true)}
              className={`${botaoSecundario} flex items-center justify-center gap-2`}
            >
              <Plus size={20} /> Adicionar produto
            </button>
            <button
              type="button"
              onClick={() => setNovoItem({ tipo: 'encomenda' })}
              className={`${botaoSecundario} flex items-center justify-center gap-2`}
            >
              <Plus size={20} /> Encomenda personalizada
            </button>
          </div>
        )}
      </section>

      {/* Orçamento: prazo em dias e validade. Pedido: data de entrega. */}
      {ehOrcamento ? (
        <section className={cartao}>
          <h3 className="font-semibold text-gray-800">Prazo e validade</h3>

          <div>
            <p className="mb-2 text-sm text-gray-600">
              Entrega depois que a cliente aprovar:
            </p>
            <div className="flex flex-wrap gap-2">
              {[3, 7, 15, 30].map((dias) => (
                <button
                  key={dias}
                  type="button"
                  onClick={() => setPrazoDiasTexto(String(dias))}
                  className={prazoDias === dias ? chipAtivo : chip}
                >
                  {dias} dias
                </button>
              ))}
            </div>
            <label className="mt-2 block text-sm text-gray-600">
              Ou digite os dias
              <input
                value={prazoDiasTexto}
                onChange={(e) => setPrazoDiasTexto(e.target.value)}
                inputMode="numeric"
                className={campo}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-600">O orçamento vale até:</p>
            <div className="flex flex-wrap gap-2">
              {[3, 7, 15, 30].map((dias) => {
                const alvo = somarDias(hojeISO(), dias)
                return (
                  <button
                    key={dias}
                    type="button"
                    onClick={() => setValidade(alvo)}
                    className={validade === alvo ? chipAtivo : chip}
                  >
                    +{dias} dias
                  </button>
                )
              })}
            </div>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className={campo}
            />
            {validade && (
              <p className="mt-1 text-sm text-gray-700">
                Vale até <strong>{formatarDataCurta(validade)}</strong>
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className={cartao}>
          <h3 className="font-semibold text-gray-800">Entrega</h3>
          <div className="flex flex-wrap gap-2">
            {[3, 7, 15, 30].map((dias) => {
              const alvo = somarDias(hojeISO(), dias)
              return (
                <button
                  key={dias}
                  type="button"
                  onClick={() => setPrazo(alvo)}
                  className={prazo === alvo ? chipAtivo : chip}
                >
                  +{dias} dias
                </button>
              )
            })}
          </div>
          <label className="block text-sm text-gray-600">
            Data de entrega
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className={campo}
            />
          </label>
          {prazo && situacao && (
            <p className="text-sm text-gray-700">
              Entrega: <strong>{formatarDataCurta(prazo)}</strong>{' '}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${situacao.classes}`}
              >
                {situacao.texto}
              </span>
            </p>
          )}
        </section>
      )}

      {/* Situação */}
      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Situação</h3>
        <div className="flex flex-wrap gap-2">
          {statusPermitidos.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => escolherStatus(s)}
              className={status === s ? chipAtivo : chip}
            >
              {statusInfo[s].rotulo}
            </button>
          ))}
        </div>
      </section>

      {/* Pagamento (só nos pedidos aprovados) */}
      {!ehOrcamento && (
        <section className={cartao}>
          <h3 className="font-semibold text-gray-800">Pagamento</h3>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-600">Total do pedido</span>
            <span className="text-2xl font-bold text-rose-600">{formatarReais(total)}</span>
          </div>
          <label className="block text-sm text-gray-600">
            Valor já pago (R$)
            <input
              value={pago}
              onChange={(e) => setPago(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className={campo}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPago('')} className={chip}>
              Nada pago
            </button>
            <button
              type="button"
              onClick={() => setPago(numeroParaTexto(Math.round(total / 2) / 100))}
              className={chip}
            >
              Sinal de 50%
            </button>
            <button
              type="button"
              onClick={() => setPago(numeroParaTexto(total / 100))}
              className={chip}
            >
              Pago total
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-600">Forma de pagamento</p>
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
          </div>

          <p
            className={`text-sm font-semibold ${falta > 0 ? 'text-amber-700' : 'text-green-700'}`}
          >
            {total === 0
              ? 'Adicione itens para calcular.'
              : falta > 0
                ? `Falta receber ${formatarReais(falta)}`
                : 'Tudo pago!'}
          </p>
        </section>
      )}

      {ehOrcamento && (
        <section className={cartao}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-600">Total do orçamento</span>
            <span className="text-2xl font-bold text-rose-600">{formatarReais(total)}</span>
          </div>
        </section>
      )}

      <section className={cartao}>
        <label className="block text-sm text-gray-600">
          Observações (opcional)
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Ex.: entregar na escola, embrulhar para presente"
            className={campo}
          />
        </label>
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button type="button" onClick={salvar} className={botaoPrincipal}>
        {ehOrcamento ? 'Salvar orçamento' : 'Salvar pedido'}
      </button>
      <button type="button" onClick={aoFechar} className={botaoCinza}>
        Cancelar
      </button>
      {inicial && (
        <button type="button" onClick={excluir} className="w-full p-2 text-sm text-red-600">
          {ehOrcamento ? 'Excluir orçamento' : 'Excluir pedido'}
        </button>
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
              {!c.whatsapp && (
                <span className="block text-xs text-amber-700">sem WhatsApp</span>
              )}
            </span>
          )}
          aoEscolher={(c) => {
            setClienteId(c.id)
            setEscolhendoCliente(false)
          }}
          aoFechar={() => setEscolhendoCliente(false)}
          vazio="Você ainda não cadastrou nenhum cliente."
          // Só pedidos antigos, sem orçamento, podem ficar sem cliente.
          topo={
            ehOrcamento ? undefined : (
              <button
                type="button"
                onClick={() => {
                  setClienteId(undefined)
                  setEscolhendoCliente(false)
                }}
                className="w-full rounded-xl p-3 text-left text-gray-600 active:bg-rose-50"
              >
                Sem cliente
              </button>
            )
          }
        />
      )}

      {escolhendoProduto && (
        <FolhaEscolha
          titulo="Escolher produto"
          itens={produtos}
          chave={(p) => p.id}
          campos={(p) => [p.nome]}
          renderizar={(p) => {
            const preco = precoDe(p)
            return (
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-800">{p.nome}</span>
                <span className="text-rose-600">{preco !== null ? formatarReais(preco) : '—'}</span>
              </span>
            )
          }}
          aoEscolher={(p) => {
            setNovoItem({ tipo: 'produto', produto: p })
            setEscolhendoProduto(false)
          }}
          aoFechar={() => setEscolhendoProduto(false)}
          vazio="Você ainda não cadastrou nenhum produto."
        />
      )}
    </div>
  )
}

// Formulário para adicionar um item (produto cadastrado ou encomenda).
function FormItemPedido({
  novo,
  precoSugerido,
  aoAdicionar,
  aoCancelar,
}: {
  novo: NovoItem
  precoSugerido: number | null
  aoAdicionar: (item: ItemPedido) => void
  aoCancelar: () => void
}) {
  const ehEncomenda = novo.tipo === 'encomenda'
  const [descricao, setDescricao] = useState(novo.produto?.nome ?? '')
  const [quantidade, setQuantidade] = useState('1')
  const [preco, setPreco] = useState(
    precoSugerido !== null ? numeroParaTexto(precoSugerido / 100) : '',
  )
  const [foto, setFoto] = useState<string | undefined>()
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const entrada = e.target
    const arquivo = entrada.files?.[0]
    if (!arquivo) return
    setProcessando(true)
    setErro('')
    try {
      setFoto(await prepararFoto(arquivo, 600))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível usar essa foto.')
    } finally {
      setProcessando(false)
      entrada.value = ''
    }
  }

  function confirmar() {
    const q = Math.floor(paraNumero(quantidade))
    const centavos = reaisParaCentavos(preco)
    if (!descricao.trim()) {
      setErro('Descreva o que a cliente quer.')
      return
    }
    if (q < 1) {
      setErro('A quantidade precisa ser 1 ou mais.')
      return
    }
    if (centavos <= 0) {
      setErro('Informe o preço de cada unidade.')
      return
    }
    aoAdicionar({
      tipo: novo.tipo,
      produtoId: novo.produto?.id,
      descricao: descricao.trim(),
      quantidade: q,
      precoUnitarioCentavos: centavos,
      foto,
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 p-3">
      <p className="font-semibold text-gray-800">
        {ehEncomenda ? 'Encomenda personalizada' : novo.produto?.nome}
      </p>

      {ehEncomenda && (
        <>
          <label className="block text-sm text-gray-600">
            O que a cliente quer?
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Ex.: Bolsa azul com o nome Ana bordado"
              className={campo}
            />
          </label>

          {foto && (
            <img
              src={foto}
              alt="Foto de referência"
              className="aspect-square w-32 rounded-xl object-cover"
            />
          )}
          <label className="block w-full cursor-pointer rounded-lg border border-gray-300 p-3 text-center text-sm font-semibold text-gray-700">
            <input type="file" accept="image/*" onChange={escolherFoto} className="hidden" />
            {processando
              ? 'Preparando a foto...'
              : foto
                ? 'Trocar foto de referência'
                : 'Foto de referência (opcional)'}
          </label>
        </>
      )}

      <div className="flex gap-3">
        <label className="block w-24 text-sm text-gray-600">
          Qtd.
          <input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            inputMode="numeric"
            className={campo}
          />
        </label>
        <label className="block flex-1 text-sm text-gray-600">
          Preço de cada (R$)
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={campo}
          />
        </label>
      </div>

      {!ehEncomenda && (
        <p className="text-xs text-gray-500">
          O preço sugerido vem do cálculo do produto. Você pode combinar outro valor.
        </p>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="button"
        onClick={confirmar}
        disabled={processando}
        className={`${botaoPrincipal} disabled:opacity-40`}
      >
        Adicionar ao pedido
      </button>
      <button type="button" onClick={aoCancelar} className={botaoCinza}>
        Cancelar
      </button>
    </div>
  )
}