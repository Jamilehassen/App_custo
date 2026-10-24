import { useState } from 'react'
import type { TipoMedida } from '../db'
import { formatarQuantidade, unidadesDeEntrada } from '../lib/estoque'
import { paraNumero } from '../lib/formato'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'

type Props = {
  tipo: TipoMedida
  permitirZero?: boolean // na contagem, "zero" é uma resposta válida
  aoMudar: (valor: number | null) => void // devolve na unidade de uso, ou null se estiver incompleto
}

export default function CampoQuantidade({ tipo, permitirZero = false, aoMudar }: Props) {
  const unidades = unidadesDeEntrada(tipo)
  const [texto, setTexto] = useState(tipo === 'area' ? '1' : '')
  const [unidadeId, setUnidadeId] = useState(unidades[0].id)
  const [largura, setLargura] = useState('')
  const [altura, setAltura] = useState('')

  function calcular(t: string, uid: string, l: string, a: string): number | null {
    if (t.trim() === '') return null
    const n = paraNumero(t)
    if (n < 0) return null

    let valor: number | null
    if (tipo === 'area') {
      // Tecido: largura × altura de cada pedaço × quantos pedaços.
      const area = paraNumero(l) * paraNumero(a)
      valor = area > 0 ? area * n : n === 0 ? 0 : null
    } else {
      valor = n * (unidades.find((u) => u.id === uid)?.fator ?? 1)
    }

    if (valor === null) return null
    return valor > 0 || (permitirZero && valor === 0) ? valor : null
  }

  const valor = calcular(texto, unidadeId, largura, altura)

  function atualizar(
    novo: Partial<{ texto: string; unidadeId: string; largura: string; altura: string }>,
  ) {
    const t = novo.texto ?? texto
    const uid = novo.unidadeId ?? unidadeId
    const l = novo.largura ?? largura
    const a = novo.altura ?? altura
    setTexto(t)
    setUnidadeId(uid)
    setLargura(l)
    setAltura(a)
    aoMudar(calcular(t, uid, l, a))
  }

  return (
    <div className="space-y-3">
      {tipo === 'area' && (
        <div className="flex gap-3">
          <label className="block flex-1 text-sm text-gray-600">
            Largura do pedaço (cm)
            <input
              value={largura}
              onChange={(e) => atualizar({ largura: e.target.value })}
              inputMode="decimal"
              placeholder="140"
              className={campo}
            />
          </label>
          <label className="block flex-1 text-sm text-gray-600">
            Altura do pedaço (cm)
            <input
              value={altura}
              onChange={(e) => atualizar({ altura: e.target.value })}
              inputMode="decimal"
              placeholder="100"
              className={campo}
            />
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <label className="block flex-1 text-sm text-gray-600">
          {tipo === 'area' ? 'Quantos pedaços desse tamanho?' : 'Quantidade'}
          <input
            value={texto}
            onChange={(e) => atualizar({ texto: e.target.value })}
            inputMode="decimal"
            className={campo}
          />
        </label>

        {tipo !== 'area' && unidades.length > 1 && (
          <label className="block w-40 text-sm text-gray-600">
            Em
            <select
              value={unidadeId}
              onChange={(e) => atualizar({ unidadeId: e.target.value })}
              className={`${campo} bg-white`}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {valor !== null && (
        <p className="text-sm text-gray-600">
          Equivale a <strong>{formatarQuantidade(tipo, valor)}</strong>
        </p>
      )}
    </div>
  )
}