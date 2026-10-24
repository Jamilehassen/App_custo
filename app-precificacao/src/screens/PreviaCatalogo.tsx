import { useState } from 'react'
import { Image as IconeFoto } from 'lucide-react'
import type { Loja } from '../db'
import { formatarReais, formatarTelefone } from '../lib/formato'
import { gerarPdfCatalogo, type EntradaCatalogo } from '../lib/catalogoPdf'
import {
  baixarArquivo,
  compartilharArquivo,
  nomeDeArquivo,
  podeCompartilhar,
} from '../lib/arquivos'
import Cabecalho from '../components/Cabecalho'

type Props = {
  loja?: Loja
  entradas: EntradaCatalogo[]
  aoVoltar: () => void
}

const botaoPrincipal =
  'w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white disabled:opacity-40'
const botaoVerde =
  'w-full rounded-lg bg-green-600 p-3 text-base font-semibold text-white'
const botaoSecundario =
  'w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600'

export default function PreviaCatalogo({ loja, entradas, aoVoltar }: Props) {
  const [pdf, setPdf] = useState<File | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  const semFoto = entradas.filter((e) => !e.item.foto).length

  async function gerar() {
    setGerando(true)
    setErro('')
    try {
      const blob = await gerarPdfCatalogo(loja, entradas)
      const nome = nomeDeArquivo(`catalogo ${loja?.nome ?? ''}`, 'pdf')
      setPdf(new File([blob], nome, { type: 'application/pdf' }))
    } catch {
      setErro('Não foi possível gerar o PDF. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  async function compartilhar(arquivo: File) {
    setErro('')
    try {
      await compartilharArquivo(arquivo, loja?.nome || 'Catálogo')
    } catch {
      setErro('Não foi possível compartilhar. Use o botão "Baixar PDF".')
    }
  }

  return (
    <div className="space-y-4">
      <Cabecalho titulo="Prévia do catálogo" aoVoltar={aoVoltar} />

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <h3 className="font-semibold text-gray-800">Enviar para os clientes</h3>

        {!pdf ? (
          <>
            <p className="text-sm text-gray-600">
              Gere um PDF com foto, descrição, preço e um botão &quot;Pedir pelo
              WhatsApp&quot; em cada produto.
            </p>
            {!loja?.whatsapp && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Sem o WhatsApp da loja, o PDF sai sem o botão &quot;Pedir pelo
                WhatsApp&quot;. Preencha em &quot;Minha loja&quot;.
              </p>
            )}
            {semFoto > 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                {semFoto === 1
                  ? '1 produto está sem foto.'
                  : `${semFoto} produtos estão sem foto.`}{' '}
                Eles saem com um quadrado rosa no lugar.
              </p>
            )}
            <button
              type="button"
              onClick={gerar}
              disabled={gerando || entradas.length === 0}
              className={botaoPrincipal}
            >
              {gerando ? 'Gerando o PDF...' : 'Gerar PDF do catálogo'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              PDF pronto: <strong>{pdf.name}</strong> (
              {(pdf.size / 1048576).toLocaleString('pt-BR', {
                maximumFractionDigits: 1,
              })}{' '}
              MB)
            </p>
            {podeCompartilhar(pdf) && (
              <button
                type="button"
                onClick={() => compartilhar(pdf)}
                className={botaoVerde}
              >
                Compartilhar (WhatsApp e outros)
              </button>
            )}
            <button
              type="button"
              onClick={() => baixarArquivo(pdf)}
              className={botaoSecundario}
            >
              Baixar PDF
            </button>
            <button
              type="button"
              onClick={() => setPdf(null)}
              className="w-full p-2 text-sm text-gray-500"
            >
              Gerar de novo
            </button>
          </>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </section>

      <header className="rounded-2xl bg-white p-4 text-center shadow">
        <h2 className="text-xl font-bold text-rose-600">{loja?.nome || 'Meu catálogo'}</h2>
        {loja?.apresentacao && (
          <p className="mt-1 text-sm text-gray-600">{loja.apresentacao}</p>
        )}
        {loja?.whatsapp && (
          <p className="mt-2 text-sm text-gray-800">
            WhatsApp: {formatarTelefone(loja.whatsapp)}
          </p>
        )}
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {entradas.map(({ produto, item, preco }) => (
          <li key={produto.id} className="overflow-hidden rounded-2xl bg-white shadow">
            {item.foto ? (
              <img
                src={item.foto}
                alt={produto.nome}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-rose-100 text-rose-400">
                <IconeFoto size={36} />
              </div>
            )}
            <div className="space-y-1 p-3">
              <p className="font-semibold text-gray-800">{produto.nome}</p>
              {item.descricao && (
                <p className="line-clamp-3 text-xs text-gray-600">{item.descricao}</p>
              )}
              <p className="font-bold text-rose-600">
                {preco !== null ? formatarReais(preco) : '—'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}