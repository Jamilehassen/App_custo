import { useState, type ReactNode } from 'react'
import BottomNav, { type Aba } from './components/BottomNav'
import Feiras from './screens/Feiras'
import Mais from './screens/Mais'
import Produtos from './screens/Produtos'
import Clientes from './screens/Clientes'
import Pedidos from './screens/Pedidos'

// 1. Importação da sua logo (certifique-se de que o nome do ficheiro está igual ao que colocou na pasta assets)
import logo from './assets/logo.png'

const titulos: Record<Aba, string> = {
  pedidos: 'Pedidos',
  produtos: 'Produtos',
  feira: 'Feira',
  clientes: 'Clientes',
  mais: 'Mais',
}

const telas: Partial<Record<Aba, ReactNode>> = {
  produtos: <Produtos />,
  feira: <Feiras />,
  mais: <Mais />,
  clientes: <Clientes />,
  pedidos: <Pedidos />,
}

function App() {
  const [aba, setAba] = useState<Aba>('pedidos')

  return (
    <div className="min-h-screen bg-rose-50 pb-24">
      
      {/* 2. Cabeçalho atualizado com flexbox para alinhar a logo e o título lado a lado */}
      <header className="bg-rose-600 px-4 py-3 text-white flex items-center gap-3 shadow-sm">
        <img 
          src={logo} 
          alt="Artes da Lisa" 
          className="h-10 w-10 rounded-full bg-white object-cover p-9.0" 
        />
        <h1 className="text-xl font-bold">{titulos[aba]}</h1>
      </header>

      <main className="mx-auto max-w-md p-4">
        {telas[aba] ?? (
          <p className="text-gray-600">Aqui vai a tela de {titulos[aba]}.</p>
        )}
      </main>

      <BottomNav abaAtiva={aba} aoMudar={setAba} />
    </div>
  )
}

export default App