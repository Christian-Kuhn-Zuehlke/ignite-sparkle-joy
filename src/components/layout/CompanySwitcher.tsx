import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Sparkles, Users } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanies } from '@/hooks/useCompanies';

// Internal company IDs that should not appear in customer selection
const INTERNAL_COMPANY_IDS = ['MSD', 'PENDING'];

export function CompanySwitcher() {
  const [open, setOpen] = useState(false);
  const { memberships, activeCompanyId, setActiveCompanyId, canViewAllCompanies } = useAuth();
  const { t } = useLanguage();
  
  // For MSD staff: fetch all companies
  const { data: allCompanies = [] } = useCompanies();
  
  // Filter out internal companies (MSD, PENDING) for MSD staff view
  const filteredCompanies = canViewAllCompanies()
    ? allCompanies
        .filter(c => !INTERNAL_COMPANY_IDS.includes(c.id))
        .map(c => ({
          company_id: c.id,
          company_name: c.name,
          company_logo_url: c.logo_url,
        }))
    : memberships
        .filter(m => !INTERNAL_COMPANY_IDS.includes(m.company_id))
        .map(m => ({
          company_id: m.company_id,
          company_name: m.company_name,
          company_logo_url: m.company_logo_url,
        }));

  // Don't show switcher if only one company and not MSD staff
  if (filteredCompanies.length <= 1 && !canViewAllCompanies()) {
    return null;
  }

  const activeCompany = filteredCompanies.find(c => c.company_id === activeCompanyId);
  const isAllCustomersSelected = activeCompanyId === null || activeCompanyId === 'ALL';

  const handleSelectAll = () => {
    setActiveCompanyId('ALL');
    setOpen(false);
  };

  const handleSelectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-secondary/50 border-border/50 hover:bg-secondary"
        >
          <div className="flex items-center gap-2 truncate">
            {isAllCustomersSelected ? (
              <Users className="h-4 w-4 text-primary shrink-0" />
            ) : activeCompany?.company_logo_url ? (
              <img 
                src={activeCompany.company_logo_url} 
                alt="" 
                loading="lazy"
                decoding="async"
                className="h-5 w-5 rounded object-contain"
              />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">
              {isAllCustomersSelected 
                ? t('companySwitcher.allCustomers')
                : activeCompany?.company_name || t('companySwitcher.selectCustomer')}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('companySwitcher.searchCustomer')} />
          <CommandList>
            <CommandEmpty>{t('companySwitcher.noCustomerFound')}</CommandEmpty>
            
            {/* "All Customers" option for MSD staff */}
            {canViewAllCompanies() && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="alle-kunden"
                    onSelect={handleSelectAll}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isAllCustomersSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('companySwitcher.allCustomers')}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {filteredCompanies.length}
                    </span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            
            <CommandGroup heading={canViewAllCompanies() ? t('companySwitcher.customers') : t('companySwitcher.myCustomers')}>
              {filteredCompanies.map((company) => {
                const isPrimary = memberships.find(m => m.company_id === company.company_id)?.is_primary;
                
                return (
                  <CommandItem
                    key={company.company_id}
                    value={company.company_name || company.company_id}
                    onSelect={() => handleSelectCompany(company.company_id)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        activeCompanyId === company.company_id && !isAllCustomersSelected
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {company.company_logo_url ? (
                      <img 
                        src={company.company_logo_url} 
                        alt="" 
                        loading="lazy"
                        decoding="async"
                        className="h-5 w-5 rounded object-contain"
                      />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate flex-1">{company.company_name}</span>
                    {isPrimary && (
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
