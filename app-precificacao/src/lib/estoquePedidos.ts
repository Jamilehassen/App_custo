import {
  db,
  type AlvoEstoque,
  type ItemVenda,
  type Pedido,
  type Produto,
  type StatusPedido,
} from '../db'

// ---------- Contas ----------

// Quanto de cada material a ficha técnica pede para fazer "quantidade" peças.
export function materiaisDaProducao(
  produto: Pick<Produto, 'materiais'>,
  quantidade: number,
): Map<number, number> {
  const total = new Map<number, number>()
  for (const item of produto.materiais) {
    total.set(item.materialId, (total.get(item.materialId) ?? 0) + item.quantidade * quantidade)
  }
  return total
}

export function somarMateriais(partes: Map<number, number>[]): Map<number, number> {
  const total = new Map<number, number>()
  for (const parte of partes) {
    for (const [materialId, quantidade] of parte) {
      total.set(materialId, (total.get(materialId) ?? 0) + quantidade)
    }
  }
  return total
}

// Peças que já têm dono: de pedidos prontos, esperando a entrega.
export function reservadoPorPedidosProntos(pedidos: Pedido[]): Map<number, number> {
  const reservado = new Map<number, number>()
  for (const p of pedidos) {
    if (p.status !== 'pronto') continue
    for (const item of p.itens) {
      if (item.tipo === 'produto' && item.produtoId !== undefined) {
        reservado.set(item.produtoId, (reservado.get(item.produtoId) ?? 0) + item.quantidade)
      }
    }
  }
  return reservado
}

// O que está livre para um pedido novo: o saldo menos o que já está reservado.
export function disponivelDoProduto(
  saldo: number | undefined,
  reservado: number | undefined,
): number {
  return Math.max(0, (saldo ?? 0) - (reservado ?? 0))
}

export type LinhaDoPronto = {
  produtoId: number
  descricao: string
  necessario: number
  disponivel: number
  sugerido: number // quanto produzir agora
}

// O que mostrar ao marcar um pedido como pronto: uma linha por produto.
export function linhasParaMarcarPronto(
  pedido: Pedido,
  produtos: Produto[],
  disponivelDe: (produtoId: number) => number,
): LinhaDoPronto[] {
  const linhas = new Map<number, LinhaDoPronto>()
  for (const item of pedido.itens) {
    if (item.tipo !== 'produto' || item.produtoId === undefined) continue
    const produto = produtos.find((p) => p.id === item.produtoId)
    if (!produto) continue

    const necessario = (linhas.get(item.produtoId)?.necessario ?? 0) + item.quantidade
    const disponivel = disponivelDe(item.produtoId)
    linhas.set(item.produtoId, {
      produtoId: item.produtoId,
      descricao: produto.nome,
      necessario,
      disponivel,
      sugerido: Math.max(0, necessario - disponivel),
    })
  }
  return [...linhas.values()]
}

export type ItemDeCompra = {
  materialId: number
  necessario: number
  emEstoque: number | undefined // undefined = esse material não é controlado
  comprar: number | undefined // quanto falta comprar (só quando é controlado)
}

// Soma os materiais de tudo o que ainda falta fazer e compara com o estoque.
export function listaDeCompras(
  faltaFazer: { produtoId: number; falta: number }[],
  produtos: Produto[],
  saldoDeMaterial: (materialId: number) => number | undefined,
): ItemDeCompra[] {
  const partes = faltaFazer.flatMap(({ produtoId, falta }) => {
    const produto = produtos.find((p) => p.id === produtoId)
    return produto && falta > 0 ? [materiaisDaProducao(produto, falta)] : []
  })

  return [...somarMateriais(partes).entries()].map(([materialId, necessario]) => {
    const emEstoque = saldoDeMaterial(materialId)
    return {
      materialId,
      necessario,
      emEstoque,
      comprar:
        emEstoque === undefined
          ? undefined
          : Math.max(0, necessario - Math.max(0, emEstoque)),
    }
  })
}

// ---------- O que vale em cada situação do pedido ----------

type Etapa = 'pronto' | 'entregue'

// Quais lançamentos automáticos continuam valendo em cada situação.
// Cancelado mantém a produção (a peça existe) e desfaz só a entrega.
export function etapasValidas(status: StatusPedido): Etapa[] {
  switch (status) {
    case 'pronto':
      return ['pronto']
    case 'entregue':
      return ['pronto', 'entregue']
    case 'cancelado':
      return ['pronto']
    default:
      return [] // orçamento, novo, em produção
  }
}

// ---------- Gravação no banco ----------

// Só mexemos no estoque de itens que ela já começou a controlar (têm lançamentos).
async function controlados(alvo: AlvoEstoque, ids: number[]): Promise<Set<number>> {
  const resultado = new Set<number>()
  for (const id of ids) {
    const total = await db.movimentos.where('[alvo+alvoId]').equals([alvo, id]).count()
    if (total > 0) resultado.add(id)
  }
  return resultado
}

export type ProducaoConfirmada = {
  linhas: { produtoId: number; quantidade: number }[]
  baixarMateriais: boolean
  produtos: Produto[]
}

// Muda a situação do pedido e acerta o estoque junto, tudo de uma vez.
export async function aplicarMudancaDeStatus(
  pedido: Pedido,
  novo: StatusPedido,
  producao?: ProducaoConfirmada,
) {
  await db.transaction('rw', db.pedidos, db.movimentos, async () => {
    const validas = etapasValidas(novo)
    const existentes = await db.movimentos.where('pedidoId').equals(pedido.id).toArray()

    // 1. Desfaz o que não vale mais nessa situação.
    const sobrando = existentes.filter((m) => !m.etapa || !validas.includes(m.etapa))
    await db.movimentos.bulkDelete(sobrando.map((m) => m.id))
    const mantidos = existentes.filter((m) => m.etapa && validas.includes(m.etapa))

    const agora = new Date().toISOString()
    const nota = `Pedido nº ${pedido.id}`

    // 2. Entregue: dá baixa nas peças.
    if (novo === 'entregue' && !mantidos.some((m) => m.etapa === 'entregue')) {
      const porProduto = new Map<number, number>()
      for (const item of pedido.itens) {
        if (item.tipo === 'produto' && item.produtoId !== undefined) {
          porProduto.set(item.produtoId, (porProduto.get(item.produtoId) ?? 0) + item.quantidade)
        }
      }
      const ativos = await controlados('produto', [...porProduto.keys()])
      for (const [produtoId, quantidade] of porProduto) {
        if (!ativos.has(produtoId)) continue
        await db.movimentos.add({
          alvo: 'produto',
          alvoId: produtoId,
          quantidade: -quantidade,
          motivo: 'venda',
          observacao: nota,
          pedidoId: pedido.id,
          etapa: 'entregue',
          criadoEm: agora,
        })
      }
    }

    // 3. Pronto (confirmado): entrada das peças e baixa dos materiais.
    if (novo === 'pronto' && producao && !mantidos.some((m) => m.etapa === 'pronto')) {
      const feitas = producao.linhas.filter((l) => l.quantidade > 0)

      const produtosAtivos = await controlados(
        'produto',
        feitas.map((l) => l.produtoId),
      )
      for (const l of feitas) {
        if (!produtosAtivos.has(l.produtoId)) continue
        await db.movimentos.add({
          alvo: 'produto',
          alvoId: l.produtoId,
          quantidade: l.quantidade,
          motivo: 'producao',
          observacao: nota,
          pedidoId: pedido.id,
          etapa: 'pronto',
          criadoEm: agora,
        })
      }

      if (producao.baixarMateriais) {
        const total = somarMateriais(
          feitas.flatMap((l) => {
            const produto = producao.produtos.find((p) => p.id === l.produtoId)
            return produto ? [materiaisDaProducao(produto, l.quantidade)] : []
          }),
        )
        const materiaisAtivos = await controlados('material', [...total.keys()])
        for (const [materialId, quantidade] of total) {
          if (!materiaisAtivos.has(materialId) || quantidade <= 0) continue
          await db.movimentos.add({
            alvo: 'material',
            alvoId: materialId,
            quantidade: -quantidade,
            motivo: 'consumo',
            observacao: nota,
            pedidoId: pedido.id,
            etapa: 'pronto',
            criadoEm: agora,
          })
        }
      }
    }

    // 4. Por fim, muda a situação.
    await db.pedidos.update(pedido.id, { status: novo })
  })
}

// Ao excluir um pedido, a entrega que ele tinha dado baixa é desfeita.
export async function descartarEntregaDoPedido(pedidoId: number) {
  await db.movimentos
    .where('pedidoId')
    .equals(pedidoId)
    .filter((m) => m.etapa === 'entregue')
    .delete()
}

// Venda de feira: dá baixa nas peças (refaz a baixa se a venda for editada).
export async function registrarVendaNoEstoque(vendaId: number, itens: ItemVenda[]) {
  await db.transaction('rw', db.movimentos, async () => {
    await db.movimentos.where('vendaFeiraId').equals(vendaId).delete()

    const porProduto = new Map<number, number>()
    for (const item of itens) {
      if (item.produtoId === undefined) continue
      porProduto.set(item.produtoId, (porProduto.get(item.produtoId) ?? 0) + item.quantidade)
    }

    const ativos = await controlados('produto', [...porProduto.keys()])
    for (const [produtoId, quantidade] of porProduto) {
      if (!ativos.has(produtoId)) continue
      await db.movimentos.add({
        alvo: 'produto',
        alvoId: produtoId,
        quantidade: -quantidade,
        motivo: 'venda',
        observacao: 'Venda de feira',
        vendaFeiraId: vendaId,
        criadoEm: new Date().toISOString(),
      })
    }
  })
}

export async function removerEstoqueDaVenda(vendaId: number) {
  await db.movimentos.where('vendaFeiraId').equals(vendaId).delete()
}