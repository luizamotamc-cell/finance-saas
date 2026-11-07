import { describe, expect, it } from 'vitest';
import { brl, centsToInput, formatDate, monthRange, toCents } from './format';

// Normaliza o espaço não separável que o Intl coloca entre "R$" e o número
const norm = (s: string) => s.replace(/\u00a0/g, ' ');

describe('toCents', () => {
  it.each([
    ['10', 1000],
    ['10,5', 1050],
    ['10,50', 1050],
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['0,01', 1],
    ['0,1', 10],
    ['1234.56', 123456],
    ['  15,90  ', 1590],
  ])('%s → %d centavos', (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it('valores inválidos viram NaN (e o formulário rejeita)', () => {
    expect(toCents('abc')).toBeNaN();
    expect(toCents('')).toBe(0);
  });

  it('não perde centavos por ponto flutuante', () => {
    expect(toCents('1,15')).toBe(115);
    expect(toCents('0,29')).toBe(29);
    expect(toCents('19,99')).toBe(1999);
    expect(toCents('1,005')).toBe(101); // meio centavo: arredonda para cima
  });

  it('"1.234" (mil duzentos e trinta e quatro reais) não pode virar R$ 1,23', () => {
    expect(toCents('1.234')).toBe(123400);
  });
});

describe('centsToInput', () => {
  it('ida e volta preserva o valor', () => {
    for (const c of [0, 1, 99, 100, 123456, 100000000]) {
      expect(toCents(centsToInput(c))).toBe(c);
    }
  });
});

describe('brl', () => {
  it('formata em reais', () => {
    expect(norm(brl(123456))).toBe('R$ 1.234,56');
    expect(norm(brl(5))).toBe('R$ 0,05');
    expect(norm(brl(-2500))).toBe('-R$ 25,00');
  });
});

describe('datas', () => {
  it('formatDate não sofre deslocamento de fuso', () => {
    expect(formatDate('2026-10-03T00:00:00.000Z')).toBe('03/10/2026');
    expect(formatDate('2026-11-01')).toBe('01/11/2026');
  });

  it('monthRange cobre meses de 28, 29, 30 e 31 dias', () => {
    expect(monthRange('2026-02').to).toBe('2026-02-28');
    expect(monthRange('2028-02').to).toBe('2028-02-29');
    expect(monthRange('2026-04').to).toBe('2026-04-30');
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});