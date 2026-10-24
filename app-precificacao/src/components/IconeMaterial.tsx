import { Droplet, Hash, Ruler, Square, Weight } from 'lucide-react'
import type { TipoMedida } from '../db'

const icones = {
  unidade: Hash,
  comprimento: Ruler,
  area: Square,
  peso: Weight,
  volume: Droplet,
}

export default function IconeMaterial({ tipo }: { tipo: TipoMedida }) {
  const Icone = icones[tipo]
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
      <Icone size={22} />
    </span>
  )
}