import { ServiceTag, OpportunityCategory, Opportunity } from '@/types/opportunity';

// Map service tags to categories
const serviceTagToCategory: Record<ServiceTag, OpportunityCategory> = {
  'EMS 911': 'Core EMS Services',
  'Non-Emergency': 'Core EMS Services',
  'IFT': 'Core EMS Services',
  'BLS': 'Core EMS Services',
  'ALS': 'Core EMS Services',
  'CCT': 'Core EMS Services',
  'MEDEVAC': 'Core EMS Services',
  'Call Center': 'Call Center & Dispatch',
  'Billing': 'Billing & Claims',
  'EMS Tech': 'First Responder Tech',
  'VR/Sim': 'Training & Simulation',
  'CQI': 'Training & Simulation',
};

// Keywords that indicate medical equipment opportunities
const medicalEquipmentKeywords = [
  'equipment', 'device', 'monitor', 'defibrillator', 'stretcher', 'gurney',
  'oxygen', 'ventilator', 'surgical', 'medical supplies', 'imaging', 'mri',
  'ct scan', 'x-ray', 'ultrasound', 'ecg', 'ekg', 'patient warming',
  'patient cooling', 'hospital bed', 'wheelchair', 'ambulance equipment'
];

/**
 * Determine if an opportunity is medical equipment based on title and summary
 */
export function isMedicalEquipment(opportunity: Opportunity): boolean {
  const searchText = `${opportunity.title} ${opportunity.summary}`.toLowerCase();
  return medicalEquipmentKeywords.some(keyword => searchText.includes(keyword));
}

/**
 * Get all categories for an opportunity
 */
export function getOpportunityCategories(opportunity: Opportunity): OpportunityCategory[] {
  const categories = new Set<OpportunityCategory>();
  
  // Add categories based on service tags
  opportunity.serviceTags.forEach(tag => {
    const category = serviceTagToCategory[tag];
    if (category) {
      categories.add(category);
    }
  });
  
  // Check if it's medical equipment
  if (isMedicalEquipment(opportunity)) {
    categories.add('Medical Equipment');
  }
  
  return Array.from(categories);
}

/**
 * Filter opportunities by selected categories
 */
export function filterByCategories(
  opportunities: Opportunity[],
  selectedCategories: OpportunityCategory[]
): Opportunity[] {
  if (selectedCategories.length === 0) {
    return opportunities;
  }
  
  return opportunities.filter(opp => {
    const oppCategories = getOpportunityCategories(opp);
    return selectedCategories.some(cat => oppCategories.includes(cat));
  });
}

export const allCategories: OpportunityCategory[] = [
  'Core EMS Services',
  'Medical Equipment',
  'Call Center & Dispatch',
  'Billing & Claims',
  'First Responder Tech',
  'Training & Simulation',
];