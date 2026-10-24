import { useState } from 'react'
import { db, type Cliente } from '../db'
import { formatarTelefone, soDigitos, telefoneValido } from '../lib/formato'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base'

type Props = {
  cliente?: Cliente // cliente cadastrado que foi escolhido
  nomeAnterior?: string // nome anotado em orçamentos antigos, só para ajudar
  obrigatorio: boolean // orçamento: precisa de cliente com nome e WhatsApp
  aoEscolherCadastrado: () => void
  aoEscolherNovo: (clienteId: number) => void
  aoTirarCliente: () => void
}

export default function ClienteDoOrcamento({
  cliente,
  nomeAnterior,
  obrigatorio,
  aoEscolherCadastrado,
  aoEscolherNovo,
  aoTirarCliente,
}: Props) {
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [whatsappFaltando, setWhatsappFaltando] = useState('')
  const [erro, setErro] = useState('')

  async function cadastrar() {
    const digitos = soDigitos(whatsapp)
    if (!nome.trim()) {
      setErro('Preencha o nome do cliente.')
      return
    }
    if (!telefoneValido(digitos)) {
      setErro('Digite o WhatsApp com DDD (10 ou 11 números).')
      return
    }

    // Evita cadastrar a mesma pessoa duas vezes.
    const existente = await db.clientes.filter((c) => c.whatsapp === digitos).first()
    if (existente && confirm(`Já existe "${existente.nome}" com esse WhatsApp. Usar esse cliente?`)) {
      setErro('')
      aoEscolherNovo(existente.id)
      return
    }

    const id = await db.clientes.add({
      nome: nome.trim(),
      whatsapp: digitos,
      criadoEm: new Date().toISOString(),
    })
    setNome('')
    setWhatsapp('')
    setErro('')
    aoEscolherNovo(id)
  }

  async function completarWhatsapp() {
    if (!cliente) return
    const digitos = soDigitos(whatsappFaltando)
    if (!telefoneValido(digitos)) {
      setErro('Digite o WhatsApp com DDD (10 ou 11 números).')
      return
    }
    await db.clientes.update(cliente.id, { whatsapp: digitos })
    setWhatsappFaltando('')
    setErro('')
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h3 className="font-semibold text-gray-800">Cliente</h3>

      {cliente ? (
        <>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 p-3">
            <span>
              <span className="block font-semibold text-gray-800">{cliente.nome}</span>
              {cliente.whatsapp && (
                <span className="block text-sm text-gray-600">
                  {formatarTelefone(cliente.whatsapp)}
                </span>
              )}
            </span>
            <span className="flex gap-3 text-sm">
              <button
                type="button"
                onClick={aoEscolherCadastrado}
                className="font-semibold text-rose-600"
              >
                Trocar
              </button>
              {!obrigatorio && (
                <button type="button" onClick={aoTirarCliente} className="text-gray-500">
                  Tirar
                </button>
              )}
            </span>
          </div>

          {!cliente.whatsapp && (
            <div className="space-y-2 rounded-xl bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                Este cliente está sem WhatsApp
              </p>
              <label className="block text-sm text-gray-700">
                WhatsApp (com DDD)
                <input
                  value={whatsappFaltando}
                  onChange={(e) => setWhatsappFaltando(e.target.value)}
                  inputMode="tel"
                  placeholder="11 99999-8888"
                  className={campo}
                />
              </label>
              <button
                type="button"
                onClick={completarWhatsapp}
                className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
              >
                Salvar WhatsApp
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={aoEscolherCadastrado}
            className="w-full rounded-lg border border-rose-600 p-3 text-base font-semibold text-rose-600"
          >
            Escolher cliente cadastrado
          </button>

          <div className="space-y-3 rounded-xl bg-rose-50 p-3">
            <p className="text-sm font-semibold text-gray-800">Cliente novo</p>

            {nomeAnterior && (
              <p className="text-xs text-gray-600">
                Nome anotado antes: <strong>{nomeAnterior}</strong>{' '}
                <button
                  type="button"
                  onClick={() => setNome(nomeAnterior)}
                  className="font-semibold text-rose-600"
                >
                  usar como nome
                </button>
              </p>
            )}

            <label className="block text-sm text-gray-600">
              Nome
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Maria Souza"
                className={campo}
              />
            </label>

            <label className="block text-sm text-gray-600">
              WhatsApp (com DDD)
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
                placeholder="11 99999-8888"
                className={campo}
              />
            </label>

            <button
              type="button"
              onClick={cadastrar}
              className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
            >
              Cadastrar e usar neste orçamento
            </button>
          </div>
        </>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  )
}