import { Building2, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

interface CompanyFilterDropdownProps {
  className?: string;
}

/**
 * Reusable company filter dropdown for MSD staff (CSM, MA, System Admin)
 * Shows "Alle Kunden" option + list of all companies
 * Updates the global activeCompanyId in AuthContext
 */
export function CompanyFilterDropdown({ className }: CompanyFilterDropdownProps) {
  const { role, activeCompanyId, setActiveCompanyId } = useAuth();
  const { data: companies, isLoading } = useCompanies();
  const { t } = useLanguage();
  
  // Only show for MSD staff roles
  const canViewAllCompanies = ['system_admin', 'msd_csm', 'msd_ma'].includes(role || '');
  
  if (!canViewAllCompanies) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-9 w-[180px]" />;
  }

  // Filter out internal companies (PENDING for pending registrations, MSD is the operator not a customer)
  const filteredCompanies = companies?.filter(c => c.id !== 'PENDING' && c.id !== 'MSD') || [];

  return (
    <Select 
      value={activeCompanyId || 'ALL'} 
      onValueChange={(value) => setActiveCompanyId(value)}
    >
      <SelectTrigger className={className || "w-full sm:w-[180px]"}>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          {activeCompanyId === 'ALL' ? (
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          ) : (
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">
            <SelectValue placeholder={t('companySwitcher.selectCustomer')} />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('companySwitcher.allCustomers')}
          </div>
        </SelectItem>
        {filteredCompanies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {company.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
