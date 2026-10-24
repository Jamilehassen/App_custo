import { useState, type FormEvent } from 'react'
import { db, type Cliente } from '../db'
import { formatarTelefone, soDigitos, telefoneValido } from '../lib/formato'
import Cabecalho from '../components/Cabecalho'
import PedidosDoCliente from '../components/PedidosDoCliente'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'

type Props = {
  inicial?: Cliente
  aoFechar: () => void
}

export default function EditarCliente({ inicial, aoFechar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(
    inicial?.whatsapp ? formatarTelefone(inicial.whatsapp) : '',
  )
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const digitos = soDigitos(whatsapp)

    if (!nome.trim()) {
      setErro('Preencha o nome do cliente.')
      return
    }
    if (digitos && !telefoneValido(digitos)) {
      setErro('Digite o WhatsApp com DDD (10 ou 11 números).')
      return
    }

    const dados = {
      nome: nome.trim(),
      whatsapp: digitos || undefined,
      observacoes: observacoes.trim() || undefined,
    }

    if (inicial) {
      await db.clientes.put({ ...inicial, ...dados })
    } else {
      await db.clientes.add({ ...dados, criadoEm: new Date().toISOString() })
    }
    aoFechar()
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Cabecalho
        titulo={inicial ? 'Editar cliente' : 'Novo cliente'}
        aoVoltar={aoFechar}
      />

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
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
          WhatsApp (com DDD, opcional)
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            placeholder="11 99999-8888"
            className={campo}
          />
        </label>

        <label className="block text-sm text-gray-600">
          Observações (opcional)
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            maxLength={300}
            placeholder="Ex.: Prefere tecido floral. Aniversário em março."
            className={campo}
          />
        </label>
      </div>
      
      {inicial && <PedidosDoCliente clienteId={inicial.id} />}
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        Salvar cliente
      </button>
      <button
        type="button"
        onClick={aoFechar}
        className="w-full rounded-lg border border-gray-300 p-3 text-base font-semibold text-gray-700"
      >
        Cancelar
      </button>
    </form>
  )
}