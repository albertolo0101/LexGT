// Formateadores compartidos por las herramientas. Viven aparte para que cada
// módulo de cálculo siga siendo puro y sin duplicar `Intl`.

export function formatQ(amount: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
