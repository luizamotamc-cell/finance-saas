import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const links = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/transacoes', label: 'Transações' },
  { to: '/contas', label: 'Contas' },
  { to: '/categorias', label: 'Categorias' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="bg-brand-dark p-4 text-white md:flex md:min-h-screen md:flex-col md:p-5">
        <div className="mb-3 flex items-center justify-between md:mb-8">
          <span className="text-lg font-bold">Caixa</span>
          <button onClick={logout} className="text-sm text-white/70 hover:text-white md:hidden">Sair</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Principal">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/15 pt-4 md:block">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="mb-2 truncate text-xs text-white/60">{user?.email}</p>
          <button onClick={logout} className="text-sm text-white/70 hover:text-white">Sair</button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
