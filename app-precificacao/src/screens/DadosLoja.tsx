import { useState, type FormEvent } from 'react'
import { db, type Loja } from '../db'
import Cabecalho from '../components/Cabecalho'

const campo = 'mt-1 w-full rounded-lg border border-gray-300 p-3 text-base'

export default function DadosLoja({
  loja,
  aoVoltar,
}: {
  loja?: Loja
  aoVoltar: () => void
}) {
  const [nome, setNome] = useState(loja?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(loja?.whatsapp ?? '')
  const [apresentacao, setApresentacao] = useState(loja?.apresentacao ?? '')
  const [condicoes, setCondicoes] = useState(loja?.condicoesOrcamento ?? '')
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const digitos = whatsapp.replace(/\D/g, '')

    if (!nome.trim()) {
      setErro('Dê um nome para a sua loja.')
      return
    }
    if (digitos && digitos.length !== 10 && digitos.length !== 11) {
      setErro('Digite o WhatsApp com DDD (10 ou 11 números).')
      return
    }

    await db.loja.put({
      id: 1,
      nome: nome.trim(),
      whatsapp: digitos,
      apresentacao: apresentacao.trim() || undefined,
      condicoesOrcamento: condicoes.trim() || undefined,
    })
    aoVoltar()
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Cabecalho titulo="Minha loja" aoVoltar={aoVoltar} />

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow">
        <label className="block text-sm text-gray-600">
          Nome da loja
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Ateliê da Maria"
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

        <label className="block text-sm text-gray-600">
          Frase de apresentação (opcional)
          <textarea
            value={apresentacao}
            onChange={(e) => setApresentacao(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="Ex.: Costuras criativas feitas à mão com carinho"
            className={campo}
          />
        </label>

        <label className="block text-sm text-gray-600">
          Condições do orçamento (opcional)
          <textarea
            value={condicoes}
            onChange={(e) => setCondicoes(e.target.value)}
            rows={4}
            maxLength={400}
            placeholder="Ex.: Pagamento: 50% de sinal no Pix e o restante na entrega. Peças feitas sob encomenda."
            className={campo}
          />
        </label>
        <p className="text-xs text-gray-500">
          Esse texto sai no final do PDF de todo orçamento.
        </p>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-rose-600 p-3 text-base font-semibold text-white"
      >
        Salvar
      </button>
    </form>
  )
}