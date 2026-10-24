// Datas guardadas como texto "AAAA-MM-DD" (horário local, sem fuso).

function doisDigitos(n: number) {
  return String(n).padStart(2, '0')
}

export function paraISO(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export function hojeISO(): string {
  return paraISO(new Date())
}

export function dataDeISO(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

export function somarDias(iso: string, dias: number): string {
  const data = dataDeISO(iso)
  data.setDate(data.getDate() + dias)
  return paraISO(data)
}

// Quantos dias faltam (negativo = atrasado).
export function diasAte(iso: string): number {
  const diferenca = dataDeISO(iso).getTime() - dataDeISO(hojeISO()).getTime()
  return Math.round(diferenca / 86400000)
}

// Ex.: "qui., 29/10"
export function formatarDataCurta(iso: string): string {
  return dataDeISO(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

// Texto e cor para mostrar quanto tempo falta para a entrega.
export function situacaoDoPrazo(iso: string) {
  const dias = diasAte(iso)
  if (dias < 0) {
    return {
      texto: dias === -1 ? 'Atrasado há 1 dia' : `Atrasado há ${-dias} dias`,
      classes: 'bg-red-100 text-red-700',
    }
  }
  if (dias === 0) return { texto: 'Hoje', classes: 'bg-amber-100 text-amber-800' }
  if (dias === 1) return { texto: 'Amanhã', classes: 'bg-amber-100 text-amber-800' }
  return { texto: `Em ${dias} dias`, classes: 'bg-gray-100 text-gray-700' }
}

// Texto e cor para mostrar até quando um orçamento vale.
export function situacaoDaValidade(iso: string) {
  const dias = diasAte(iso)
  if (dias < 0) {
    return {
      texto: dias === -1 ? 'Venceu ontem' : `Venceu há ${-dias} dias`,
      classes: 'bg-red-100 text-red-700',
    }
  }
  if (dias === 0) return { texto: 'Vale até hoje', classes: 'bg-amber-100 text-amber-800' }
  return {
    texto: `Vale por mais ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
    classes: 'bg-gray-100 text-gray-700',
  }
}