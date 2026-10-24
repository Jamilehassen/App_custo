import { useEffect, useState } from 'react'
import type { Loja, Pedido } from '../db'
import {
  baixarArquivo,
  compartilharArquivo,
  nomeDeArquivo,
  podeCompartilhar,
} from '../lib/arquivos'
import { gerarPdfOrcamento } from '../lib/orcamentoPdf'

type Props = {
  pedido: Pedido
  nomeCliente: string
  loja?: Loja
  aoFechar: () => void
}

export default function EnviarOrcamento({ pedido, nomeCliente, loja, aoFechar }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState('')

  // Gera o PDF assim que a folha abre.
  useEffect(() => {
    let ativo = true
    gerarPdfOrcamento(pedido, nomeCliente, loja)
      .then((blob) => {
        if (!ativo) return
        const nome = nomeDeArquivo(`orcamento ${pedido.id} ${nomeCliente}`, 'pdf')
        setArquivo(new File([blob], nome, { type: 'application/pdf' }))
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível gerar o PDF. Tente de novo.')
      })
    return () => {
      ativo = false
    }
  }, [pedido, nomeCliente, loja])

  async function compartilhar(f: File) {
    setErro('')
    try {
      await compartilharArquivo(f, `Orçamento para ${nomeCliente}`)
    } catch {
      setErro('Não foi possível compartilhar. Use o botão "Baixar PDF".')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={aoFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-t-3xl bg-white p-5 pb-8"
      >
        <h3 className="text-lg font-semibold text-gray-800">Orçamento para {nomeCliente}</h3>

        {!arquivo && !erro && <p className="text-sm text-gray-600">Gerando o PDF...</p>}

        {arquivo && (
          <>
            <p className="text-sm text-gray-600">
              PDF pronto: <strong>{arquivo.name}</strong>
            </p>
            {podeCompartilhar(arquivo) && (
              <button
                type="button"
                onClick={() => compartilhar(arquivo)}
                className="w-full rounded-lg bg-green-600 p-3 text-base font-semibold text-white"
              >
                Compartilhar (WhatsApp e outros)
              </button>
            )}
            <button
              type="button"
              onClick={() => baixarArquivo(arquivo)}
              className="w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600"
            >
              Baixar PDF
            </button>
          </>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="button"
          onClick={aoFechar}
          className="w-full p-2 text-sm font-semibold text-gray-600"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}