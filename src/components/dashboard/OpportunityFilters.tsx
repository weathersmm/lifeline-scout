import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { ServiceTag, ContractType, Priority } from '@/types/opportunity';

interface OpportunityFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedServiceTags: ServiceTag[];
  onServiceTagToggle: (tag: ServiceTag) => void;
  selectedPriority: Priority | 'all';
  onPriorityChange: (priority: Priority | 'all') => void;
  selectedContractType: ContractType | 'all';
  onContractTypeChange: (type: ContractType | 'all') => void;
  onClearFilters: () => void;
}

const serviceTags: ServiceTag[] = [
  'EMS 911', 'Non-Emergency', 'IFT', 'BLS', 'ALS', 'CCT',
  'MEDEVAC', 'Billing', 'CQI', 'EMS Tech', 'VR/Sim'
];

const priorities: (Priority | 'all')[] = ['all', 'high', 'medium', 'low'];

const contractTypes: (ContractType | 'all')[] = [
  'all', 'RFP', 'RFQ', 'RFI', 'Sources Sought', 'Pre-solicitation', 'Sole-Source Notice'
];

export const OpportunityFilters = ({
  searchQuery,
  onSearchChange,
  selectedServiceTags,
  onServiceTagToggle,
  selectedPriority,
  onPriorityChange,
  selectedContractType,
  onContractTypeChange,
  onClearFilters
}: OpportunityFiltersProps) => {
  const hasActiveFilters = 
    searchQuery || 
    selectedServiceTags.length > 0 || 
    selectedPriority !== 'all' || 
    selectedContractType !== 'all';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search opportunities..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select value={selectedPriority} onValueChange={onPriorityChange}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority === 'all' ? 'All Priorities' : priority.charAt(0).toUpperCase() + priority.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedContractType} onValueChange={onContractTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Contract Type" />
          </SelectTrigger>
          <SelectContent>
            {contractTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Service Tags */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Service Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {serviceTags.map((tag) => {
            const isSelected = selectedServiceTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/90 transition-colors"
                onClick={() => onServiceTagToggle(tag)}
              >
                {tag}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
};
