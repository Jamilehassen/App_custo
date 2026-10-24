import { useState, type ChangeEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { db, type ItemCatalogo, type Produto } from '../db'
import { prepararFoto } from '../lib/imagem'
import { formatarReais } from '../lib/formato'
import Cabecalho from '../components/Cabecalho'

type Props = {
  produto: Produto
  item?: ItemCatalogo
  preco: number | null
  aoFechar: () => void
}

export default function EditarItemCatalogo({ produto, item, preco, aoFechar }: Props) {
  const [foto, setFoto] = useState<string | undefined>(item?.foto)
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const entrada = e.target
    const arquivo = entrada.files?.[0]
    if (!arquivo) return

    setProcessando(true)
    setErro('')
    try {
      setFoto(await prepararFoto(arquivo))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível usar essa foto.')
    } finally {
      setProcessando(false)
      entrada.value = '' // permite escolher a mesma foto de novo
    }
  }

  async function salvar() {
    // Salvar aqui já coloca o produto no catálogo.
    await db.catalogo.put({
      produtoId: produto.id,
      foto,
      descricao: descricao.trim() || undefined,
    })
    aoFechar()
  }

  return (
    <div className="space-y-4">
      <Cabecalho titulo={produto.nome} aoVoltar={aoFechar} />

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
        {foto ? (
          <img
            src={foto}
            alt={produto.nome}
            className="aspect-square w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-400">
            <Camera size={40} />
            <span className="text-sm">Ainda sem foto</span>
          </div>
        )}

        <label className="block w-full cursor-pointer rounded-lg border border-rose-600 p-3 text-center text-base font-semibold text-rose-600">
          <input
            type="file"
            accept="image/*"
            onChange={escolherFoto}
            className="hidden"
          />
          {processando ? 'Preparando a foto...' : foto ? 'Trocar foto' : 'Tirar ou escolher foto'}
        </label>

        {foto && (
          <button
            type="button"
            onClick={() => setFoto(undefined)}
            className="flex w-full items-center justify-center gap-2 p-2 text-sm text-gray-500"
          >
            <Trash2 size={18} /> Remover foto
          </button>
        )}
        <p className="text-xs text-gray-500">
          A foto é cortada em quadrado para o catálogo ficar uniforme.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <label className="block text-sm text-gray-600">
          Descrição (opcional)
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            maxLength={300}
            placeholder="Ex.: Necessaire em tricoline, com zíper e forro. Tamanho 20 × 12 cm."
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>

        <p className="text-sm text-gray-600">
          Preço no catálogo:{' '}
          <strong className="text-rose-600">
            {preco !== null ? formatarReais(preco) : 'defina o valor da sua hora'}
          </strong>
        </p>
        <p className="text-xs text-gray-500">
          O preço vem do cálculo do produto. Para mudar, edite o produto na aba Produtos.
        </p>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="button"
        onClick={salvar}
        disabled={processando}
        className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white disabled:opacity-40"
      >
        Salvar
      </button>
      <button
        type="button"
        onClick={aoFechar}
        className="w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700"
      >
        Cancelar
      </button>
    </div>
  )
}