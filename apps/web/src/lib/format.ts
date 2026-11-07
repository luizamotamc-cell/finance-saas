export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "1.234,56", "1234.56" ou "1.234" -> centavos. Retorna NaN se inválido. */
export function toCents(input: string): number {
  let s = input.trim();
  if (!s) return 0;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // "1.234" = mil duzentos e trinta e quatro
  }
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return NaN;
  const frac = m[2] ?? '';
  const cents = Number(m[1]) * 100 + Number((frac + '00').slice(0, 2));
  return cents + (Number(frac[2] ?? 0) >= 5 ? 1 : 0); // meio centavo arredonda para cima
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

const localISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
};
export const today = () => localISO().slice(0, 10);
export const currentMonth = () => localISO().slice(0, 7);

/** "2026-10-03T00:00:00.000Z" -> "03/10/2026" */
export const formatDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

export const monthRange = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
};

export const monthShort = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
};
