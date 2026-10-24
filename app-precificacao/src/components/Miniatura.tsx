import { Image as IconeFoto } from 'lucide-react'

export default function Miniatura({ foto }: { foto?: string }) {
  return foto ? (
    <img src={foto} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
  ) : (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-400">
      <IconeFoto size={24} />
    </span>
  )
}