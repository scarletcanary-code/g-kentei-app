import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../shared/ThemeToggle';
import UserMenu from '../shared/UserMenu';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'ホーム' },
  { to: '/quiz/setup', label: 'クイズ', matchPrefix: '/quiz' },
  { to: '/glossary', label: '用語集' },
  { to: '/learn', label: '学習', matchPrefix: '/learn' },
  { to: '/progress', label: '進捗' },
] as const;

export default function Header() {
  const location = useLocation();

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if ('matchPrefix' in item && item.matchPrefix) {
      return location.pathname.startsWith(item.matchPrefix);
    }
    return location.pathname === item.to;
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3">
        <Link to="/" className="text-xl font-bold text-foreground">
          G検定学習
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'text-sm px-3 py-1.5 rounded-md transition-colors',
                isActive(item)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
