import Dexie, { type EntityTable, type Table } from 'dexie'

export type TipoMedida = 'unidade' | 'comprimento' | 'area' | 'peso' | 'volume'

export type Material = {
  id: number
  nome: string
  observacoes?: string
  tipoMedida: TipoMedida
  precoCentavos: number // preço de 1 unidade, 1 metro, 1 m², 1 kg ou 1 litro
  unidade: string // unidade usada nas peças: un, cm, cm², g ou ml
  custoUnitarioCentavos: number // custo de 1 unidade de uso (pode ter fração)
  // Só para tecidos (tipo "área"): o tamanho inteiro e quanto custou.
  larguraCm?: number
  alturaCm?: number
  precoPagoCentavos?: number
}

export type CustoFixo = {
  id: number
  nome: string
  valorMensalCentavos: number
}

// Só existe 1 registro (id = 1) com os dados do trabalho dela.
export type Configuracao = {
  id: number
  retiradaDesejadaCentavos: number
  diasPorSemana: number
  horasPorDia: number
}

// Um item da "ficha técnica": qual material e quanto dele vai em 1 peça.
export type ItemFicha = {
  materialId: number
  quantidade: number // para tecido (área), é largura × altura em cm²
  larguraCm?: number // só para tecido: tamanho do pedaço usado
  alturaCm?: number
}

export type Produto = {
  id: number
  nome: string
  minutosProducao: number
  lucroPercent: number // lucro em cima do custo (pode passar de 100%)
  taxasPercent: number // taxas sobre o preço final
  materiais: ItemFicha[]
  precoPraticadoCentavos?: number // preço final editado à mão (opcional)
}

// Item do catálogo: um por produto (a chave é o próprio id do produto).
export type ItemCatalogo = {
  produtoId: number
  foto?: string // foto reduzida, guardada como texto (data URL)
  descricao?: string
}

// Dados da loja (só existe 1 registro, id = 1).
export type Loja = {
  id: number
  nome: string
  whatsapp: string // só números, com DDD
  apresentacao?: string
  condicoesOrcamento?: string // texto que sai no PDF do orçamento
}

// Cliente: quem compra da loja.
export type Cliente = {
  id: number
  nome: string
  whatsapp?: string // só números, com DDD
  observacoes?: string
  criadoEm: string // data do cadastro
}

export type StatusPedido = 'orcamento' | 'novo' | 'producao' | 'pronto' | 'entregue' | 'cancelado'

// Um item do pedido: produto cadastrado ou encomenda personalizada.
export type ItemPedido = {
  tipo: 'produto' | 'encomenda'
  produtoId?: number
  descricao: string // nome do produto, ou o que a cliente pediu
  quantidade: number
  precoUnitarioCentavos: number // fica gravado: mudar o produto depois não altera o pedido
  foto?: string // foto de referência (só nas encomendas)
}

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'debito'
  | 'credito'
  | 'transferencia'
  | 'outro'

export type Pedido = {
  id: number
  clienteId?: number // sem cliente = venda avulsa
  clienteAvulso?: string // nome rápido, ex.: "Cliente 1 - Feira Millenium"
  criadoEm: string
  prazoEntrega: string // 'AAAA-MM-DD'
  status: StatusPedido
  itens: ItemPedido[]
  pagoCentavos: number
  formaPagamento?: FormaPagamento
  validadeOrcamento?: string // só em orçamentos: até quando vale ('AAAA-MM-DD')
  prazoDias?: number // só em orçamentos: dias para entregar depois da aprovação
  observacoes?: string
}

// Um dia de feira (ex.: "Feira Lisboa Mall" em 25/10/2026).
export type Feira = {
  id: number
  nome: string
  data: string // 'AAAA-MM-DD'
}

export type ItemVenda = {
  produtoId?: number
  descricao: string
  quantidade: number
  precoUnitarioCentavos: number // fica gravado na venda
}

// Venda feita na hora, na própria feira (sem orçamento).
export type VendaFeira = {
  id: number
  feiraId: number
  numero: number // "Cliente 3" daquela feira
  nomeCliente?: string
  clienteId?: number // cliente cadastrado que comprou (se ela for da agenda)
  itens: ItemVenda[]
  formaPagamento?: FormaPagamento
  criadoEm: string
}

export type AlvoEstoque = 'material' | 'produto'
export type MotivoEstoque = 'compra' | 'producao' | 'venda' | 'consumo' | 'ajuste' | 'perda'

// Cada entrada ou saída do estoque. O saldo é a soma de todos os movimentos.
export type MovimentoEstoque = {
  id: number
  alvo: AlvoEstoque
  alvoId: number
  quantidade: number // positivo entra, negativo sai (unidade de uso do material, ou peças)
  motivo: MotivoEstoque
  observacao?: string
  criadoEm: string
  pedidoId?: number // se o lançamento nasceu de um pedido
  etapa?: 'pronto' | 'entregue' // qual etapa do pedido gerou o lançamento
  vendaFeiraId?: number // se nasceu de uma venda de feira
}

// "Avisar quando ficar com tanto ou menos": um aviso por item.
export type AvisoEstoque = {
  alvo: AlvoEstoque
  alvoId: number
  minimo: number
}

export const db = new Dexie('AppPrecificacao') as Dexie & {
  materiais: EntityTable<Material, 'id'>
  custosFixos: EntityTable<CustoFixo, 'id'>
  configuracao: EntityTable<Configuracao, 'id'>
  produtos: EntityTable<Produto, 'id'>
  catalogo: EntityTable<ItemCatalogo, 'produtoId'>
  loja: EntityTable<Loja, 'id'>
  clientes: EntityTable<Cliente, 'id'>
  pedidos: EntityTable<Pedido, 'id'>
  feiras: EntityTable<Feira, 'id'>
  vendasFeira: EntityTable<VendaFeira, 'id'>
  movimentos: EntityTable<MovimentoEstoque, 'id'>
  avisosEstoque: Table<AvisoEstoque, [AlvoEstoque, number]>
}

db.version(1).stores({
  materiais: '++id, nome',
})

db.version(2).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
})

db.version(3).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
})

db.version(4)
  .stores({
    materiais: '++id, nome',
    custosFixos: '++id, nome',
    configuracao: 'id',
    produtos: '++id, nome',
  })
  .upgrade((tx) =>
    // Converte os materiais de teste do formato antigo para o novo.
    tx
      .table('materiais')
      .toCollection()
      .modify((m) => {
        if (m.tipoMedida) return
        const emCm = m.unidade === 'cm'
        m.tipoMedida = emCm ? 'comprimento' : 'unidade'
        m.unidade = emCm ? 'cm' : 'un'
        m.precoCentavos = emCm ? m.custoUnitarioCentavos * 100 : m.custoUnitarioCentavos
        delete m.precoPagoCentavos
        delete m.quantidadeComprada
      }),
  )

db.version(5)
  .stores({
    materiais: '++id, nome',
    custosFixos: '++id, nome',
    configuracao: 'id',
    produtos: '++id, nome',
  })
  .upgrade((tx) =>
    // O campo "margemLucroPercent" virou "lucroPercent" (agora em cima do custo).
    tx
      .table('produtos')
      .toCollection()
      .modify((p) => {
        if (p.lucroPercent === undefined) {
          p.lucroPercent = p.margemLucroPercent ?? 50
          delete p.margemLucroPercent
        }
      }),
  )

db.version(6).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
  catalogo: 'produtoId',
  loja: 'id',
})

db.version(7).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
  catalogo: 'produtoId',
  loja: 'id',
  clientes: '++id, nome',
})

db.version(8).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
  catalogo: 'produtoId',
  loja: 'id',
  clientes: '++id, nome',
  pedidos: '++id, clienteId, prazoEntrega, status',
})

db.version(9).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
  catalogo: 'produtoId',
  loja: 'id',
  clientes: '++id, nome',
  pedidos: '++id, clienteId, prazoEntrega, status',
  feiras: '++id, data',
  vendasFeira: '++id, feiraId',
})

db.version(10).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
  catalogo: 'produtoId',
  loja: 'id',
  clientes: '++id, nome',
  pedidos: '++id, clienteId, prazoEntrega, status',
  feiras: '++id, data',
  vendasFeira: '++id, feiraId',
  movimentos: '++id, [alvo+alvoId], criadoEm',
  avisosEstoque: '[alvo+alvoId]',
})

db.version(11).stores({
  materiais: '++id, nome',
  custosFixos: '++id, nome',
  configuracao: 'id',
  produtos: '++id, nome',
  catalogo: 'produtoId',
  loja: 'id',
  clientes: '++id, nome',
  pedidos: '++id, clienteId, prazoEntrega, status',
  feiras: '++id, data',
  vendasFeira: '++id, feiraId',
  movimentos: '++id, [alvo+alvoId], criadoEm, pedidoId, vendaFeiraId',
  avisosEstoque: '[alvo+alvoId]',
})