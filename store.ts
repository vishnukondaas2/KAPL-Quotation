
import { supabase } from './supabaseClient';
import { AppState, Term, BOMItem, ProductPricing, Quotation, ProductDescription, BOMTemplate, User } from './types';

// Default Constants
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

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-01',
    name: 'Administrator',
    username: 'admin',
    password: 'admin123',
    role: 'admin'
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
  users: DEFAULT_USERS,
  quotations: [],
  nextId: 1000
};

// --- API FUNCTIONS ---

const isEmpty = (obj: any) => !obj || (typeof obj === 'object' && Object.keys(obj).length === 0);
const isArrayEmpty = (arr: any) => !arr || (Array.isArray(arr) && arr.length === 0);

const seedDatabase = async () => {
  console.log("Seeding database with initial state...");
  await saveSettingsToSupabase(INITIAL_STATE);
};

export const fetchFullState = async (): Promise<AppState> => {
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('singleton_key', 'global')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError);
    }

    const { data: quotesData, error: quotesError } = await supabase
      .from('quotations')
      .select('*');

    if (quotesError) {
      console.error('Error fetching quotations:', quotesError);
    }

    const settings = settingsData || {};

    // If fresh DB, seed it
    if (!settingsData) {
        seedDatabase();
    }

    const parsedQuotes: Quotation[] = quotesData?.map((row: any) => row.data) || [];
    
    let maxId = 1000;
    parsedQuotes.forEach(q => {
      // Check for both old KAPL and new KLMNRE prefixes for ID generation logic
      const match = q.id.match(/(?:KAPL|KLMNRE)-(\d+)/); 
      if (match && match[1]) {
        const num = parseInt(match[1]);
        if (num > maxId) maxId = num;
      }
    });

    let productDescs = settings.product_descriptions;
    if (productDescs && productDescs.length > 0 && typeof productDescs[0] === 'string') {
      productDescs = productDescs.map((name: string, idx: number) => ({
        id: `legacy-${idx}`,
        name: name,
        defaultPricingId: '',
        defaultBomTemplateId: ''
      }));
    } else if (!productDescs || productDescs.length === 0) {
      productDescs = INITIAL_STATE.productDescriptions;
    }

    // ROBUST USER FETCHING: Explicitly check for the 'users' field
    // If settings.users is missing/null, it implies the column is missing in DB or empty.
    let users = settings.users;
    if (!users || !Array.isArray(users) || users.length === 0) {
        console.warn("Users list missing in DB or empty. Falling back to default admin.");
        users = INITIAL_STATE.users;
    }

    return {
      company: !isEmpty(settings.company) ? settings.company : INITIAL_STATE.company,
      bank: !isEmpty(settings.bank) ? settings.bank : INITIAL_STATE.bank,
      productPricing: !isArrayEmpty(settings.pricing) ? settings.pricing : INITIAL_STATE.productPricing,
      warranty: !isEmpty(settings.warranty) ? settings.warranty : INITIAL_STATE.warranty,
      terms: !isArrayEmpty(settings.terms) ? settings.terms : INITIAL_STATE.terms,
      bomTemplates: !isArrayEmpty(settings.bom_templates) ? settings.bom_templates : INITIAL_STATE.bomTemplates,
      productDescriptions: productDescs,
      users: users,
      quotations: parsedQuotes,
      nextId: maxId + 1
    };

  } catch (err) {
    console.error("Unexpected error fetching state:", err);
    return INITIAL_STATE;
  }
};

export const saveSettingsToSupabase = async (state: AppState): Promise<boolean> => {
  // Explicitly map columns to ensure we don't send undefined if state is malformed
  const payload = {
      singleton_key: 'global',
      company: state.company,
      bank: state.bank,
      pricing: state.productPricing,
      warranty: state.warranty,
      terms: state.terms,
      bom_templates: state.bomTemplates,
      product_descriptions: state.productDescriptions,
      users: state.users // Vital: This must match the SQL column name
  };

  const { error } = await supabase
    .from('settings')
    .upsert(payload, { onConflict: 'singleton_key' });

  if (error) {
    console.error("Error saving settings to Supabase:", error);
    if (error.code === '42703' || (error.message && error.message.includes('users'))) {
       alert("DATABASE ERROR: The 'users' column is missing in Supabase. Please run the SQL Script provided in the dashboard.");
    } else {
       console.error("Save failed details:", error.message);
    }
    return false;
  }
  
  return true;
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
