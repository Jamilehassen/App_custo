import { useState, type ChangeEvent } from 'react'
import Cabecalho from '../components/Cabecalho'
import { baixarArquivo, compartilharArquivo, podeCompartilhar } from '../lib/arquivos'
import {
  gerarBackup,
  lerBackup,
  lerUltimoBackup,
  registrarBackupFeito,
  restaurarBackup,
  resumirBackup,
  type Backup as DadosDoBackup,
} from '../lib/backup'

const botaoPrincipal =
  'w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white disabled:opacity-40'
const botaoVerde = 'w-full rounded-lg bg-green-600 p-3 text-base font-semibold text-white'
const botaoSecundario =
  'w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600'
const botaoCinza =
  'w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700'

function formatarData(data: Date) {
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Backup({ aoVoltar }: { aoVoltar: () => void }) {
  const [ultimo, setUltimo] = useState<Date | null>(lerUltimoBackup())
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [gerando, setGerando] = useState(false)
  const [lido, setLido] = useState<DadosDoBackup | null>(null)
  const [restaurando, setRestaurando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  function concluir() {
    registrarBackupFeito()
    setUltimo(new Date())
    setMensagem(
      'Backup salvo! Guarde esse arquivo em um lugar seguro: mande para você mesma no WhatsApp, por e-mail ou salve no Google Drive.',
    )
  }

  async function criar() {
    setErro('')
    setMensagem('')
    setGerando(true)
    try {
      setArquivo(await gerarBackup())
    } catch {
      setErro('Não foi possível gerar o backup. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  async function enviar(f: File) {
    setErro('')
    try {
      const enviado = await compartilharArquivo(f, 'Backup do app de precificação')
      if (enviado) concluir()
    } catch {
      setErro('Não foi possível compartilhar. Use o botão "Baixar backup".')
    }
  }

  function baixar(f: File) {
    baixarArquivo(f)
    concluir()
  }

  async function escolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const entrada = e.target
    const f = entrada.files?.[0]
    if (!f) return

    setErro('')
    setMensagem('')
    setLido(null)
    try {
      setLido(lerBackup(await f.text()))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.')
    } finally {
      entrada.value = '' // permite escolher o mesmo arquivo de novo
    }
  }

  async function restaurar() {
    if (!lido) return
    setRestaurando(true)
    setErro('')
    try {
      await restaurarBackup(lido)
      setLido(null)
      setMensagem('Dados restaurados com sucesso!')
    } catch {
      setErro('Não foi possível restaurar. Seus dados atuais não foram alterados.')
    } finally {
      setRestaurando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Cabecalho titulo="Backup dos dados" aoVoltar={aoVoltar} />

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <h3 className="font-semibold text-gray-800">Guardar uma cópia</h3>
        <p className="text-sm text-gray-600">
          Seus dados ficam só neste aparelho. O backup é um arquivo com tudo (materiais,
          produtos, catálogo com fotos e dados da loja) para você guardar em segurança.
        </p>
        <p className="text-sm text-gray-800">
          Último backup:{' '}
          <strong className={ultimo ? 'text-gray-800' : 'text-amber-700'}>
            {ultimo ? formatarData(ultimo) : 'nunca foi feito'}
          </strong>
        </p>

        {!arquivo ? (
          <button type="button" onClick={criar} disabled={gerando} className={botaoPrincipal}>
            {gerando ? 'Preparando o backup...' : 'Gerar backup agora'}
          </button>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Backup pronto: <strong>{arquivo.name}</strong> (
              {(arquivo.size / 1048576).toLocaleString('pt-BR', {
                maximumFractionDigits: 1,
              })}{' '}
              MB)
            </p>
            {podeCompartilhar(arquivo) && (
              <button type="button" onClick={() => enviar(arquivo)} className={botaoVerde}>
                Enviar (WhatsApp, e-mail, Drive...)
              </button>
            )}
            <button type="button" onClick={() => baixar(arquivo)} className={botaoSecundario}>
              Baixar backup
            </button>
            <button
              type="button"
              onClick={() => setArquivo(null)}
              className="w-full p-2 text-sm text-gray-500"
            >
              Gerar de novo
            </button>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <h3 className="font-semibold text-gray-800">Restaurar de um backup</h3>
        <p className="text-sm text-gray-600">
          Use quando trocar de celular ou se perder os dados. Escolha o arquivo de backup e
          confira o que tem dentro antes de confirmar.
        </p>

        {!lido ? (
          <label className="block w-full cursor-pointer rounded-lg border border-rose-600 p-3 text-center text-base font-semibold text-rose-600">
            <input
              type="file"
              accept=".json,application/json"
              onChange={escolherArquivo}
              className="hidden"
            />
            Escolher arquivo de backup
          </label>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">
                Backup
                {lido.exportadoEm && ` de ${formatarData(new Date(lido.exportadoEm))}`}
              </p>
              <p className="mt-1">{resumirBackup(lido).join(', ')}.</p>
              <p className="mt-2">
                Restaurar <strong>substitui todos os dados atuais</strong> deste aparelho
                por esses.
              </p>
            </div>
            <button
              type="button"
              onClick={restaurar}
              disabled={restaurando}
              className={botaoPrincipal}
            >
              {restaurando ? 'Restaurando...' : 'Restaurar estes dados'}
            </button>
            <button type="button" onClick={() => setLido(null)} className={botaoCinza}>
              Cancelar
            </button>
          </div>
        )}
      </section>

      {mensagem && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{mensagem}</p>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  )
}