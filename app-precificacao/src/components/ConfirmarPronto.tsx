import { useState } from 'react'
import type { Material, Pedido, Produto } from '../db'
import { formatarQuantidade } from '../lib/estoque'
import {
  linhasParaMarcarPronto,
  materiaisDaProducao,
  somarMateriais,
  type ProducaoConfirmada,
} from '../lib/estoquePedidos'
import { paraNumero } from '../lib/formato'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'

type Props = {
  pedido: Pedido
  produtos: Produto[]
  materiais: Material[]
  disponivelDe: (produtoId: number) => number
  saldoDeMaterial: (materialId: number) => number | undefined
  aoConfirmar: (producao: ProducaoConfirmada) => void
  aoSemEstoque: () => void
  aoFechar: () => void
}

export default function ConfirmarPronto({
  pedido,
  produtos,
  materiais,
  disponivelDe,
  saldoDeMaterial,
  aoConfirmar,
  aoSemEstoque,
  aoFechar,
}: Props) {
  const linhas = linhasParaMarcarPronto(pedido, produtos, disponivelDe)
  const [quantidades, setQuantidades] = useState<Record<number, string>>(() =>
    Object.fromEntries(linhas.map((l) => [l.produtoId, String(l.sugerido)])),
  )
  const [baixar, setBaixar] = useState(true)

  const escolhidas = linhas.map((l) => ({
    produtoId: l.produtoId,
    quantidade: Math.max(0, Math.floor(paraNumero(quantidades[l.produtoId] ?? '0'))),
  }))

  // Materiais que a produção vai gastar (só os que ela já controla no estoque).
  const gastos = [
    ...somarMateriais(
      escolhidas.flatMap((e) => {
        const produto = produtos.find((p) => p.id === e.produtoId)
        return produto && e.quantidade > 0 ? [materiaisDaProducao(produto, e.quantidade)] : []
      }),
    ).entries(),
  ].flatMap(([id, total]) => {
    const material = materiais.find((m) => m.id === id)
    const saldo = saldoDeMaterial(id)
    return material && saldo !== undefined ? [{ material, total, saldo }] : []
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={aoFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-8"
      >
        <h3 className="text-lg font-semibold text-gray-800">Marcar como pronto</h3>
        <p className="text-sm text-gray-600">
          Quantas peças você produziu agora para este pedido? O app dá entrada nelas no estoque.
          Se já tinha pronto, deixe 0.
        </p>

        <ul className="space-y-3">
          {linhas.map((l) => (
            <li key={l.produtoId} className="rounded-xl bg-rose-50 p-3">
              <p className="font-semibold text-gray-800">{l.descricao}</p>
              <p className="text-xs text-gray-600">
                Precisa de {l.necessario} · disponível: {l.disponivel}
              </p>
              <label className="mt-2 block text-sm text-gray-600">
                Produzi agora
                <input
                  value={quantidades[l.produtoId] ?? ''}
                  onChange={(e) =>
                    setQuantidades((atual) => ({ ...atual, [l.produtoId]: e.target.value }))
                  }
                  inputMode="numeric"
                  className={campo}
                />
              </label>
            </li>
          ))}
        </ul>

        {gastos.length > 0 && (
          <div className="space-y-2 rounded-xl border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={baixar}
                onChange={(e) => setBaixar(e.target.checked)}
                className="h-5 w-5"
              />
              Baixar os materiais do estoque
            </label>
            {baixar && (
              <ul className="space-y-1 text-sm text-gray-700">
                {gastos.map(({ material, total, saldo }) => (
                  <li key={material.id} className="flex justify-between gap-3">
                    <span>{material.nome}</span>
                    <span>
                      −{formatarQuantidade(material.tipoMedida, total)}{' '}
                      <span className="text-xs text-gray-500">
                        (tem {formatarQuantidade(material.tipoMedida, saldo)})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500">
              Só entram os materiais que você já controla no estoque.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            aoConfirmar({ linhas: escolhidas, baixarMateriais: baixar, produtos })
          }
          className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
        >
          Confirmar e marcar como pronto
        </button>
        <button
          type="button"
          onClick={aoSemEstoque}
          className="w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600"
        >
          Marcar como pronto sem mexer no estoque
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}