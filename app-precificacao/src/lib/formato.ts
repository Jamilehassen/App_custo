// Transforma 1500 em "R$ 15,00".
export function formatarReais(centavos: number, maxDecimais = 2): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimais,
  })
}

// Transforma o que a pessoa digitou ("30,50") em centavos (3050).
export function reaisParaCentavos(texto: string): number {
  const numero = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

// Transforma o que a pessoa digitou ("2,5") em número (2.5).
export function paraNumero(texto: string): number {
  const numero = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(numero) ? numero : 0
}

// Mostra 85.9 como "85,9" (sem casas desnecessárias).
export function formatarPercentual(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

// Transforma 12.5 em "12,5", para preencher campos de texto.
export function numeroParaTexto(numero: number): string {
  return String(numero).replace('.', ',')
}

// Transforma "11999998888" em "(11) 99999-8888".
export function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return digitos
}

// Deixa só os números: "(11) 99999-8888" → "11999998888".
export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

// Telefone brasileiro com DDD: 10 (fixo) ou 11 (celular) números.
export function telefoneValido(digitos: string): boolean {
  return digitos.length === 10 || digitos.length === 11
}

// Link que abre uma conversa no WhatsApp, já com uma mensagem pronta.
export function linkWhatsapp(digitos: string, mensagem?: string): string {
  const base = `https://wa.me/55${digitos}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}