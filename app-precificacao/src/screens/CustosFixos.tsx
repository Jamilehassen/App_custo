import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { db, type Configuracao } from '../db'
import { useCustoHora } from '../lib/useCustoHora'
import { formatarReais, reaisParaCentavos } from '../lib/formato'


export default function CustosFixos() {
  const custos = useLiveQuery(() => db.custosFixos.orderBy('nome').toArray())
  const config = useLiveQuery(() => db.configuracao.get(1))

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')

  async function salvarCusto(e: FormEvent) {
    e.preventDefault()
    const valorCentavos = reaisParaCentavos(valor)
    if (!nome.trim() || valorCentavos <= 0) {
      setErro('Preencha o nome e o valor por mês.')
      return
    }
    await db.custosFixos.add({ nome: nome.trim(), valorMensalCentavos: valorCentavos })
    setNome('')
    setValor('')
    setErro('')
  }

  async function excluir(id: number, nomeCusto: string) {
    if (confirm(`Excluir "${nomeCusto}"?`)) {
      await db.custosFixos.delete(id)
    }
  }

  const totalFixos = custos?.reduce((soma, c) => soma + c.valorMensalCentavos, 0) ?? 0
  const { valorHora, horasPorMes } = useCustoHora()

  return (
    <div className="space-y-6">
      {/* Resultado */}
      <section className="rounded-2xl bg-rose-600 p-5 text-white shadow">
        <p className="text-sm opacity-90">O valor da sua hora de trabalho</p>
        {valorHora !== null ? (
          <>
            <p className="text-3xl font-bold">{formatarReais(valorHora)}</p>
            <p className="mt-1 text-xs opacity-90">
              Considerando {horasPorMes} horas de trabalho por mês
            </p>
          </>
        ) : (
          <p className="mt-1">
            Preencha a seção &quot;Seu trabalho&quot; abaixo para descobrir.
          </p>
        )}
      </section>

      {/* Seu trabalho */}
      <SeuTrabalho key={config ? 'salvo' : 'novo'} config={config} />

      {/* Custos fixos */}
      <form onSubmit={salvarCusto} className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-gray-800">Novo custo fixo</h2>
        <p className="text-sm text-gray-500">
          São as contas que você paga todo mês, mesmo sem vender nada: luz,
          internet, aluguel, MEI...
        </p>

        <label className="block text-sm text-gray-600">
          Nome
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Internet"
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>

        <label className="block text-sm text-gray-600">
          Quanto paga por mês (R$)
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder="100,00"
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-rosa p-3 text-base font-semibold text-white"
        >
          Salvar custo fixo
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-800">
          Meus custos fixos
        </h2>

        {custos && custos.length === 0 && (
          <p className="text-gray-500">Você ainda não cadastrou nenhum custo fixo.</p>
        )}

        <ul className="space-y-2">
          {custos?.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow"
            >
              <div>
                <p className="font-semibold text-gray-800">{c.nome}</p>
                <p className="text-rose-600">{formatarReais(c.valorMensalCentavos)} por mês</p>
              </div>
              <button
                onClick={() => excluir(c.id, c.nome)}
                aria-label={`Excluir ${c.nome}`}
                className="p-2 text-gray-400"
              >
                <Trash2 size={22} />
              </button>
            </li>
          ))}
        </ul>

        {custos && custos.length > 0 && (
          <p className="mt-3 text-right font-semibold text-gray-800">
            Total: {formatarReais(totalFixos)} por mês
          </p>
        )}
      </section>
    </div>
  )
}

function SeuTrabalho({ config }: { config?: Configuracao }) {
  const [retirada, setRetirada] = useState(
    config ? String(config.retiradaDesejadaCentavos / 100).replace('.', ',') : '',
  )
  const [dias, setDias] = useState(config ? String(config.diasPorSemana) : '')
  const [horasDia, setHorasDia] = useState(config ? String(config.horasPorDia) : '')
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const retiradaCentavos = reaisParaCentavos(retirada)
    const d = parseFloat(dias.replace(',', '.'))
    const h = parseFloat(horasDia.replace(',', '.'))

    if (retiradaCentavos <= 0 || !(d > 0 && d <= 7) || !(h > 0 && h <= 24)) {
      setErro('Preencha quanto quer ganhar, os dias (de 1 a 7) e as horas por dia.')
      return
    }

    await db.configuracao.put({
      id: 1,
      retiradaDesejadaCentavos: retiradaCentavos,
      diasPorSemana: d,
      horasPorDia: h,
    })
    setErro('')
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-lg font-semibold text-gray-800">Seu trabalho</h2>

      <label className="block text-sm text-gray-600">
        Quanto você quer ganhar por mês (R$)
        <input
          value={retirada}
          onChange={(e) => setRetirada(e.target.value)}
          inputMode="decimal"
          placeholder="2000,00"
          className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
        />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1 text-sm text-gray-600">
          Dias por semana
          <input
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            inputMode="decimal"
            placeholder="5"
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>
        <label className="block flex-1 text-sm text-gray-600">
          Horas por dia
          <input
            value={horasDia}
            onChange={(e) => setHorasDia(e.target.value)}
            inputMode="decimal"
            placeholder="4"
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Conte só as horas em que você realmente está produzindo. Responder
        mensagens e organizar o ateliê ficam de fora.
      </p>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-rosa p-3 text-base font-semibold text-white"
      >
        Salvar
      </button>
    </form>
  )
}