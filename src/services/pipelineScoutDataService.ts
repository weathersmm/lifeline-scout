import * as XLSX from 'xlsx';

export interface MunicipalityData {
  county: string;
  type: 'County' | 'City';
  website: string;
  doingBusinessWith: string;
  boardOrCouncil: string;
  acqProcurement: string;
  provider911: string;
  providerNEMT: string;
  contractExpiration: string;
  procurementType: string;
  notes: string;
  emsPlan?: string;
  lemsaSite?: string;
}

export interface CountyGroup {
  countyName: string;
  countyData: MunicipalityData;
  cities: MunicipalityData[];
}

// Global procurement and grant sources
export const GLOBAL_SOURCES = [
  { name: "HigherGov", url: "https://www.highergov.com" },
  { name: "ProcureNow (OpenGov)", url: "https://procurement.opengov.com/portal/procurenow" },
  { name: "SAM.gov", url: "https://sam.gov" },
  { name: "Deltek GovWin", url: "https://www.deltek.com/en/government-contracting/govwin" },
  { name: "RFP Mart", url: "https://www.rfpmart.com" },
  { name: "BidSync", url: "https://prod.bidsync.com/bidsync-basic" },
  { name: "DemandStar", url: "https://network.demandstar.com" },
  { name: "Deltek Onvia", url: "https://info.deltek.com/GovWin-Onvia-Try-Now" },
  { name: "Bonfire Hub", url: "https://vendor.bonfirehub.com" },
  { name: "PlanetBids", url: "https://www.planetbids.com/portal/portal.cfm" },
  { name: "CalEProcure", url: "https://caleprocure.ca.gov" },
  { name: "LA County CAMS", url: "https://camisvr.co.la.ca.us/webven/" },
  { name: "Ventura County", url: "https://www.vendorportal.ecms.ventura.org/" },
  { name: "Orange County", url: "https://olb.ocgov.com/business/contract" },
  { name: "Santa Ana", url: "https://www.santa-ana.org/bids-rfps/" },
  { name: "Westminster", url: "https://www.westminster-ca.gov/our-city/finance/rfp" },
  { name: "RAMP LA", url: "https://www.rampla.org/" },
  { name: "CSU BUY", url: "https://www.calstate.edu/csu-system/doing-business-with-the-csu/csubuy" },
  { name: "UC Procurement", url: "https://www.universityofcalifornia.edu/procurement" },
  { name: "UCI Purchasing", url: "https://www.purchasing.uci.edu/" },
  { name: "EMS1 Grants", url: "https://www.ems1.com/ems-grants/" },
  { name: "Fire Grants Help", url: "https://www.firegrantshelp.com/grants/" },
  { name: "HealthBid", url: "https://www.healthbid.org" },
  { name: "ESCI", url: "https://esci.us/" },
  { name: "First Responder Grants", url: "https://www.firstrespondergrants.com/" },
  { name: "NACCHO RFPs", url: "https://www.naccho.org/consulting/rfps" },
  { name: "CA EMSA", url: "https://emsa.ca.gov/" },
  { name: "SafeFleet", url: "https://www.safefleet.net/" },
  { name: "PHI Air Medical", url: "https://www.phi.org/" },
  { name: "EMS World", url: "https://www.emsworld.com/" },
  { name: "NY State Contract Reporter", url: "https://www.nyscr.ny.gov/" },
  { name: "TX SmartBuy", url: "https://www.txsmartbuy.com/esbd" },
  { name: "IL BidBuy", url: "https://www.bidbuy.illinois.gov/" },
  { name: "MA CommBuys", url: "https://www.commbuys.com/" },
  { name: "FL MyFloridaMarketPlace", url: "https://vendor.myfloridamarketplace.com/" },
  { name: "AZ eProcurement", url: "https://app.az.gov/" },
  { name: "NV ePro", url: "https://nevadaepro.com/bso/" },
  { name: "CO DPA", url: "https://codpa-vss.hostams.com/webapp/PRDVSS1X1/AltSelfService" },
  { name: "WA WEBS", url: "https://fortress.wa.gov/ga/webs/" },
  { name: "UT SciQuest", url: "https://solutions.sciquest.com/apps/Router/SupplierLogin?CustOrg=StateOfUtah" },
  { name: "MD eMaryland", url: "https://emma.maryland.gov" },
  { name: "GovQuote", url: "https://www.govquote.us/" },
  { name: "Gov Directions", url: "https://www.govdirections.com/" },
  { name: "Gov Purchase", url: "https://www.govpurchase.com/" },
  { name: "eCivis", url: "https://www.ecivis.com/" },
  { name: "Public Purchase", url: "https://www.publicpurchase.com/" },
  { name: "ProcurementIQ", url: "https://www.procurementiq.com/" },
  { name: "GovTribe", url: "https://www.govtribe.com/" },
  { name: "GovSpend", url: "https://www.govspend.com/" },
  { name: "Grants.gov", url: "https://www.grants.gov/" },
];

class PipelineScoutDataService {
  private workbook: XLSX.WorkBook | null = null;
  private municipalities: MunicipalityData[] = [];
  private countyGroups: Map<string, CountyGroup> = new Map();

  async loadWorkbook() {
    if (this.workbook) return; // Already loaded

    try {
      const response = await fetch('/src/data/PipeLineScout.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
      this.parseMainDataBase();
    } catch (error) {
      console.error('Failed to load PipeLineScout workbook:', error);
      throw error;
    }
  }

  private parseMainDataBase() {
    if (!this.workbook) return;

    const mainSheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(mainSheet);

    this.municipalities = jsonData.map((row: any) => ({
      county: row['County'] || '',
      type: row['County or City'] === 'City' ? 'City' : 'County',
      website: this.normalizeUrl(row['Website']),
      doingBusinessWith: this.normalizeUrl(row['Doing Business With']),
      boardOrCouncil: this.normalizeUrl(row['Board or Council']),
      acqProcurement: this.normalizeUrl(row['AcqProcurement']),
      provider911: row['911 Provider(s)'] || '',
      providerNEMT: row['NEMT Provider(s)'] || '',
      contractExpiration: row['Contract Expiration'] || '',
      procurementType: row['Procurement Type'] || '',
      notes: row['Notes'] || '',
      emsPlan: this.normalizeUrl(row['EMS Plan']),
      lemsaSite: this.normalizeUrl(row['LEMSA Site']),
    }));

    // Group by county
    this.municipalities.forEach(muni => {
      if (muni.type === 'County') {
        if (!this.countyGroups.has(muni.county)) {
          this.countyGroups.set(muni.county, {
            countyName: muni.county,
            countyData: muni,
            cities: [],
          });
        }
      }
    });

    // Add cities to their counties
    this.municipalities.forEach(muni => {
      if (muni.type === 'City') {
        const countyGroup = this.countyGroups.get(muni.county);
        if (countyGroup) {
          countyGroup.cities.push(muni);
        }
      }
    });
  }

  private normalizeUrl(url: string): string {
    if (!url) return '';
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  getCounties(): string[] {
    return Array.from(this.countyGroups.keys()).sort();
  }

  getCountyGroup(countyName: string): CountyGroup | undefined {
    return this.countyGroups.get(countyName);
  }

  getAllCountyGroups(): CountyGroup[] {
    return Array.from(this.countyGroups.values()).sort((a, b) => 
      a.countyName.localeCompare(b.countyName)
    );
  }

  getMunicipalityUrls(muni: MunicipalityData): string[] {
    const urls: string[] = [];
    
    // Prefer AcqProcurement, then Doing Business With, then Website
    if (muni.acqProcurement) {
      urls.push(muni.acqProcurement);
    } else if (muni.doingBusinessWith) {
      urls.push(muni.doingBusinessWith);
    } else if (muni.website) {
      urls.push(muni.website);
    }

    return urls.filter(url => url.length > 0);
  }

  getGlobalSources(): typeof GLOBAL_SOURCES {
    return GLOBAL_SOURCES;
  }
}

export const pipelineScoutDataService = new PipelineScoutDataService();
