// Tira acentos e maiúsculas, para "alca" encontrar "Alça".
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function filtrar<T>(
  itens: T[],
  termo: string,
  campos: (item: T) => string[],
): T[] {
  const busca = normalizar(termo.trim())
  if (!busca) return itens
  return itens.filter((item) =>
    campos(item).some((campo) => normalizar(campo).includes(busca)),
  )
}