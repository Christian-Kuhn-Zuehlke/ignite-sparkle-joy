import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Package, 
  FileText, 
  RotateCcw, 
  Settings, 
  BarChart3, 
  Sparkles,
  LayoutDashboard,
  Truck,
  Users,
  Search,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  type: 'order' | 'return' | 'inventory' | 'page';
  title: string;
  subtitle?: string;
  status?: string;
  url: string;
}

const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', url: '/dashboard' },
  { id: 'orders', type: 'page', title: 'Orders', url: '/orders' },
  { id: 'inventory', type: 'page', title: 'Inventory', url: '/inventory' },
  { id: 'returns', type: 'page', title: 'Returns', url: '/returns' },
  { id: 'kpis', type: 'page', title: 'KPIs', url: '/kpis' },
  { id: 'ai', type: 'page', title: 'AI Hub', url: '/ai' },
  { id: 'inbound', type: 'page', title: 'Inbound', url: '/inbound' },
  { id: 'settings', type: 'page', title: 'Settings', url: '/settings' },
  { id: 'customer-cockpit', type: 'page', title: 'Customer Cockpit', url: '/customer-cockpit' },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const debouncedQuery = useDebounce(query, 300);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Search logic
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, source_no, ship_to_name, status, order_date')
        .or(`source_no.ilike.%${searchQuery}%,ship_to_name.ilike.%${searchQuery}%,external_document_no.ilike.%${searchQuery}%`)
        .limit(5);

      if (orders) {
        orders.forEach((order) => {
          searchResults.push({
            id: order.id,
            type: 'order',
            title: `#${order.source_no}`,
            subtitle: order.ship_to_name,
            status: order.status,
            url: `/orders/${order.id}`,
          });
        });
      }

      // Search inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('id, sku, name, on_hand')
        .or(`sku.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(5);

      if (inventory) {
        inventory.forEach((item) => {
          searchResults.push({
            id: item.id,
            type: 'inventory',
            title: item.sku,
            subtitle: `${item.name} (${item.on_hand} ${t('inventory.onHand')})`,
            url: `/inventory?search=${encodeURIComponent(item.sku)}`,
          });
        });
      }

      // Filter pages by query
      const filteredPages = PAGES.filter((page) =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setResults([...searchResults, ...filteredPages.slice(0, 3)]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setQuery('');
    navigate(result.url);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'order':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-muted-foreground" />;
      case 'return':
        return <RotateCcw className="h-4 w-4 text-muted-foreground" />;
      case 'page':
        return <LayoutDashboard className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPageIcon = (pageId: string) => {
    switch (pageId) {
      case 'dashboard':
        return <LayoutDashboard className="h-4 w-4 text-muted-foreground" />;
      case 'orders':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-muted-foreground" />;
      case 'returns':
        return <RotateCcw className="h-4 w-4 text-muted-foreground" />;
      case 'kpis':
        return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
      case 'ai':
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
      case 'inbound':
        return <Truck className="h-4 w-4 text-muted-foreground" />;
      case 'settings':
        return <Settings className="h-4 w-4 text-muted-foreground" />;
      case 'customer-cockpit':
        return <Users className="h-4 w-4 text-muted-foreground" />;
      default:
        return <LayoutDashboard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusColors: Record<string, string> = {
      pending: 'bg-status-pending/20 text-status-pending border-status-pending/30',
      processing: 'bg-status-processing/20 text-status-processing border-status-processing/30',
      shipped: 'bg-status-shipped/20 text-status-shipped border-status-shipped/30',
      delivered: 'bg-status-shipped/20 text-status-shipped border-status-shipped/30',
      exception: 'bg-status-exception/20 text-status-exception border-status-exception/30',
    };
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${statusColors[status] || 'bg-muted text-muted-foreground'}`}
      >
        {status}
      </Badge>
    );
  };

  const orderResults = results.filter((r) => r.type === 'order');
  const inventoryResults = results.filter((r) => r.type === 'inventory');
  const pageResults = results.filter((r) => r.type === 'page');

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t('search.placeholder') || 'Search orders, inventory, pages...'}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            t('search.noResults') || 'No results found.'
          )}
        </CommandEmpty>

        {/* Quick navigation when no query */}
        {!query && (
          <CommandGroup heading={t('search.quickNav') || 'Quick Navigation'}>
            {PAGES.map((page) => (
              <CommandItem
                key={page.id}
                value={page.title}
                onSelect={() => handleSelect(page)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {getPageIcon(page.id)}
                <span>{page.title}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Order results */}
        {orderResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('nav.orders')}>
              {orderResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.title} ${result.subtitle}`}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.title}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Inventory results */}
        {inventoryResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('nav.inventory')}>
              {inventoryResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.title} ${result.subtitle}`}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{result.title}</span>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Page results */}
        {query && pageResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('search.pages') || 'Pages'}>
              {pageResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {getPageIcon(result.id)}
                  <span>{result.title}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
