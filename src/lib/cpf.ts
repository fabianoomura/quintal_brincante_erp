// Máscara de CPF: formata progressivamente para XXX.XXX.XXX-XX enquanto digita.
// Aceita entrada com ou sem pontuação; ignora não-dígitos e limita a 11 dígitos.
export function formatarCPF(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
