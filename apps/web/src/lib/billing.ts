export const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatCompactRupiah = (amount: number) => {
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    const formatted = val >= 10 || val % 1 === 0 ? Math.round(val) : val.toFixed(1).replace('.', ',');
    return `Rp ${formatted} M`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    const formatted = val >= 100 || val % 1 === 0 ? Math.round(val) : val.toFixed(1).replace('.', ',');
    return `Rp ${formatted} jt`;
  }
  return formatRupiah(amount);
};

export const getCycleText = (cycle?: string) => {
  return 'Pay-As-You-Go';
};
