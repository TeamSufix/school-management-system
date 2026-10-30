export function moneyToCents(value: number) {
  return Math.round(value * 100);
}

export function isValidMoney(value: number) {
  return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(moneyToCents(value)) && value === Number(value.toFixed(2));
}
