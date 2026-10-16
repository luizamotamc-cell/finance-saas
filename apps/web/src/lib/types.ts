export type TxType = 'INCOME' | 'EXPENSE';
export type AccountType = 'CHECKING' | 'WALLET' | 'CREDIT_CARD' | 'SAVINGS';

export interface User { id: string; name: string; email: string }

export interface Account {
  id: string; name: string; type: AccountType; initialBalance: number; balance: number;
}

export interface Category { id: string; name: string; type: TxType; color: string }

export interface Transaction {
  id: string;
  amount: number;
  type: TxType;
  date: string;
  description: string | null;
  accountId: string;
  categoryId: string;
  category: { id: string; name: string; color: string };
  account: { id: string; name: string };
}

export interface Paginated<T> { items: T[]; total: number; page: number; limit: number }

export interface Summary {
  month: string;
  totalBalance: number;
  income: number;
  expense: number;
  result: number;
  byCategory: { categoryId: string; name: string; color: string; total: number; percent: number }[];
  monthly: { month: string; income: number; expense: number }[];
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  WALLET: 'Carteira',
  CREDIT_CARD: 'Cartão de crédito',
  SAVINGS: 'Poupança',
};
