// "catalogo Ateliê da Maria" → "catalogo-atelie-da-maria.pdf"
export function nomeDeArquivo(texto: string, extensao: string) {
  const base = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'catalogo'}.${extensao}`
}

export function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = url
  link.download = arquivo.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// O navegador só oferece "compartilhar arquivo" em alguns aparelhos e sites seguros (HTTPS).
export function podeCompartilhar(arquivo: File) {
  return (
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [arquivo] })
  )
}

// Devolve true se a pessoa realmente compartilhou, e false se fechou a janela.
export async function compartilharArquivo(
  arquivo: File,
  titulo: string,
): Promise<boolean> {
  try {
    await navigator.share({ files: [arquivo], title: titulo })
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false
    throw e
  }
}