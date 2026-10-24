import { Search } from 'lucide-react'

type Props = {
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
}

export default function CampoBusca({ valor, aoMudar, placeholder = 'Buscar...' }: Props) {
  return (
    <label className="relative block">
      <Search
        size={20}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-3 text-base"
      />
    </label>
  )
}