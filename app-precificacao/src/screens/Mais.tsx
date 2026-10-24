import { useState } from 'react'
import {
  BookOpen,
  Boxes,
  ChevronRight,
  DatabaseBackup,
  Scissors,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import Cabecalho from '../components/Cabecalho'
import { lerUltimoBackup } from '../lib/backup'
import { useEstoque } from '../lib/useEstoque'
import CustosFixos from './CustosFixos'
import Catalogo from './Catalogo'
import Backup from './Backup'
import Estoque from './Estoque'
import Materiais from './Materiais'

type Secao = 'menu' | 'materiais' | 'estoque' | 'custos' | 'catalogo' | 'backup'

type Opcao = {
  id: Exclude<Secao, 'menu'>
  titulo: string
  descricao: string
  Icone: LucideIcon
  alerta?: boolean
}

// Mostra a data do último backup e avisa se está atrasado.
function descricaoDoBackup() {
  const ultimo = lerUltimoBackup()
  if (!ultimo) return { texto: 'Você ainda não fez nenhum backup', alerta: true }
  const dias = Math.floor((Date.now() - ultimo.getTime()) / 86400000)
  return {
    texto: `Último backup: ${ultimo.toLocaleDateString('pt-BR')}`,
    alerta: dias > 14,
  }
}

export default function Mais() {
  const [secao, setSecao] = useState<Secao>('menu')
  const estoque = useEstoque()

  if (secao === 'materiais') {
    return (
      <div className="space-y-4">
        <Cabecalho titulo="Materiais" aoVoltar={() => setSecao('menu')} />
        <Materiais />
      </div>
    )
  }

  if (secao === 'estoque') {
    return <Estoque aoVoltar={() => setSecao('menu')} />
  }

  if (secao === 'custos') {
    return (
      <div className="space-y-4">
        <Cabecalho titulo="Custos fixos e valor da hora" aoVoltar={() => setSecao('menu')} />
        <CustosFixos />
      </div>
    )
  }

  if (secao === 'catalogo') {
    return <Catalogo aoVoltar={() => setSecao('menu')} />
  }

  if (secao === 'backup') {
    return <Backup aoVoltar={() => setSecao('menu')} />
  }

  const backup = descricaoDoBackup()
  const atencao = estoque?.precisamDeAtencao ?? 0
  const opcoes: Opcao[] = [
    {
      id: 'materiais',
      titulo: 'Materiais',
      descricao: 'Tecidos, aviamentos e o preço de cada um',
      Icone: Scissors,
    },
    {
      id: 'estoque',
      titulo: 'Estoque',
      descricao:
        atencao > 0
          ? `${atencao} ${atencao === 1 ? 'item precisa' : 'itens precisam'} de atenção`
          : 'Quanto você tem de cada material e produto',
      Icone: Boxes,
      alerta: atencao > 0,
    },
    {
      id: 'custos',
      titulo: 'Custos fixos e valor da hora',
      descricao: 'Luz, internet e quanto você quer ganhar',
      Icone: Wallet,
    },
    {
      id: 'catalogo',
      titulo: 'Catálogo',
      descricao: 'Fotos e preços para mostrar aos clientes',
      Icone: BookOpen,
    },
    {
      id: 'backup',
      titulo: 'Backup dos dados',
      descricao: backup.texto,
      Icone: DatabaseBackup,
      alerta: backup.alerta,
    },
  ]

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {opcoes.map(({ id, titulo, descricao, Icone, alerta }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => setSecao(id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Icone size={22} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-gray-800">{titulo}</span>
                <span
                  className={`block text-sm ${alerta ? 'font-semibold text-amber-700' : 'text-gray-500'}`}
                >
                  {descricao}
                </span>
              </span>
              <ChevronRight size={22} className="text-rose-600" />
            </button>
          </li>
        ))}
      </ul>

      <p className="pt-2 text-center text-xs text-gray-400">
        Versão do app:{' '}
        {new Date(__DATA_BUILD__).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </p>
    </div>
  )
}