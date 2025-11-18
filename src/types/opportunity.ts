export interface Opportunity {
  id: string;
  title: string;
  agency: string;
  geography: {
    state: string;
    county?: string;
    city?: string;
  };
  serviceTags: ServiceTag[];
  contractType: ContractType;
  estimatedValue?: {
    min?: number;
    max?: number;
  };
  keyDates: {
    issueDate?: string;
    questionsDue?: string;
    preBidMeeting?: string;
    proposalDue: string;
  };
  termLength?: string;
  link: string;
  summary: string;
  priority: Priority;
  status: OpportunityStatus;
  source: string;
  recommendedAction?: string;
  isHot: boolean;
}

export type ServiceTag = 
  | 'EMS 911'
  | 'Non-Emergency'
  | 'IFT'
  | 'BLS'
  | 'ALS'
  | 'CCT'
  | 'MEDEVAC'
  | 'Billing'
  | 'CQI'
  | 'EMS Tech'
  | 'VR/Sim'
  | 'Call Center'
  | 'LA28 Olympics'
  | 'Paralympics'
  | 'FIFA World Cup'
  | 'Soccer/Football';

export type OpportunityCategory =
  | 'Core EMS Services'
  | 'Medical Equipment'
  | 'Call Center & Dispatch'
  | 'Billing & Claims'
  | 'First Responder Tech'
  | 'Training & Simulation'
  | 'Major Sporting Events';

export type ContractType = 
  | 'RFP'
  | 'RFQ'
  | 'RFI'
  | 'Sources Sought'
  | 'Pre-solicitation'
  | 'Sole-Source Notice';

export type Priority = 'high' | 'medium' | 'low';

export type OpportunityStatus = 
  | 'new'
  | 'monitoring'
  | 'in-pipeline'
  | 'archived';
