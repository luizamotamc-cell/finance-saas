import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Account, Category } from './types';

export const useAccounts = () =>
  useQuery({ queryKey: ['accounts'], queryFn: () => api<Account[]>('/accounts') });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories') });
