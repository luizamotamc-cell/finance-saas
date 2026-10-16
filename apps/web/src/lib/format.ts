export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "1.234,56" ou "1234.56" -> 123456 (centavos). Retorna NaN se inválido. */
export function toCents(input: string): number {
  const s = input.trim();
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Math.round(Number(normalized) * 100);
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
