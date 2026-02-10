
import { supabase } from './supabaseClient';
import { AppState, Term, BOMItem, ProductPricing, Quotation, ProductDescription, BOMTemplate } from './types';

// Default Constants (Keep these for fallbacks)
const DEFAULT_TERMS: Term[] = [
  { id: '1', text: 'Structure height will be 1 to 3 feet from floor level.', enabled: true, order: 1 },
  { id: '2', text: 'KSEB application & registration charges are included in the above cost.', enabled: true, order: 2 },
  { id: '3', text: 'The customer shall provide necessary space and shadow-free area for installation.', enabled: true, order: 3 },
  { id: '4', text: 'Civil works like concrete foundation if needed will be extra.', enabled: true, order: 4 },
  { id: '5', text: 'The subsidy will be credited to the customer account as per govt norms.', enabled: true, order: 5 },
  { id: '6', text: 'Any additional cabling beyond 30 meters will be charged extra.', enabled: true, order: 6 },
];

const DEFAULT_BOM_3KW: BOMItem[] = [
  { id: '1', product: 'Solar Panels', uom: 'Nos', quantity: '8', specification: '550Wp Mono PERC', make: 'Adani/Waaree' },
  { id: '2', product: 'On-Grid Inverter', uom: 'No', quantity: '1', specification: '3kW String Inverter', make: 'Growatt/Solis' },
  { id: '3', product: 'DC SPD', uom: 'Nos', quantity: '2', specification: 'Type II 600V', make: 'Citel/Suntree' },
  { id: '4', product: 'DC Fuse', uom: 'Nos', quantity: '2', specification: '15A/1000V', make: 'Mersen' },
  { id: '5', product: 'DC Cable', uom: 'Mtrs', quantity: '30', specification: '4sqmm multi strand', make: 'Polycab/Siechem' },
  { id: '10', product: 'Lightning Arrester', uom: 'Set', quantity: '1', specification: 'Solid Copper 1M', make: 'Standard' },
];

const DEFAULT_PRICING: ProductPricing[] = [
  {
    id: 'p3kw',
    name: '3kW Standard Pricing',
    onGridSystemCost: 185000,
    rooftopPlantCost: 185000,
    subsidyAmount: 78000,
    ksebCharges: 0,
    additionalMaterialCost: 0,
    customizedStructureCost: 0
  },
  {
    id: 'p5kw',
    name: '5kW Standard Pricing',
    onGridSystemCost: 295000,
    rooftopPlantCost: 295000,
    subsidyAmount: 78000,
    ksebCharges: 0,
    additionalMaterialCost: 0,
    customizedStructureCost: 0
  }
];

export const INITIAL_STATE: AppState = {
  company: {
    name: 'Kondaas Automation Pvt Ltd',
    headOffice: '123, Solar Plaza, Opp. KSEB, Kochi, Kerala',
    regionalOffice1: 'Branch Office, Trivandrum, Kerala',
    regionalOffice2: 'Service Center, Calicut, Kerala',
    phone: '+91 9876543210',
    email: 'info@kondaas.com',
    website: 'www.kondaas.com',
    logo: '', 
    seal: '',
    gstin: '32AAAAA0000A1Z5'
  },
  bank: {
    companyName: 'Kondaas Automation Private Limited',
    bankName: 'HDFC BANK',
    accountNumber: '50200012345678',
    branch: 'Cochin Main',
    ifsc: 'HDFC0000123',
    address: 'M.G. Road, Cochin',
    pan: 'ABCDE1234F',
    upiId: 'kondaas@hdfc',
    gstNumber: '32AAAAA0000A1Z5'
  },
  productPricing: DEFAULT_PRICING,
  warranty: {
    panelWarranty: '25 Years Performance Warranty (Adani Solar)',
    inverterWarranty: '5 to 10 Years Product Warranty (On-Grid String)',
    systemWarranty: '5 Years Free Service (Kondaas Automation)',
    monitoringSystem: 'Standard Online Monitoring (Wi-Fi Required)'
  },
  terms: DEFAULT_TERMS,
  bomTemplates: [
    { id: '3kw-std', name: '3kW Standard On-Grid', items: DEFAULT_BOM_3KW }
  ],
  productDescriptions: [
    { id: '1', name: '3kW ON-GRID SOLAR POWER GENERATING SYSTEM', defaultPricingId: 'p3kw', defaultBomTemplateId: '3kw-std' },
    { id: '2', name: '5kW ON-GRID SOLAR POWER GENERATING SYSTEM', defaultPricingId: 'p5kw', defaultBomTemplateId: '' },
    { id: '3', name: '10kW ON-GRID SOLAR POWER GENERATING SYSTEM', defaultPricingId: '', defaultBomTemplateId: '' }
  ],
  quotations: [],
  nextId: 1000
};

// --- API FUNCTIONS ---

// Helpers to check for empty objects/arrays from DB (which happens on fresh install)
const isEmpty = (obj: any) => !obj || (typeof obj === 'object' && Object.keys(obj).length === 0);
const isArrayEmpty = (arr: any) => !arr || (Array.isArray(arr) && arr.length === 0);

export const fetchFullState = async (): Promise<AppState> => {
  try {
    // 1. Fetch Settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('singleton_key', 'global')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError);
    }

    // 2. Fetch Quotations
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotations')
      .select('*');

    if (quotesError) {
      console.error('Error fetching quotations:', quotesError);
    }

    // 3. Merge with Initial State
    // We use the defaults if the DB returns empty objects (fresh table)
    const settings = settingsData || {};
    
    // Parse Quotations from DB format back to App format
    const parsedQuotes: Quotation[] = quotesData?.map((row: any) => row.data) || [];
    
    // Calculate nextId based on existing quotes
    let maxId = 1000;
    parsedQuotes.forEach(q => {
      // Extract number from KAPL-1001/02-24
      const match = q.id.match(/KAPL-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1]);
        if (num > maxId) maxId = num;
      }
    });

    // Handle Migration: Check if productDescriptions is legacy string[] or new ProductDescription[]
    let productDescs = settings.product_descriptions;
    if (productDescs && productDescs.length > 0 && typeof productDescs[0] === 'string') {
      // Convert legacy strings to objects
      productDescs = productDescs.map((name: string, idx: number) => ({
        id: `legacy-${idx}`,
        name: name,
        defaultPricingId: '',
        defaultBomTemplateId: ''
      }));
    } else if (!productDescs || productDescs.length === 0) {
      productDescs = INITIAL_STATE.productDescriptions;
    }

    return {
      company: !isEmpty(settings.company) ? settings.company : INITIAL_STATE.company,
      bank: !isEmpty(settings.bank) ? settings.bank : INITIAL_STATE.bank,
      productPricing: !isArrayEmpty(settings.pricing) ? settings.pricing : INITIAL_STATE.productPricing,
      warranty: !isEmpty(settings.warranty) ? settings.warranty : INITIAL_STATE.warranty,
      terms: !isArrayEmpty(settings.terms) ? settings.terms : INITIAL_STATE.terms,
      bomTemplates: !isArrayEmpty(settings.bom_templates) ? settings.bom_templates : INITIAL_STATE.bomTemplates,
      productDescriptions: productDescs,
      quotations: parsedQuotes,
      nextId: maxId + 1
    };

  } catch (err) {
    console.error("Unexpected error fetching state:", err);
    return INITIAL_STATE;
  }
};

export const saveSettingsToSupabase = async (state: AppState) => {
  const { error } = await supabase
    .from('settings')
    .update({
      company: state.company,
      bank: state.bank,
      pricing: state.productPricing,
      warranty: state.warranty,
      terms: state.terms,
      bom_templates: state.bomTemplates,
      product_descriptions: state.productDescriptions
    })
    .eq('singleton_key', 'global');

  if (error) console.error("Error saving settings:", error);
};

export const saveQuotationToSupabase = async (quotation: Quotation) => {
  const { error } = await supabase
    .from('quotations')
    .upsert({
      id: quotation.id,
      customer_name: quotation.customerName,
      data: quotation
    }, { onConflict: 'id' });

  if (error) console.error("Error saving quotation:", error);
};

export const deleteQuotationFromSupabase = async (id: string) => {
  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', id);

  if (error) console.error("Error deleting quotation:", error);
};
