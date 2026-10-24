import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  DollarSign,
  Plus,
  Shapes,
  X,
  type LucideIcon,
} from 'lucide-react'
import { db, type ItemFicha, type Material, type Produto } from '../db'
import { calcularProduto, criarMapa, type ResumoProduto } from '../lib/produtos'
import {
  formatarPercentual,
  formatarReais,
  numeroParaTexto,
  paraNumero,
  reaisParaCentavos,
} from '../lib/formato'
import EscolherMaterial from '../components/EscolherMaterial'
import IconeMaterial from '../components/IconeMaterial'

type Tela = 'principal' | 'materiais' | 'trabalho' | 'lucro' | 'preco'

type Props = {
  inicial?: Produto
  materiais: Material[]
  valorHora: number | null
  aoFechar: () => void
}

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'
const botaoPrincipal =
  'w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white'
const botaoSecundario =
  'w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600'
const botaoCinza =
  'w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700'

function formatarHoras(minutos: number) {
  const total = Math.round(minutos)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}h`
}

function detalheItem(item: ItemFicha, material?: Material) {
  if (!material) return ''
  return item.larguraCm && item.alturaCm
    ? `${item.larguraCm} × ${item.alturaCm} cm`
    : `${item.quantidade} ${material.unidade}`
}

function Cabecalho({ titulo, aoVoltar }: { titulo: string; aoVoltar: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={aoVoltar}
        aria-label="Voltar"
        className="p-2 text-gray-600"
      >
        <ArrowLeft size={24} />
      </button>
      <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
    </div>
  )
}

function Linha({
  rotulo,
  meio,
  valor,
  recuo = 0,
  forte = false,
}: {
  rotulo: string
  meio?: string
  valor: string
  recuo?: 0 | 1 | 2
  forte?: boolean
}) {
  const espaco = ['', 'pl-4', 'pl-8'][recuo]
  return (
    <div className={`flex justify-between gap-3 ${espaco} ${forte ? 'font-semibold' : ''}`}>
      <span>{rotulo}</span>
      <span className="flex gap-3">
        {meio && <span>{meio}</span>}
        <span className="text-rose-600">{valor}</span>
      </span>
    </div>
  )
}

function CartaoResumo({
  icone: Icone,
  titulo,
  aoAbrir,
  children,
}: {
  icone: LucideIcon
  titulo: string
  aoAbrir: () => void
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={aoAbrir}
        className="flex w-full items-center justify-between text-rose-600"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Icone size={22} /> {titulo}
        </span>
        <ArrowRight size={22} />
      </button>
      <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-800">
        {children}
      </div>
    </section>
  )
}

export default function EditarProduto({ inicial, materiais, valorHora, aoFechar }: Props) {
  const [tela, setTela] = useState<Tela>('principal')
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [itens, setItens] = useState<ItemFicha[]>(inicial?.materiais ?? [])
  const [horas, setHoras] = useState(
    inicial ? String(Math.floor(inicial.minutosProducao / 60)) : '',
  )
  const [minutos, setMinutos] = useState(
    inicial ? String(Math.round(inicial.minutosProducao % 60)) : '',
  )
  const [lucro, setLucro] = useState(numeroParaTexto(inicial?.lucroPercent ?? 50))
  const [taxas, setTaxas] = useState(numeroParaTexto(inicial?.taxasPercent ?? 0))
  const [precoFinal, setPrecoFinal] = useState(
    inicial?.precoPraticadoCentavos
      ? numeroParaTexto(inicial.precoPraticadoCentavos / 100)
      : '',
  )
  const [escolhendo, setEscolhendo] = useState(false)
  const [materialSel, setMaterialSel] = useState<Material | null>(null)
  const [erro, setErro] = useState('')

  const mapa = criarMapa(materiais)

  const dados = {
    materiais: itens,
    minutosProducao: paraNumero(horas) * 60 + paraNumero(minutos),
    lucroPercent: paraNumero(lucro),
    taxasPercent: paraNumero(taxas),
    precoPraticadoCentavos: precoFinal.trim()
      ? reaisParaCentavos(precoFinal)
      : undefined,
  }

  // Tudo é recalculado a cada tecla digitada.
  let resumo: ResumoProduto | null = null
  let erroCalculo = ''
  if (valorHora !== null) {
    try {
      resumo = calcularProduto(dados, mapa, valorHora)
    } catch (e) {
      erroCalculo = e instanceof Error ? e.message : 'Não foi possível calcular.'
    }
  }

  function custoItem(item: ItemFicha) {
    return (mapa.get(item.materialId)?.custoUnitarioCentavos ?? 0) * item.quantidade
  }
  const subtotalMateriais = Math.round(
    itens.reduce((soma, item) => soma + custoItem(item), 0),
  )

  async function salvar() {
    if (!nome.trim()) {
      setErro('Dê um nome ao produto.')
      return
    }
    if (dados.minutosProducao <= 0) {
      setErro('Informe o tempo de produção em "Trabalho".')
      return
    }
    if (erroCalculo) {
      setErro(erroCalculo)
      return
    }

    const produto = {
      nome: nome.trim(),
      minutosProducao: dados.minutosProducao,
      lucroPercent: dados.lucroPercent,
      taxasPercent: dados.taxasPercent,
      materiais: itens,
      precoPraticadoCentavos: dados.precoPraticadoCentavos,
    }

    if (inicial) {
      await db.produtos.put({ ...produto, id: inicial.id })
    } else {
      await db.produtos.add(produto)
    }
    aoFechar()
  }

  // ---------- Tela: Materiais ----------
  if (tela === 'materiais') {
    return (
      <div className="space-y-4">
        <Cabecalho
          titulo="Materiais da peça"
          aoVoltar={() => {
            setMaterialSel(null)
            setTela('principal')
          }}
        />

        {materialSel ? (
          <FormItem
            material={materialSel}
            aoAdicionar={(item) => {
              setItens((atual) => [...atual, item])
              setMaterialSel(null)
            }}
            aoCancelar={() => setMaterialSel(null)}
          />
        ) : (
          <>
            {itens.length === 0 && (
              <p className="text-gray-500">Nenhum material adicionado ainda.</p>
            )}

            <ul className="space-y-2">
              {itens.map((item, indice) => {
                const m = mapa.get(item.materialId)
                return (
                  <li
                    key={indice}
                    className="flex items-center gap-3 rounded-xl bg-white p-3 shadow"
                  >
                    {m && <IconeMaterial tipo={m.tipoMedida} />}
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-800">
                        {m?.nome ?? 'Material removido'}
                      </span>
                      <span className="block text-sm text-gray-500">
                        {detalheItem(item, m)}
                      </span>
                    </span>
                    <span className="font-semibold text-rose-600">
                      {formatarReais(custoItem(item))}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItens((atual) => atual.filter((_, i) => i !== indice))
                      }
                      aria-label="Remover material"
                      className="p-1 text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </li>
                )
              })}
            </ul>

            {itens.length > 0 && (
              <div className="rounded-xl bg-rose-50 p-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-rose-600">
                  {formatarReais(subtotalMateriais)}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setEscolhendo(true)}
              className={`${botaoSecundario} flex items-center justify-center gap-2`}
            >
              <Plus size={20} /> Adicionar material
            </button>

            <button type="button" onClick={() => setTela('principal')} className={botaoPrincipal}>
              Concluir
            </button>
          </>
        )}

        {escolhendo && (
          <EscolherMaterial
            materiais={materiais}
            aoEscolher={(m) => {
              setMaterialSel(m)
              setEscolhendo(false)
            }}
            aoFechar={() => setEscolhendo(false)}
          />
        )}
      </div>
    )
  }

  // ---------- Tela: Trabalho ----------
  if (tela === 'trabalho') {
    return (
      <div className="space-y-4">
        <Cabecalho titulo="Trabalho" aoVoltar={() => setTela('principal')} />

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
          <p className="text-sm text-gray-600">
            Quanto tempo você leva para fazer 1 peça?
          </p>
          <div className="flex gap-3">
            <label className="block flex-1 text-sm text-gray-600">
              Horas
              <input
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className={campo}
              />
            </label>
            <label className="block flex-1 text-sm text-gray-600">
              Minutos
              <input
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                inputMode="numeric"
                placeholder="50"
                className={campo}
              />
            </label>
          </div>

          {valorHora !== null && (
            <p className="text-sm text-gray-600">
              Sua hora de trabalho vale {formatarReais(valorHora)}.
            </p>
          )}
          {resumo && (
            <p className="text-sm text-gray-800">
              Mão de obra desta peça:{' '}
              <strong className="text-rose-600">
                {formatarReais(resumo.custoMaoDeObra)}
              </strong>
            </p>
          )}
        </div>

        <button type="button" onClick={() => setTela('principal')} className={botaoPrincipal}>
          Concluir
        </button>
      </div>
    )
  }

  // ---------- Tela: Lucro ----------
  if (tela === 'lucro') {
    return (
      <div className="space-y-4">
        <Cabecalho titulo="Lucro" aoVoltar={() => setTela('principal')} />

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
          <label className="block text-sm text-gray-600">
            Lucro desejado (%)
            <input
              value={lucro}
              onChange={(e) => setLucro(e.target.value)}
              inputMode="decimal"
              placeholder="50"
              className={campo}
            />
          </label>
          <p className="text-xs text-gray-500">
            É o quanto você quer ganhar em cima do que gasta. 100% quer dizer ganhar o
            mesmo valor do custo. Pode passar de 100%.
          </p>

          <label className="block text-sm text-gray-600">
            Taxas (%)
            <input
              value={taxas}
              onChange={(e) => setTaxas(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={campo}
            />
          </label>
          <p className="text-xs text-gray-500">
            O que você paga ao vender: cartão, maquininha, site de vendas.
          </p>

          {resumo && (
            <div className="space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-gray-800">
              <Linha
                rotulo="Valor do lucro"
                meio={`${formatarPercentual(resumo.lucroPercent)}%`}
                valor={formatarReais(resumo.lucro)}
              />
              <Linha rotulo="Taxas" valor={formatarReais(resumo.taxas)} />
              {resumo.editado && (
                <p className="pt-2 text-xs text-gray-500">
                  Você definiu o preço final na mão, então o lucro acima vem dele.
                </p>
              )}
            </div>
          )}
          {erroCalculo && <p className="text-sm text-red-600">{erroCalculo}</p>}
        </div>

        <button type="button" onClick={() => setTela('principal')} className={botaoPrincipal}>
          Concluir
        </button>
      </div>
    )
  }

  // ---------- Tela: Editar preço final ----------
  if (tela === 'preco') {
    return (
      <div className="space-y-4">
        <Cabecalho titulo="Editar preço final" aoVoltar={() => setTela('principal')} />

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
          {resumo && (
            <p className="text-sm text-gray-600">
              Preço calculado:{' '}
              <strong className="text-rose-600">
                {formatarReais(resumo.precoCalculado)}
              </strong>
            </p>
          )}

          <label className="block text-sm text-gray-600">
            Por quanto você quer vender? (R$)
            <input
              value={precoFinal}
              onChange={(e) => setPrecoFinal(e.target.value)}
              inputMode="decimal"
              placeholder="Ex.: 40,00"
              className={campo}
            />
          </label>

          {resumo && resumo.editado && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-gray-800">
              <Linha
                rotulo="Seu lucro nesse preço"
                meio={`${formatarPercentual(resumo.lucroPercent)}%`}
                valor={formatarReais(resumo.lucro)}
              />
              {resumo.lucro < 0 && (
                <p className="pt-2 font-semibold text-red-600">
                  Atenção: por esse preço você teria prejuízo.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPrecoFinal('')}
          className={botaoSecundario}
        >
          Usar o preço calculado
        </button>
        <button type="button" onClick={() => setTela('principal')} className={botaoPrincipal}>
          Concluir
        </button>
      </div>
    )
  }

  // ---------- Tela principal ----------
  return (
    <div className="space-y-4">
      <Cabecalho titulo={inicial ? 'Editar produto' : 'Novo produto'} aoVoltar={aoFechar} />

      <div className="rounded-2xl bg-white p-4 shadow">
        <label className="block text-sm text-gray-600">
          Nome do produto
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Necessaire"
            className={campo}
          />
        </label>
      </div>

      <h3 className="text-xl font-bold text-gray-800">Precificar</h3>

      {valorHora === null && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Para calcular o preço, primeiro descubra o valor da sua hora na aba Mais.
        </p>
      )}

      <CartaoResumo icone={Shapes} titulo="Materiais" aoAbrir={() => setTela('materiais')}>
        {itens.length === 0 ? (
          <p className="text-gray-500">Toque aqui para adicionar os materiais da peça.</p>
        ) : (
          <div className="space-y-2">
            {itens.map((item, indice) => {
              const m = mapa.get(item.materialId)
              return (
                <Linha
                  key={indice}
                  rotulo={m?.nome ?? 'Material removido'}
                  meio={detalheItem(item, m)}
                  valor={formatarReais(custoItem(item))}
                />
              )
            })}
            <Linha rotulo="Subtotal" valor={formatarReais(subtotalMateriais)} forte />
          </div>
        )}
      </CartaoResumo>

      <CartaoResumo icone={Briefcase} titulo="Trabalho" aoAbrir={() => setTela('trabalho')}>
        {dados.minutosProducao <= 0 ? (
          <p className="text-gray-500">Toque aqui para informar o tempo de produção.</p>
        ) : (
          <Linha
            rotulo="Mão de obra"
            meio={formatarHoras(dados.minutosProducao)}
            valor={resumo ? formatarReais(resumo.custoMaoDeObra) : '—'}
          />
        )}
      </CartaoResumo>

      <CartaoResumo icone={DollarSign} titulo="Lucro" aoAbrir={() => setTela('lucro')}>
        <Linha
          rotulo="Valor do lucro"
          meio={resumo ? `${formatarPercentual(resumo.lucroPercent)}%` : `${formatarPercentual(dados.lucroPercent)}%`}
          valor={resumo ? formatarReais(resumo.lucro) : '—'}
        />
      </CartaoResumo>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h3 className="text-xl font-bold text-gray-800">Preço final</h3>

        <div className="mt-3 rounded-xl bg-rose-50 p-4">
          <p className="font-semibold text-gray-800">Total</p>
          <p className="text-3xl font-bold text-rose-600">
            {resumo ? formatarReais(resumo.total) : '—'}
          </p>

          {resumo && (
            <div className="mt-3 space-y-1 text-sm text-gray-800">
              <Linha rotulo="Preço base" valor={formatarReais(resumo.precoBase)} forte />
              <Linha rotulo="Custo total" valor={formatarReais(resumo.custoTotal)} recuo={1} forte />
              <Linha rotulo="Materiais" valor={formatarReais(resumo.custoMateriais)} recuo={2} />
              <Linha rotulo="Trabalho" valor={formatarReais(resumo.custoMaoDeObra)} recuo={2} />
              <Linha rotulo="Lucro" valor={formatarReais(resumo.lucro)} recuo={1} forte />
              <Linha rotulo="Taxas" valor={formatarReais(resumo.taxas)} forte />
              {resumo.lucro < 0 && (
                <p className="pt-2 font-semibold text-red-600">
                  Atenção: por esse preço você teria prejuízo.
                </p>
              )}
            </div>
          )}
          {erroCalculo && <p className="mt-2 text-sm text-red-600">{erroCalculo}</p>}
        </div>

        <button
          type="button"
          onClick={() => setTela('preco')}
          className={`${botaoSecundario} mt-3`}
        >
          Editar preço final
        </button>
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button type="button" onClick={salvar} className={botaoPrincipal}>
        Salvar produto
      </button>
      <button type="button" onClick={aoFechar} className={botaoCinza}>
        Cancelar
      </button>
    </div>
  )
}

// Formulário de "quanto desse material vai na peça".
function FormItem({
  material,
  aoAdicionar,
  aoCancelar,
}: {
  material: Material
  aoAdicionar: (item: ItemFicha) => void
  aoCancelar: () => void
}) {
  const ehTecido = material.tipoMedida === 'area'
  const [quantidade, setQuantidade] = useState('')
  const [largura, setLargura] = useState('')
  const [altura, setAltura] = useState('')
  const [erro, setErro] = useState('')

  function confirmar() {
    if (ehTecido) {
      const l = paraNumero(largura)
      const a = paraNumero(altura)
      if (l <= 0 || a <= 0) {
        setErro('Informe a largura e a altura do pedaço usado.')
        return
      }
      aoAdicionar({
        materialId: material.id,
        quantidade: l * a, // área do pedaço em cm²
        larguraCm: l,
        alturaCm: a,
      })
    } else {
      const q = paraNumero(quantidade)
      if (q <= 0) {
        setErro('Informe a quantidade usada na peça.')
        return
      }
      aoAdicionar({ materialId: material.id, quantidade: q })
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <div className="flex items-center gap-3">
        <IconeMaterial tipo={material.tipoMedida} />
        <p className="font-semibold text-gray-800">{material.nome}</p>
      </div>

      {ehTecido ? (
        <>
          <p className="text-sm text-gray-600">
            Qual o tamanho do pedaço que você usa em 1 peça?
          </p>
          <div className="flex gap-3">
            <label className="block flex-1 text-sm text-gray-600">
              Largura (cm)
              <input
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                inputMode="decimal"
                placeholder="30"
                className={campo}
              />
            </label>
            <label className="block flex-1 text-sm text-gray-600">
              Altura (cm)
              <input
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                inputMode="decimal"
                placeholder="30"
                className={campo}
              />
            </label>
          </div>
        </>
      ) : (
        <label className="block text-sm text-gray-600">
          Quantidade ({material.unidade})
          <input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            inputMode="decimal"
            placeholder="1"
            className={campo}
          />
        </label>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button type="button" onClick={confirmar} className={botaoPrincipal}>
        Adicionar
      </button>
      <button type="button" onClick={aoCancelar} className={botaoCinza}>
        Cancelar
      </button>
    </div>
  )
}