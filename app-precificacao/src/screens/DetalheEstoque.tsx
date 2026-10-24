import { useState } from 'react'
import { X } from 'lucide-react'
import { db, type AlvoEstoque, type MotivoEstoque, type MovimentoEstoque, type TipoMedida } from '../db'
import { formatarSaldo, motivos, nivelDoEstoque } from '../lib/estoque'
import Cabecalho from '../components/Cabecalho'
import CampoQuantidade from '../components/CampoQuantidade'

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

export type ItemDeEstoque = {
  alvo: AlvoEstoque
  id: number
  nome: string
  tipo: TipoMedida // produtos prontos usam 'unidade' (peças)
}

type Modo = 'entrada' | 'saida' | 'contagem'

type Props = {
  item: ItemDeEstoque
  saldo: number | undefined
  minimo: number | undefined
  movimentos: MovimentoEstoque[] // só os deste item
  aoVoltar: () => void
}

export default function DetalheEstoque({ item, saldo, minimo, movimentos, aoVoltar }: Props) {
  const [modo, setModo] = useState<Modo | null>(null)
  const [editandoAviso, setEditandoAviso] = useState(false)
  const [novoMinimo, setNovoMinimo] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const nivel = nivelDoEstoque(saldo, minimo)
  const historico = [...movimentos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

  async function salvarAviso() {
    if (novoMinimo === null) {
      setErro('Informe a quantidade do aviso.')
      return
    }
    const valor = item.alvo === 'produto' ? Math.floor(novoMinimo) : novoMinimo
    await db.avisosEstoque.put({ alvo: item.alvo, alvoId: item.id, minimo: valor })
    setEditandoAviso(false)
    setErro('')
  }

  async function tirarAviso() {
    await db.avisosEstoque.delete([item.alvo, item.id])
  }

  async function desfazer(m: MovimentoEstoque) {
    if (confirm('Desfazer este lançamento? O saldo volta ao que era antes dele.')) {
      await db.movimentos.delete(m.id)
    }
  }

  return (
    <div className="space-y-4">
      <Cabecalho titulo={item.nome} aoVoltar={aoVoltar} />

      <section className={cartao}>
        <p className="text-sm text-gray-600">Você tem</p>
        <p className="text-3xl font-bold text-rose-600">
          {saldo !== undefined ? formatarSaldo(item.alvo, item.tipo, saldo) : 'Sem registro'}
        </p>
        {nivel === 'zerado' && (
          <p className="text-sm font-semibold text-red-600">Sem estoque</p>
        )}
        {nivel === 'baixo' && (
          <p className="text-sm font-semibold text-amber-700">Estoque baixo</p>
        )}
        {saldo === undefined && (
          <p className="text-sm text-gray-500">
            Toque em &quot;Contar&quot; para informar quanto você tem agora.
          </p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['entrada', 'Entrada'],
            ['saida', 'Saída'],
            ['contagem', 'Contar'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setModo(modo === id ? null : id)}
            className={`rounded-lg border p-3 text-sm font-semibold ${
              modo === id
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-rose-600 text-rose-600'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo && (
        <FormMovimento
          key={modo}
          item={item}
          modo={modo}
          saldo={saldo}
          aoConcluir={() => setModo(null)}
        />
      )}

      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Aviso de estoque baixo</h3>
        {minimo !== undefined ? (
          <p className="text-sm text-gray-700">
            Avisar quando tiver <strong>{formatarSaldo(item.alvo, item.tipo, minimo)}</strong> ou
            menos.
          </p>
        ) : (
          <p className="text-sm text-gray-500">Nenhum aviso definido.</p>
        )}

        {editandoAviso ? (
          <>
            <CampoQuantidade key="aviso" tipo={item.tipo} aoMudar={setNovoMinimo} />
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button type="button" onClick={salvarAviso} className={botaoPrincipal}>
              Salvar aviso
            </button>
            <button
              type="button"
              onClick={() => {
                setEditandoAviso(false)
                setErro('')
              }}
              className={botaoCinza}
            >
              Cancelar
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNovoMinimo(null)
                setEditandoAviso(true)
              }}
              className={botaoSecundario}
            >
              {minimo !== undefined ? 'Mudar aviso' : 'Definir aviso'}
            </button>
            {minimo !== undefined && (
              <button type="button" onClick={tirarAviso} className={botaoCinza}>
                Tirar aviso
              </button>
            )}
          </div>
        )}
      </section>

      <section className={cartao}>
        <h3 className="font-semibold text-gray-800">Histórico</h3>
        {historico.length === 0 && (
          <p className="text-sm text-gray-500">Nenhum lançamento ainda.</p>
        )}
        <ul className="space-y-2">
          {historico.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm"
            >
              <span className="flex-1">
                <span className="block font-semibold text-gray-800">{motivos[m.motivo]}</span>
                <span className="block text-xs text-gray-500">
                  {new Date(m.criadoEm).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                {m.observacao && (
                  <span className="block text-xs text-gray-600">{m.observacao}</span>
                )}
              </span>
              <span
                className={`font-semibold ${m.quantidade >= 0 ? 'text-green-700' : 'text-red-600'}`}
              >
                {m.quantidade >= 0 ? '+' : '−'}
                {formatarSaldo(item.alvo, item.tipo, Math.abs(m.quantidade))}
              </span>
              <button
                type="button"
                onClick={() => desfazer(m)}
                aria-label="Desfazer lançamento"
                className="text-gray-400"
              >
                <X size={18} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// Formulário de entrada, saída ou contagem.
function FormMovimento({
  item,
  modo,
  saldo,
  aoConcluir,
}: {
  item: ItemDeEstoque
  modo: Modo
  saldo: number | undefined
  aoConcluir: () => void
}) {
  const motivosDeSaida: MotivoEstoque[] =
    item.alvo === 'material' ? ['consumo', 'perda'] : ['venda', 'perda']
  const [quantidade, setQuantidade] = useState<number | null>(null)
  const [motivoSaida, setMotivoSaida] = useState<MotivoEstoque>(motivosDeSaida[0])
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  const titulo =
    modo === 'entrada'
      ? item.alvo === 'produto'
        ? 'Entrada: produzi mais peças'
        : 'Entrada: comprei mais'
      : modo === 'saida'
        ? 'Saída'
        : 'Contagem: quanto você tem agora?'

  async function salvar() {
    if (quantidade === null) {
      setErro('Informe a quantidade.')
      return
    }
    const q = item.alvo === 'produto' ? Math.floor(quantidade) : quantidade
    const atual = saldo ?? 0

    let delta: number
    let motivo: MotivoEstoque

    if (modo === 'contagem') {
      delta = q - atual
      motivo = 'ajuste'
      if (Math.abs(delta) < 0.001) {
        setErro('O saldo já é esse.')
        return
      }
    } else {
      if (q <= 0) {
        setErro('A quantidade precisa ser maior que zero.')
        return
      }
      if (modo === 'entrada') {
        delta = q
        motivo = item.alvo === 'produto' ? 'producao' : 'compra'
      } else {
        delta = -q
        motivo = motivoSaida
        if (
          atual + delta < -0.001 &&
          !confirm('Isso deixa o saldo negativo. Continuar mesmo assim?')
        ) {
          return
        }
      }
    }

    await db.movimentos.add({
      alvo: item.alvo,
      alvoId: item.id,
      quantidade: delta,
      motivo,
      observacao: observacao.trim() || undefined,
      criadoEm: new Date().toISOString(),
    })
    aoConcluir()
  }

  return (
    <section className={cartao}>
      <h3 className="font-semibold text-gray-800">{titulo}</h3>

      {modo === 'saida' && (
        <div className="flex flex-wrap gap-2">
          {motivosDeSaida.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivoSaida(m)}
              className={motivoSaida === m ? chipAtivo : chip}
            >
              {m === 'consumo' ? 'Usei' : m === 'venda' ? 'Vendi ou entreguei' : 'Perdi ou estragou'}
            </button>
          ))}
        </div>
      )}

      <CampoQuantidade
        tipo={item.tipo}
        permitirZero={modo === 'contagem'}
        aoMudar={setQuantidade}
      />

      <label className="block text-sm text-gray-600">
        Observação (opcional)
        <input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: comprado na Central Aviamentos"
          className={campo}
        />
      </label>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button type="button" onClick={salvar} className={botaoPrincipal}>
        Salvar
      </button>
      <button type="button" onClick={aoConcluir} className={botaoCinza}>
        Cancelar
      </button>
    </section>
  )
}