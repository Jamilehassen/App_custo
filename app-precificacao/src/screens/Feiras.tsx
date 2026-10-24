import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Plus } from 'lucide-react'
import { db } from '../db'
import { formatarDataCurta, hojeISO } from '../lib/datas'
import { formatarReais } from '../lib/formato'
import { resumirFeira } from '../lib/feiras'
import Cabecalho from '../components/Cabecalho'
import DiaDeFeira from './DiaDeFeira'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'
const chip = 'rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700'

export default function Feiras() {
  const feiras = useLiveQuery(() => db.feiras.toArray())
  const vendas = useLiveQuery(() => db.vendasFeira.toArray())
  const [abertaId, setAbertaId] = useState<number | null>(null)
  const [criando, setCriando] = useState(false)

  if (!feiras || !vendas) return null

  // Mais recentes primeiro.
  const recentes = [...feiras].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)

  const aberta = feiras.find((f) => f.id === abertaId)
  if (aberta) {
    return (
      <DiaDeFeira
        feira={aberta}
        vendas={vendas.filter((v) => v.feiraId === aberta.id)}
        aoVoltar={() => setAbertaId(null)}
      />
    )
  }

  if (criando) {
    // Nomes já usados, sem repetir, para ela só tocar.
    const nomes: string[] = []
    for (const f of recentes) {
      if (!nomes.some((n) => n.toLowerCase() === f.nome.toLowerCase())) nomes.push(f.nome)
    }
    return (
      <NovaFeira
        nomesAnteriores={nomes.slice(0, 5)}
        aoCriar={(id) => {
          setCriando(false)
          setAbertaId(id)
        }}
        aoCancelar={() => setCriando(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setCriando(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        <Plus size={20} /> Nova feira
      </button>

      <p className="text-sm text-gray-600">
        Aqui ficam as vendas feitas na hora, na própria feira, sem orçamento.
      </p>

      {recentes.length === 0 && (
        <p className="text-gray-500">Você ainda não abriu nenhuma feira.</p>
      )}

      <ul className="space-y-2">
        {recentes.map((f) => {
          const resumo = resumirFeira(vendas.filter((v) => v.feiraId === f.id))
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setAbertaId(f.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow"
              >
                <span className="flex-1">
                  <span className="block font-semibold text-gray-800">{f.nome}</span>
                  <span className="block text-sm text-gray-500">
                    {formatarDataCurta(f.data)}
                    {f.data === hojeISO() && ' · hoje'}
                  </span>
                  <span className="block text-sm text-rose-600">
                    {resumo.clientes === 1 ? '1 cliente' : `${resumo.clientes} clientes`} ·{' '}
                    {formatarReais(resumo.total)}
                  </span>
                </span>
                <ChevronRight size={22} className="text-rose-600" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NovaFeira({
  nomesAnteriores,
  aoCriar,
  aoCancelar,
}: {
  nomesAnteriores: string[]
  aoCriar: (id: number) => void
  aoCancelar: () => void
}) {
  const [nome, setNome] = useState('')
  const [data, setData] = useState(hojeISO())
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Dê um nome para a feira.')
      return
    }
    if (!data) {
      setErro('Escolha a data da feira.')
      return
    }
    const id = await db.feiras.add({ nome: nome.trim(), data })
    aoCriar(id)
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Cabecalho titulo="Nova feira" aoVoltar={aoCancelar} />

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <label className="block text-sm text-gray-600">
          Nome da feira
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Feira Lisboa Mall"
            className={campo}
          />
        </label>

        {nomesAnteriores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nomesAnteriores.map((n) => (
              <button key={n} type="button" onClick={() => setNome(n)} className={chip}>
                {n}
              </button>
            ))}
          </div>
        )}

        <label className="block text-sm text-gray-600">
          Data
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={campo}
          />
        </label>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        Abrir feira
      </button>
      <button
        type="button"
        onClick={aoCancelar}
        className="w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700"
      >
        Cancelar
      </button>
    </form>
  )
}