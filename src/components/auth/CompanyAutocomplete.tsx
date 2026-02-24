import { useState, useEffect, useRef } from 'react';
import { Building2, Check, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  similarity_score?: number;
}

interface CompanyAutocompleteProps {
  value: string;
  selectedCompanyId: string | null;
  onChange: (value: string) => void;
  onSelect: (company: Company | null) => void;
  error?: string;
}

export function CompanyAutocomplete({
  value,
  selectedCompanyId,
  onChange,
  onSelect,
  error,
}: CompanyAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search companies with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setNoMatch(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Use the fuzzy search function
        const { data, error: searchError } = await supabase
          .rpc('search_companies_fuzzy', { search_term: value });

        if (searchError) {
          console.error('Search error:', searchError);
          // Fallback to simple LIKE search
          const { data: fallbackData } = await supabase
            .from('companies')
            .select('id, name')
            .or(`name.ilike.%${value}%,id.ilike.%${value}%`)
            .limit(5);
          
          setSuggestions(fallbackData || []);
          setNoMatch(!fallbackData || fallbackData.length === 0);
        } else {
          setSuggestions(data || []);
          setNoMatch(!data || data.length === 0);
        }
        setIsOpen(true);
      } catch (err) {
        console.error('Company search error:', err);
        setNoMatch(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelect = (company: Company) => {
    onChange(company.name);
    onSelect(company);
    setIsOpen(false);
    setNoMatch(false);
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    // Reset selection if user types something different
    if (selectedCompanyId) {
      onSelect(null);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Label htmlFor="company">Unternehmen</Label>
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="company"
          type="text"
          placeholder="z.B. Golfyr, Namuk, MS Direct..."
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length >= 2 && setIsOpen(true)}
          className={cn(
            "pl-10 pr-10",
            selectedCompanyId && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {selectedCompanyId && !isLoading && (
          <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (suggestions.length > 0 || noMatch) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(company)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                      "flex items-center justify-between gap-2",
                      selectedCompanyId === company.id && "bg-accent"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{company.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {company.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : noMatch && value.length >= 2 ? (
            <div className="p-3 text-sm">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>Kein Unternehmen gefunden</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                "{value}" wird als neues Unternehmen registriert. Ein Admin wird Ihre Anfrage prüfen.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      
      {!selectedCompanyId && value.length >= 2 && noMatch && !isOpen && (
        <p className="text-xs text-amber-600">
          Unbekanntes Unternehmen – Ihre Registrierung wird von einem Admin geprüft.
        </p>
      )}
      
      {selectedCompanyId && (
        <p className="text-xs text-green-600">
          Unternehmen erkannt – Ihre Registrierung wird zur Freigabe eingereicht.
        </p>
      )}
    </div>
  );
}
