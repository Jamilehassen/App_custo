import { ClipboardList, Package, Store, Users, Menu } from 'lucide-react'

export type Aba = 'pedidos' | 'produtos' | 'feira' | 'clientes' | 'mais'

const abas = [
  { id: 'pedidos', rotulo: 'Pedidos', Icone: ClipboardList },
  { id: 'feira', rotulo: 'Feira', Icone: Store },
  { id: 'produtos', rotulo: 'Produtos', Icone: Package },
  { id: 'clientes', rotulo: 'Clientes', Icone: Users },
  { id: 'mais', rotulo: 'Mais', Icone: Menu },
] as const

type Props = {
  abaAtiva: Aba
  aoMudar: (aba: Aba) => void
}

export default function BottomNav({ abaAtiva, aoMudar }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <ul className="mx-auto flex max-w-md">
        {abas.map(({ id, rotulo, Icone }) => {
          const ativa = id === abaAtiva
          return (
            <li key={id} className="flex-1">
              <button
                onClick={() => aoMudar(id)}
                className={`flex w-full flex-col items-center gap-1 py-3 text-xs ${
                  ativa ? 'font-semibold text-rose-600' : 'text-gray-500'
                }`}
              >
                <Icone size={24} />
                {rotulo}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}