import { ArrowLeft } from 'lucide-react'

export default function Cabecalho({
  titulo,
  aoVoltar,
}: {
  titulo: string
  aoVoltar: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={aoVoltar}
        aria-label="Voltar"
        className="p-2 text-gray-600"
      >
        <ArrowLeft size={24} />
      </button>
      <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
    </div>
  )
}