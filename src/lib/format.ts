const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const energyFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatPower(valueW: number): string {
  return `${integerFormatter.format(Math.round(valueW))} W`;
}

export function formatApparentPower(valueVA: number): string {
  return `${integerFormatter.format(Math.round(valueVA))} VA`;
}

export function formatCurrent(valueA: number): string {
  return `${decimalFormatter.format(valueA)} A`;
}

export function formatPowerFactor(value: number): string {
  return decimalFormatter.format(value);
}

export function formatEnergy(valueKwh: number): string {
  return `${energyFormatter.format(valueKwh)} kWh`;
}

export function formatPercent(value: number): string {
  return `${integerFormatter.format(Math.round(value))}%`;
}
