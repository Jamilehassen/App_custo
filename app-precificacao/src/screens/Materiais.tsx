import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Droplet,
  Hash,
  Plus,
  Ruler,
  Square,
  Trash2,
  Weight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { db, type Material, type TipoMedida } from '../db'
import { medidas } from '../lib/medidas'
import { filtrar } from '../lib/busca'
import { custoPorCm2, precoPorMetro } from '../lib/precificacao'
import { formatarReais, paraNumero, reaisParaCentavos } from '../lib/formato'
import CampoBusca from '../components/CampoBusca'
import { formatarSaldo } from '../lib/estoque'
import { useEstoque } from '../lib/useEstoque'

const icones: Record<TipoMedida, LucideIcon> = {
  unidade: Hash,
  comprimento: Ruler,
  area: Square,
  peso: Weight,
  volume: Droplet,
}

export default function Materiais() {
  const materiais = useLiveQuery(() => db.materiais.orderBy('nome').toArray())
  const estoque = useEstoque()
  const [editando, setEditando] = useState<Material | 'novo' | null>(null)
  const [busca, setBusca] = useState('')

  if (!materiais) return null

  if (editando) {
    return (
      <FormMaterial
        inicial={editando === 'novo' ? undefined : editando}
        aoFechar={() => setEditando(null)}
      />
    )
  }

  const visiveis = filtrar(materiais, busca, (m) => [m.nome, m.observacoes ?? ''])

  async function excluir(id: number, nome: string) {
    if (confirm(`Excluir "${nome}"?`)) {
      await db.materiais.delete(id)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditando('novo')}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        <Plus size={20} /> Novo material
      </button>

      <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar material..." />

      {materiais.length === 0 && (
        <p className="text-gray-500">Você ainda não cadastrou nenhum material.</p>
      )}
      {materiais.length > 0 && visiveis.length === 0 && (
        <p className="text-gray-500">Nenhum material encontrado.</p>
      )}

      <ul className="space-y-2">
        {visiveis.map((m) => {
          const Icone = icones[m.tipoMedida]
          return (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-xl bg-white p-3 shadow"
            >
              <button
                onClick={() => setEditando(m)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Icone size={24} />
                </span>
                <span>
                  <span className="block font-semibold text-gray-800">{m.nome}</span>
                    {estoque && estoque.saldoDe('material', m.id) !== undefined && (
                    <span className="block text-xs font-semibold text-gray-600">
                      Estoque:{' '}
                      {formatarSaldo(
                        'material',
                        m.tipoMedida,
                        estoque.saldoDe('material', m.id) ?? 0,
                      )}
                    </span>
                  )}
                  {m.observacoes && (
                    <span className="block text-xs text-gray-500">{m.observacoes}</span>
                  )}
                  {m.tipoMedida === 'area' &&
                  m.larguraCm &&
                  m.alturaCm &&
                  m.precoPagoCentavos ? (
                    <>
                      <span className="block text-rose-600">
                        {formatarReais(m.precoPagoCentavos)} por {m.larguraCm} ×{' '}
                        {m.alturaCm} cm
                      </span>
                      <span className="block text-xs text-gray-500">
                        {formatarReais(m.precoCentavos)} por m²
                      </span>
                    </>
                  ) : (
                    <span className="block text-rose-600">
                      {formatarReais(m.precoCentavos)} por {medidas[m.tipoMedida].sufixo}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => excluir(m.id, m.nome)}
                aria-label={`Excluir ${m.nome}`}
                className="p-2 text-gray-400"
              >
                <Trash2 size={22} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FormMaterial({
  inicial,
  aoFechar,
}: {
  inicial?: Material
  aoFechar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [tipo, setTipo] = useState<TipoMedida>(inicial?.tipoMedida ?? 'comprimento')
  const [preco, setPreco] = useState(
    inicial && inicial.tipoMedida !== 'area'
      ? String(inicial.precoCentavos / 100).replace('.', ',')
      : '',
  )
  const [largura, setLargura] = useState(
    inicial?.larguraCm ? String(inicial.larguraCm).replace('.', ',') : '',
  )
  const [altura, setAltura] = useState(
    inicial?.alturaCm ? String(inicial.alturaCm).replace('.', ',') : '',
  )
  const [pago, setPago] = useState(
    inicial?.precoPagoCentavos
      ? String(inicial.precoPagoCentavos / 100).replace('.', ',')
      : '',
  )
  const [calculadora, setCalculadora] = useState(false)
  const [erro, setErro] = useState('')

  const info = medidas[tipo]

  // Para tecido: custo de cada cm² a partir do tamanho inteiro e do preço pago.
  const larguraNum = paraNumero(largura)
  const alturaNum = paraNumero(altura)
  const pagoCentavos = reaisParaCentavos(pago)
  const custoCm2 =
    tipo === 'area' && larguraNum > 0 && alturaNum > 0 && pagoCentavos > 0
      ? custoPorCm2(pagoCentavos, larguraNum, alturaNum)
      : null

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Preencha o nome do material.')
      return
    }

    let precoCentavos: number
    let custoUnitarioCentavos: number
    let tamanho: Pick<Material, 'larguraCm' | 'alturaCm' | 'precoPagoCentavos'> = {}

    if (tipo === 'area') {
      if (custoCm2 === null) {
        setErro('Preencha a largura, a altura e quanto você pagou pelo tecido.')
        return
      }
      custoUnitarioCentavos = custoCm2
      precoCentavos = custoCm2 * info.divisor // preço de 1 m²
      tamanho = {
        larguraCm: larguraNum,
        alturaCm: alturaNum,
        precoPagoCentavos: pagoCentavos,
      }
    } else {
      precoCentavos = reaisParaCentavos(preco)
      if (precoCentavos <= 0) {
        setErro('Preencha o preço.')
        return
      }
      custoUnitarioCentavos = precoCentavos / info.divisor
    }

    const dados = {
      nome: nome.trim(),
      observacoes: observacoes.trim() || undefined,
      tipoMedida: tipo,
      precoCentavos,
      unidade: info.unidadeUso,
      custoUnitarioCentavos,
      ...tamanho,
    }

    if (inicial) {
      await db.materiais.put({ ...dados, id: inicial.id })
    } else {
      await db.materiais.add(dados)
    }
    aoFechar()
  }

  return (
    <>
      <form onSubmit={salvar} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {inicial ? 'Editar material' : 'Novo material'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="p-2 text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
          <label className="block text-sm text-gray-600">
            Nome do material
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Viés de algodão 35mm"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
            />
          </label>

          <label className="block text-sm text-gray-600">
            Observações (opcional)
            <input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: comprado na Central Aviamentos"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
            />
          </label>

          <label className="block text-sm text-gray-600">
            Tipo de medida
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMedida)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base"
            >
              {(Object.keys(medidas) as TipoMedida[]).map((t) => (
                <option key={t} value={t}>
                  {medidas[t].rotulo}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-gray-500">{info.exemplo}</span>
          </label>

          {tipo === 'area' ? (
            <>
              <div className="flex gap-3">
                <label className="block flex-1 text-sm text-gray-600">
                  Largura do tecido (cm)
                  <input
                    value={largura}
                    onChange={(e) => setLargura(e.target.value)}
                    inputMode="decimal"
                    placeholder="140"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                </label>
                <label className="block flex-1 text-sm text-gray-600">
                  Altura do tecido (cm)
                  <input
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    inputMode="decimal"
                    placeholder="100"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-600">
                Quanto você pagou por esse tecido (R$)
                <input
                  value={pago}
                  onChange={(e) => setPago(e.target.value)}
                  inputMode="decimal"
                  placeholder="28,00"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
                />
              </label>

              {custoCm2 !== null && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-gray-700">
                  <p>
                    Cada m² custa{' '}
                    <strong>{formatarReais(custoCm2 * info.divisor)}</strong>
                  </p>
                  <p>
                    Um pedaço de 30 × 30 cm custa{' '}
                    <strong>{formatarReais(custoCm2 * 30 * 30)}</strong>
                  </p>
                </div>
              )}
            </>
          ) : (
            <label className="block text-sm text-gray-600">
              {info.rotuloPreco}
              <input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                inputMode="decimal"
                placeholder="15,00"
                className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
              />
            </label>
          )}

          {tipo === 'comprimento' && (
            <button
              type="button"
              onClick={() => setCalculadora(true)}
              className="w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600"
            >
              Descobrir preço por metro
            </button>
          )}
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
        >
          Salvar material
        </button>
      </form>

      {calculadora && (
        <DescobrirPrecoPorMetro
          aoUsar={(centavos) => {
            setPreco((centavos / 100).toFixed(2).replace('.', ','))
            setCalculadora(false)
          }}
          aoFechar={() => setCalculadora(false)}
        />
      )}
    </>
  )
}

function DescobrirPrecoPorMetro({
  aoUsar,
  aoFechar,
}: {
  aoUsar: (centavos: number) => void
  aoFechar: () => void
}) {
  const [unidade, setUnidade] = useState<'cm' | 'm'>('m')
  const [quantidade, setQuantidade] = useState('')
  const [pago, setPago] = useState('')

  const qtd = paraNumero(quantidade)
  const pagoCentavos = reaisParaCentavos(pago)
  const resultado =
    qtd > 0 && pagoCentavos > 0 ? precoPorMetro(pagoCentavos, qtd, unidade) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={aoFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-5 pb-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Descobrir preço por metro
          </h3>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="p-1 text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <div>
          <p className="mb-1 text-sm text-gray-600">Você compra em</p>
          <div className="flex gap-2">
            {(['m', 'cm'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnidade(u)}
                className={`flex-1 rounded-lg border p-3 text-base font-semibold ${
                  unidade === u
                    ? 'border-rose-600 bg-rose-50 text-rose-600'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {u === 'm' ? 'Metros' : 'Centímetros'}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm text-gray-600">
          Quantidade ({unidade === 'm' ? 'metros' : 'centímetros'})
          <input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            inputMode="decimal"
            placeholder={unidade === 'm' ? '5' : '200'}
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>

        <label className="block text-sm text-gray-600">
          Quanto você paga (R$)
          <input
            value={pago}
            onChange={(e) => setPago(e.target.value)}
            inputMode="decimal"
            placeholder="30,00"
            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-base"
          />
        </label>

        <div className="rounded-xl bg-rose-50 p-4 text-center">
          <p className="text-sm text-gray-600">Preço por metro</p>
          <p className="text-2xl font-bold text-rose-600">
            {resultado !== null ? formatarReais(resultado) : '—'}
          </p>
        </div>

        <button
          type="button"
          disabled={resultado === null}
          onClick={() => resultado !== null && aoUsar(resultado)}
          className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white disabled:opacity-40"
        >
          Usar este preço
        </button>
      </div>
    </div>
  )
}