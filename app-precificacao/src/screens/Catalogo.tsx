import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Eye, Store } from 'lucide-react'
import { db, type Produto } from '../db'
import { calcularProduto, criarMapa } from '../lib/produtos'
import { useCustoHora } from '../lib/useCustoHora'
import { formatarReais } from '../lib/formato'
import { filtrar } from '../lib/busca'
import Cabecalho from '../components/Cabecalho'
import CampoBusca from '../components/CampoBusca'
import Miniatura from '../components/Miniatura'
import DadosLoja from './DadosLoja'
import EditarItemCatalogo from './EditarItemCatalogo'
import PreviaCatalogo from './PreviaCatalogo'

type Tela = 'lista' | 'loja' | 'previa'

function Interruptor({
  ligado,
  aoMudar,
  rotulo,
}: {
  ligado: boolean
  aoMudar: () => void
  rotulo: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={aoMudar}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        ligado ? 'bg-rose-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
          ligado ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function Catalogo({ aoVoltar }: { aoVoltar: () => void }) {
  const produtos = useLiveQuery(() => db.produtos.orderBy('nome').toArray())
  const materiais = useLiveQuery(() => db.materiais.toArray())
  const itens = useLiveQuery(() => db.catalogo.toArray())
  const loja = useLiveQuery(() => db.loja.get(1))
  const { valorHora } = useCustoHora()
  const [tela, setTela] = useState<Tela>('lista')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')

  if (!produtos || !materiais || !itens) return null

  const mapa = criarMapa(materiais)
  const porProduto = new Map(itens.map((i) => [i.produtoId, i]))

  // O preço do catálogo é sempre o preço final atual do produto.
  function precoDe(p: Produto): number | null {
    if (valorHora === null) return null
    try {
      return calcularProduto(p, mapa, valorHora).total
    } catch {
      return null
    }
  }

  const entradas = produtos.flatMap((p) => {
    const item = porProduto.get(p.id)
    return item ? [{ produto: p, item, preco: precoDe(p) }] : []
  })

  if (tela === 'loja') {
    return (
      <DadosLoja
        key={loja ? 'salva' : 'nova'}
        loja={loja}
        aoVoltar={() => setTela('lista')}
      />
    )
  }

  if (tela === 'previa') {
    return (
      <PreviaCatalogo loja={loja} entradas={entradas} aoVoltar={() => setTela('lista')} />
    )
  }

  const emEdicao = produtos.find((p) => p.id === editandoId)
  if (emEdicao) {
    return (
      <EditarItemCatalogo
        key={emEdicao.id}
        produto={emEdicao}
        item={porProduto.get(emEdicao.id)}
        preco={precoDe(emEdicao)}
        aoFechar={() => setEditandoId(null)}
      />
    )
  }

  const visiveis = filtrar(produtos, busca, (p) => [p.nome])

  async function alternar(p: Produto) {
    if (porProduto.has(p.id)) {
      if (confirm(`Tirar "${p.nome}" do catálogo? A foto e a descrição serão apagadas.`)) {
        await db.catalogo.delete(p.id)
      }
    } else {
      await db.catalogo.put({ produtoId: p.id })
    }
  }

  return (
    <div className="space-y-4">
      <Cabecalho titulo="Catálogo" aoVoltar={aoVoltar} />

      <button
        type="button"
        onClick={() => setTela('loja')}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <Store size={22} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-gray-800">
            {loja?.nome ?? 'Dados da sua loja'}
          </span>
          <span className="block text-sm text-gray-500">
            {loja ? 'Toque para editar nome e WhatsApp' : 'Preencha o nome e o WhatsApp'}
          </span>
        </span>
        <ChevronRight size={22} className="text-rose-600" />
      </button>

      <button
        type="button"
        onClick={() => setTela('previa')}
        disabled={entradas.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white disabled:opacity-40"
      >
        <Eye size={20} /> Ver catálogo ({entradas.length})
      </button>

      <p className="text-sm text-gray-600">
        Ligue o botão dos produtos que você quer mostrar no catálogo. Toque no produto
        para colocar foto e descrição.
      </p>

      <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar produto..." />

      {produtos.length === 0 && (
        <p className="text-gray-500">
          Cadastre seus produtos na aba Produtos para montar o catálogo.
        </p>
      )}
      {produtos.length > 0 && visiveis.length === 0 && (
        <p className="text-gray-500">Nenhum produto encontrado.</p>
      )}

      <ul className="space-y-2">
        {visiveis.map((p) => {
          const item = porProduto.get(p.id)
          const preco = precoDe(p)
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow"
            >
              <button
                type="button"
                onClick={() => setEditandoId(p.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <Miniatura foto={item?.foto} />
                <span className="flex-1">
                  <span className="block font-semibold text-gray-800">{p.nome}</span>
                  <span className="block text-rose-600">
                    {preco !== null ? formatarReais(preco) : '—'}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {item
                      ? item.foto
                        ? 'No catálogo'
                        : 'No catálogo · sem foto'
                      : 'Fora do catálogo'}
                  </span>
                </span>
              </button>
              <Interruptor
                ligado={Boolean(item)}
                aoMudar={() => alternar(p)}
                rotulo={`Mostrar ${p.nome} no catálogo`}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}