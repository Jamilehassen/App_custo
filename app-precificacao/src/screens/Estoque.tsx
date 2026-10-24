import { useState } from 'react'
import { Package } from 'lucide-react'
import type { AlvoEstoque, TipoMedida } from '../db'
import { filtrar } from '../lib/busca'
import {
  formatarSaldo,
  nivelDoEstoque,
  precisaDeAtencao,
  type NivelDoEstoque,
} from '../lib/estoque'
import { useEstoque } from '../lib/useEstoque'
import Cabecalho from '../components/Cabecalho'
import CampoBusca from '../components/CampoBusca'
import IconeMaterial from '../components/IconeMaterial'
import DetalheEstoque from './DetalheEstoque'

type Linha = {
  alvo: AlvoEstoque
  id: number
  nome: string
  tipo: TipoMedida
  saldo: number | undefined
  minimo: number | undefined
  nivel: NivelDoEstoque
}

// Quem precisa de atenção aparece primeiro.
const ORDEM: Record<NivelDoEstoque, number> = {
  zerado: 0,
  baixo: 1,
  ok: 2,
  'sem-controle': 3,
}

const CHIP_DO_NIVEL: Partial<Record<NivelDoEstoque, { texto: string; classes: string }>> = {
  zerado: { texto: 'Sem estoque', classes: 'bg-red-100 text-red-700' },
  baixo: { texto: 'Estoque baixo', classes: 'bg-amber-100 text-amber-800' },
}

export default function Estoque({ aoVoltar }: { aoVoltar: () => void }) {
  const dados = useEstoque()
  const [aba, setAba] = useState<AlvoEstoque>('material')
  const [busca, setBusca] = useState('')
  const [apenasAtencao, setApenasAtencao] = useState(false)
  const [aberto, setAberto] = useState<{ alvo: AlvoEstoque; id: number } | null>(null)

  if (!dados) return null

  function montar(alvo: AlvoEstoque, id: number, nome: string, tipo: TipoMedida): Linha {
    const saldo = dados!.saldoDe(alvo, id)
    const minimo = dados!.minimoDe(alvo, id)
    return { alvo, id, nome, tipo, saldo, minimo, nivel: nivelDoEstoque(saldo, minimo) }
  }

  const materiais = dados.materiais.map((m) => montar('material', m.id, m.nome, m.tipoMedida))
  const produtos = dados.produtos.map((p) => montar('produto', p.id, p.nome, 'unidade'))

  const selecionado = aberto
    ? [...materiais, ...produtos].find((l) => l.alvo === aberto.alvo && l.id === aberto.id)
    : undefined

  if (selecionado) {
    return (
      <DetalheEstoque
        item={{
          alvo: selecionado.alvo,
          id: selecionado.id,
          nome: selecionado.nome,
          tipo: selecionado.tipo,
        }}
        saldo={selecionado.saldo}
        minimo={selecionado.minimo}
        movimentos={dados.movimentos.filter(
          (m) => m.alvo === selecionado.alvo && m.alvoId === selecionado.id,
        )}
        aoVoltar={() => setAberto(null)}
      />
    )
  }

  const daAba = aba === 'material' ? materiais : produtos
  const atencaoNaAba = daAba.filter((l) => precisaDeAtencao(l.nivel)).length
  const atencaoMateriais = materiais.filter((l) => precisaDeAtencao(l.nivel)).length
  const atencaoProdutos = produtos.filter((l) => precisaDeAtencao(l.nivel)).length

  const visiveis = filtrar(
    daAba.filter((l) => !apenasAtencao || precisaDeAtencao(l.nivel)),
    busca,
    (l) => [l.nome],
  ).sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel] || a.nome.localeCompare(b.nome, 'pt-BR'))

  return (
    <div className="space-y-4">
      <Cabecalho titulo="Estoque" aoVoltar={aoVoltar} />

      <div className="flex rounded-lg bg-white p-1 shadow">
        {(
          [
            ['material', 'Materiais', atencaoMateriais],
            ['produto', 'Produtos prontos', atencaoProdutos],
          ] as const
        ).map(([id, rotulo, atencao]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex-1 rounded-md p-2 text-sm font-semibold ${
              aba === id ? 'bg-rose-600 text-white' : 'text-gray-600'
            }`}
          >
            {rotulo}
            {atencao > 0 && ` (${atencao})`}
          </button>
        ))}
      </div>

      <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar..." />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setApenasAtencao(false)}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            !apenasAtencao
              ? 'border-rose-600 bg-rose-50 font-semibold text-rose-600'
              : 'border-gray-300 text-gray-700'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setApenasAtencao(true)}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            apenasAtencao
              ? 'border-rose-600 bg-rose-50 font-semibold text-rose-600'
              : 'border-gray-300 text-gray-700'
          }`}
        >
          Precisam de atenção{atencaoNaAba > 0 && ` (${atencaoNaAba})`}
        </button>
      </div>

      {daAba.length === 0 && (
        <p className="text-gray-500">
          {aba === 'material'
            ? 'Você ainda não cadastrou nenhum material.'
            : 'Você ainda não cadastrou nenhum produto.'}
        </p>
      )}
      {daAba.length > 0 && visiveis.length === 0 && (
        <p className="text-gray-500">
          {apenasAtencao && !busca ? 'Nada precisa de atenção agora.' : 'Nada encontrado.'}
        </p>
      )}

      <ul className="space-y-2">
        {visiveis.map((l) => {
          const chipDoNivel = CHIP_DO_NIVEL[l.nivel]
          return (
            <li key={`${l.alvo}-${l.id}`}>
              <button
                type="button"
                onClick={() => setAberto({ alvo: l.alvo, id: l.id })}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow"
              >
                {l.alvo === 'material' ? (
                  <IconeMaterial tipo={l.tipo} />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <Package size={22} />
                  </span>
                )}
                <span className="flex-1">
                  <span className="block font-semibold text-gray-800">{l.nome}</span>
                  <span className="block text-sm text-gray-600">
                    {l.saldo !== undefined
                      ? formatarSaldo(l.alvo, l.tipo, l.saldo)
                      : 'Sem registro de estoque'}
                  </span>
                </span>
                {chipDoNivel && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${chipDoNivel.classes}`}
                  >
                    {chipDoNivel.texto}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}