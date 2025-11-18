import { Opportunity } from '@/types/opportunity';

export const mockOpportunities: Opportunity[] = [
  {
    id: 'OPP-001',
    title: 'Emergency Medical Services - Ambulance Transport Services',
    agency: 'Alameda County Health Services',
    geography: {
      state: 'California',
      county: 'Alameda County',
      city: 'Oakland'
    },
    serviceTags: ['EMS 911', 'BLS', 'ALS', 'CCT'],
    contractType: 'RFP',
    estimatedValue: {
      min: 5000000,
      max: 8000000
    },
    keyDates: {
      issueDate: '2025-01-15',
      questionsDue: '2025-02-01',
      preBidMeeting: '2025-01-25',
      proposalDue: '2025-03-01'
    },
    termLength: '3 years base + 2 option years',
    link: 'https://www.acgov.org/gsa/purchasing/bid.htm',
    summary: 'Comprehensive emergency ambulance transport services for Alameda County including 911 response, BLS, ALS, and critical care transport. Requires local partnership and CAMTS accreditation.',
    priority: 'high',
    status: 'new',
    source: 'Alameda County Procurement',
    recommendedAction: 'Add to pipeline and assign capture owner immediately. Pre-bid attendance mandatory.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-002',
    title: 'Non-Emergency Medical Transportation Services',
    agency: 'San Francisco Department of Public Health',
    geography: {
      state: 'California',
      county: 'San Francisco County',
      city: 'San Francisco'
    },
    serviceTags: ['Non-Emergency', 'IFT', 'BLS'],
    contractType: 'RFQ',
    estimatedValue: {
      min: 2000000,
      max: 3500000
    },
    keyDates: {
      issueDate: '2025-01-20',
      proposalDue: '2025-02-28'
    },
    termLength: '2 years + 3 option years',
    link: 'https://sf.gov/departments/public-health',
    summary: 'Non-emergency medical transportation for public health patients, including scheduled appointments and interfacility transfers. Priority for minority-owned businesses.',
    priority: 'medium',
    status: 'new',
    source: 'SF DPH Procurement Portal',
    recommendedAction: 'Review minority-owned partnership options. Add to pipeline for Q2 pursuit.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-003',
    title: 'MEDEVAC and Air Ambulance Services - Military Base Support',
    agency: 'U.S. Department of Defense - Travis AFB',
    geography: {
      state: 'California',
      county: 'Solano County'
    },
    serviceTags: ['MEDEVAC', 'ALS', 'CCT'],
    contractType: 'RFP',
    estimatedValue: {
      min: 10000000,
      max: 15000000
    },
    keyDates: {
      issueDate: '2025-02-01',
      questionsDue: '2025-02-20',
      preBidMeeting: '2025-02-10',
      proposalDue: '2025-03-15'
    },
    termLength: '5 years base',
    link: 'https://sam.gov/opportunity/12345',
    summary: 'Air and ground critical care medical evacuation services for Travis Air Force Base. Requires FAA Part 135 certification, military base clearance, and 24/7 coverage capability.',
    priority: 'high',
    status: 'new',
    source: 'SAM.gov',
    recommendedAction: 'High strategic value. Verify FAA certifications and initiate military partnership discussions immediately.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-004',
    title: 'Continuous Quality Improvement Program Implementation',
    agency: 'Contra Costa County EMS Agency',
    geography: {
      state: 'California',
      county: 'Contra Costa County'
    },
    serviceTags: ['CQI'],
    contractType: 'RFP',
    estimatedValue: {
      min: 500000,
      max: 1000000
    },
    keyDates: {
      issueDate: '2025-01-10',
      proposalDue: '2025-02-15'
    },
    termLength: '3 years',
    link: 'https://www.contracosta.ca.gov/procurement',
    summary: 'Design and implement a comprehensive CQI program for county EMS providers. Must include data analytics, training programs, and performance improvement protocols.',
    priority: 'medium',
    status: 'monitoring',
    source: 'Contra Costa Procurement',
    recommendedAction: 'Align with existing CQI capabilities. Schedule meeting with Contra Costa EMS leadership.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-005',
    title: 'EMS Billing and Revenue Cycle Management',
    agency: 'Fresno County',
    geography: {
      state: 'California',
      county: 'Fresno County'
    },
    serviceTags: ['Billing'],
    contractType: 'RFQ',
    estimatedValue: {
      min: 800000,
      max: 1200000
    },
    keyDates: {
      issueDate: '2025-01-25',
      proposalDue: '2025-03-10'
    },
    termLength: '5 years',
    link: 'https://www.co.fresno.ca.us/departments/purchasing',
    summary: 'Complete ambulance billing and revenue cycle management services including claims processing, payment collection, and reporting for county EMS operations.',
    priority: 'low',
    status: 'monitoring',
    source: 'Fresno County Purchasing',
    recommendedAction: 'Low priority - out-of-region unless expansion planned. Monitor for partnership opportunities.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-006',
    title: 'VR Simulation Training Lab for EMS Education',
    agency: 'Sacramento City College',
    geography: {
      state: 'California',
      county: 'Sacramento County',
      city: 'Sacramento'
    },
    serviceTags: ['VR/Sim', 'EMS Tech'],
    contractType: 'RFP',
    estimatedValue: {
      min: 300000,
      max: 600000
    },
    keyDates: {
      issueDate: '2025-02-05',
      questionsDue: '2025-02-25',
      proposalDue: '2025-03-20'
    },
    termLength: '1 year with renewal option',
    link: 'https://www.scc.losrios.edu/procurement',
    summary: 'Develop and implement VR simulation training scenarios for EMT and Paramedic students. Must integrate with existing curriculum and provide ongoing content updates.',
    priority: 'medium',
    status: 'new',
    source: 'Sacramento Community College District',
    recommendedAction: 'Identify VR/simulation technology partners. Good strategic fit for training innovation showcase.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-007',
    title: 'Sources Sought: Mobile Integrated Healthcare Program',
    agency: 'Santa Clara County Public Health',
    geography: {
      state: 'California',
      county: 'Santa Clara County'
    },
    serviceTags: ['EMS 911', 'Non-Emergency', 'ALS'],
    contractType: 'Sources Sought',
    keyDates: {
      issueDate: '2025-01-30',
      proposalDue: '2025-02-20'
    },
    link: 'https://www.sccgov.org/procurement',
    summary: 'Early market research for potential mobile integrated healthcare and community paramedicine program. Response will inform future RFP development.',
    priority: 'high',
    status: 'new',
    source: 'Santa Clara County Procurement',
    recommendedAction: 'Respond to sources sought to position for future RFP. Excellent strategic opportunity for MIH expansion.',
    isHot: false,
    hotFlaggedType: undefined
  },
  {
    id: 'OPP-008',
    title: 'ePCR and CAD Integration Platform',
    agency: 'Marin County EMS',
    geography: {
      state: 'California',
      county: 'Marin County'
    },
    serviceTags: ['EMS Tech'],
    contractType: 'RFI',
    estimatedValue: {
      min: 250000,
      max: 500000
    },
    keyDates: {
      issueDate: '2025-01-18',
      proposalDue: '2025-02-28'
    },
    termLength: '3 years',
    link: 'https://www.marincounty.org/procurement',
    summary: 'Electronic patient care reporting system with CAD integration for all county EMS providers. Must support NEMSIS 3.5 and provide real-time data sharing capabilities.',
    priority: 'low',
    status: 'monitoring',
    source: 'Marin County',
    recommendedAction: 'Technology-focused - partner with ePCR vendors if pursuing. Lower priority for direct pursuit.',
    isHot: false,
    hotFlaggedType: undefined
  }
];
