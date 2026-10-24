// Lê a foto escolhida, corta em quadrado e reduz para caber no catálogo.
export function prepararFoto(arquivo: File, lado = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const menor = Math.min(img.width, img.height)
      const x = (img.width - menor) / 2
      const y = (img.height - menor) / 2
      const destino = Math.min(lado, menor)

      const canvas = document.createElement('canvas')
      canvas.width = destino
      canvas.height = destino
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível processar a foto.'))
        return
      }
      ctx.drawImage(img, x, y, menor, menor, 0, 0, destino, destino)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler essa foto.'))
    }

    img.src = url
  })
}