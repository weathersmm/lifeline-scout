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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, CalendarIcon } from 'lucide-react';
import { ServiceTag, ContractType, Priority } from '@/types/opportunity';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OpportunityFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedServiceTags: ServiceTag[];
  onServiceTagToggle: (tag: ServiceTag) => void;
  selectedPriority: Priority | 'all';
  onPriorityChange: (priority: Priority | 'all') => void;
  selectedContractType: ContractType | 'all';
  onContractTypeChange: (type: ContractType | 'all') => void;
  dateRange?: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
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
  dateRange,
  onDateRangeChange,
  onClearFilters
}: OpportunityFiltersProps) => {
  const hasActiveFilters = 
    searchQuery || 
    selectedServiceTags.length > 0 || 
    selectedPriority !== 'all' || 
    selectedContractType !== 'all' ||
    dateRange?.from ||
    dateRange?.to;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.from && !dateRange?.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                  </>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                <span>Deadline range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{ from: dateRange?.from, to: dateRange?.to }}
              onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

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
