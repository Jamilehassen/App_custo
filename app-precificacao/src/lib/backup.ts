import { db } from '../db'
import { nomeDeArquivo } from './arquivos'

const APP = 'app-precificacao'
const FORMATO = 1 // versão do formato do arquivo de backup
const CHAVE_ULTIMO_BACKUP = 'ultimoBackup'

export type DadosBackup = Record<string, unknown[]>

export type Backup = {
  app: string
  formato: number
  exportadoEm: string
  dados: DadosBackup
}

// Nomes amigáveis [singular, plural] para mostrar o que tem dentro do backup.
const rotulos: Record<string, [string, string]> = {
  materiais: ['material', 'materiais'],
  custosFixos: ['custo fixo', 'custos fixos'],
  configuracao: ['configuração de trabalho', 'configurações de trabalho'],
  produtos: ['produto', 'produtos'],
  catalogo: ['item no catálogo', 'itens no catálogo'],
  loja: ['dado da loja', 'dados da loja'],
  clientes: ['cliente', 'clientes'],
  pedidos: ['pedido', 'pedidos'],
  feiras: ['feira', 'feiras'],
  vendasFeira: ['venda de feira', 'vendas de feira'],
  movimentos: ['movimento de estoque', 'movimentos de estoque'],
  avisosEstoque: ['aviso de estoque', 'avisos de estoque'],
}

// Junta TODAS as tabelas do banco em um arquivo só.
export async function gerarBackup(): Promise<File> {
  const dados: DadosBackup = {}
  for (const tabela of db.tables) {
    dados[tabela.name] = await tabela.toArray()
  }

  const backup: Backup = {
    app: APP,
    formato: FORMATO,
    exportadoEm: new Date().toISOString(),
    dados,
  }

  const dia = new Date().toISOString().slice(0, 10)
  return new File(
    [JSON.stringify(backup)],
    nomeDeArquivo(`backup precificacao ${dia}`, 'json'),
    { type: 'application/json' },
  )
}

// Lê o texto do arquivo e confere se é mesmo um backup deste app.
export function lerBackup(texto: string): Backup {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new Error('Esse arquivo não é um backup válido.')
  }

  const b = bruto as Partial<Backup> | null
  if (!b || b.app !== APP || typeof b.dados !== 'object' || b.dados === null) {
    throw new Error('Esse arquivo não é um backup deste app.')
  }
  if (typeof b.formato !== 'number' || b.formato > FORMATO) {
    throw new Error(
      'Esse backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.',
    )
  }

  // Só aproveita as tabelas que o app conhece.
  const dados: DadosBackup = {}
  for (const tabela of db.tables) {
    const linhas = (b.dados as Record<string, unknown>)[tabela.name]
    dados[tabela.name] = Array.isArray(linhas) ? linhas : []
  }

  const total = Object.values(dados).reduce((soma, l) => soma + l.length, 0)
  if (total === 0) throw new Error('Esse backup está vazio.')

  return {
    app: APP,
    formato: b.formato,
    exportadoEm: typeof b.exportadoEm === 'string' ? b.exportadoEm : '',
    dados,
  }
}

// Ex.: ["12 materiais", "8 produtos"]
export function resumirBackup(backup: Backup): string[] {
  return Object.entries(backup.dados)
    .filter(([, linhas]) => linhas.length > 0)
    .map(([nome, linhas]) => {
      const rotulo = rotulos[nome]
      const texto = rotulo ? rotulo[linhas.length === 1 ? 0 : 1] : nome
      return `${linhas.length} ${texto}`
    })
}

// Troca TODOS os dados atuais pelos do backup, de uma vez só:
// se algo falhar no meio, nada muda.
export async function restaurarBackup(backup: Backup) {
  await db.transaction('rw', db.tables, async () => {
    for (const tabela of db.tables) {
      await tabela.clear()
      const linhas = backup.dados[tabela.name] ?? []
      if (linhas.length > 0) await tabela.bulkAdd(linhas)
    }
  })
}

export function lerUltimoBackup(): Date | null {
  try {
    const valor = localStorage.getItem(CHAVE_ULTIMO_BACKUP)
    return valor ? new Date(valor) : null
  } catch {
    return null
  }
}

export function registrarBackupFeito() {
  try {
    localStorage.setItem(CHAVE_ULTIMO_BACKUP, new Date().toISOString())
  } catch {
    // sem armazenamento disponível: o backup vale, só não há lembrete
  }
}