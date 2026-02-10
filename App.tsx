
import React, { useState, useEffect, useRef } from 'react';
import { fetchFullState, saveSettingsToSupabase, saveQuotationToSupabase, deleteQuotationFromSupabase, INITIAL_STATE } from './store';
import { AppState, Quotation, BOMTemplate, BOMItem, ProductPricing, ProductDescription } from './types';
import AdminPanel from './components/AdminPanel';
import QuotationForm from './components/QuotationForm';
import PrintableView from './components/PrintableView';
import { LogIn, FileText, Settings, LayoutDashboard, PlusCircle, LogOut, Trash2, Plus, Copy, ChevronDown, ChevronUp, Loader2, Link } from 'lucide-react';

declare var html2pdf: any;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'settings'>('dashboard');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [printingQuote, setPrintingQuote] = useState<Quotation | null>(null);
  const [downloadingQuote, setDownloadingQuote] = useState<Quotation | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  // Load Initial Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const dbState = await fetchFullState();
      setState(dbState);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'admin123') {
      setIsLoggedIn(true);
    } else {
      alert('Invalid password! Hint: admin123');
    }
  };

  const handleCreateQuotation = async (q: Quotation) => {
    // 1. Update Local State for immediate UI feedback
    const isEdit = state.quotations.some(item => item.id === q.id);
    let newState: AppState;
    
    if (isEdit) {
      newState = {
        ...state,
        quotations: state.quotations.map(item => item.id === q.id ? q : item)
      };
    } else {
      newState = {
        ...state,
        quotations: [...state.quotations, q],
        nextId: state.nextId + 1
      };
    }
    setState(newState);
    setActiveTab('dashboard');

    // 2. Persist to Supabase
    await saveQuotationToSupabase(q);
  };

  const handleDeleteQuotation = async (id: string) => {
    if (confirm('Delete this quotation?')) {
      // Update Local
      setState(prev => ({ ...prev, quotations: prev.quotations.filter(q => q.id !== id) }));
      // Update DB
      await deleteQuotationFromSupabase(id);
    }
  };

  const handleSaveTemplate = (name: string, items: BOMItem[]) => {
    const newTemplate: BOMTemplate = {
      id: Date.now().toString(),
      name,
      items
    };
    const newState = {
      ...state,
      bomTemplates: [...state.bomTemplates, newTemplate]
    };
    setState(newState);
    // Templates are part of settings
    saveSettingsToSupabase(newState);
    alert(`BOM saved as template: ${name}`);
  };

  // Wrapper for Settings updates to sync with DB
  const handleSettingsUpdate = (newState: AppState) => {
    setState(newState);
    // Debounce this in production, but for now we save directly
    saveSettingsToSupabase(newState);
  };

  const editQuotation = (q: Quotation) => {
    setSelectedQuotation(q);
    setActiveTab('create');
  };

  const handlePrint = (q: Quotation) => {
    setPrintingQuote(q);
    setTimeout(() => {
      window.print();
      setPrintingQuote(null);
    }, 250);
  };

  const handleDownloadPDF = async (q: Quotation) => {
    setDownloadingQuote(q);
    
    setTimeout(async () => {
      if (!pdfRef.current) return;
      
      const element = pdfRef.current;
      const opt = {
        margin: 0,
        filename: `${q.customerName}_${q.discomNumber || 'NA'}_${q.id}.pdf`,
        image: { type: 'jpeg', quality: 0.8 }, 
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          windowWidth: 794 
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait', 
          compress: true,
          putOnlyUsedFonts: true
        },
        pagebreak: { mode: 'css' }
      };

      try {
        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF. Please use the Print button instead.");
      } finally {
        setDownloadingQuote(null);
      }
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Connecting to Database...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Solar Quote Pro</h1>
            <p className="text-gray-500 mt-2">Admin Authentication</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500" 
                placeholder="Enter admin password"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogIn className="w-5 h-5 mr-2" /> Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row no-print">
        <aside className="w-full md:w-64 bg-black text-white flex-shrink-0">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-red-600">KAPL Admin</h2>
            <p className="text-xs text-gray-400">Solar Quote Manager</p>
          </div>
          <nav className="mt-4 px-4 space-y-2">
            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedQuotation(null); }}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab('create'); setSelectedQuotation(null); }}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'create' ? 'bg-red-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
            >
              <PlusCircle className="w-5 h-5 mr-3" /> Create Quote
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-red-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
            >
              <Settings className="w-5 h-5 mr-3" /> Config Panel
            </button>
          </nav>
          <div className="mt-auto p-4">
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" /> Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && (
              <AdminPanel 
                state={state} 
                onEdit={editQuotation}
                onPrint={handlePrint}
                onDownload={handleDownloadPDF}
                onDelete={handleDeleteQuotation}
              />
            )}
            {activeTab === 'create' && (
              <QuotationForm 
                state={state} 
                editData={selectedQuotation}
                onSave={handleCreateQuotation}
                onSaveTemplate={handleSaveTemplate}
                onCancel={() => setActiveTab('dashboard')}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                state={state} 
                onUpdate={handleSettingsUpdate} 
              />
            )}
          </div>
        </main>
      </div>

      {printingQuote && (
        <div className="print-only">
          <PrintableView quotation={printingQuote} state={state} />
        </div>
      )}

      {downloadingQuote && (
        <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -1 }}>
          <div ref={pdfRef} className="pdf-container">
            <PrintableView quotation={downloadingQuote} state={state} />
          </div>
        </div>
      )}

      {downloadingQuote && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-[9999] no-print">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Generating Optimized PDF</h2>
            <p className="text-sm text-gray-500">Fixing layout alignment and clearing blank pages...</p>
          </div>
        </div>
      )}
    </>
  );
};

// ... SettingsView Component remains same but uses new props ...
const SettingsView: React.FC<{ state: AppState, onUpdate: (s: AppState) => void }> = ({ state, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'pricing' | 'terms' | 'bank' | 'warranty' | 'bom' | 'products'>('company');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const updateSub = (key: keyof AppState, data: any) => {
    onUpdate({ ...state, [key]: data });
  };

  const handleAddPricing = () => {
    const newId = Date.now().toString();
    const newItem: ProductPricing = {
      id: newId,
      name: 'New Product Pricing',
      onGridSystemCost: 0,
      rooftopPlantCost: 0,
      subsidyAmount: 0,
      ksebCharges: 0,
      additionalMaterialCost: 0,
      customizedStructureCost: 0
    };
    updateSub('productPricing', [...state.productPricing, newItem]);
    setEditingItemId(newId);
  };

  const updatePricingItem = (id: string, updates: Partial<ProductPricing>) => {
    updateSub('productPricing', state.productPricing.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePricingItem = (id: string) => {
    updateSub('productPricing', state.productPricing.filter(p => p.id !== id));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSub('company', { ...state.company, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSub('company', { ...state.company, seal: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTemplate = () => {
    const newId = Date.now().toString();
    const newTemplate: BOMTemplate = { 
      id: newId, 
      name: 'New BOM Template', 
      items: [] 
    };
    updateSub('bomTemplates', [...state.bomTemplates, newTemplate]);
    setExpandedTemplateId(newId);
  };

  const handleDuplicateTemplate = (template: BOMTemplate) => {
    const newId = Date.now().toString();
    const copy: BOMTemplate = {
      ...template,
      id: newId,
      name: `${template.name} (Copy)`,
      items: template.items.map((item, idx) => ({ ...item, id: `${newId}-${idx}` }))
    };
    updateSub('bomTemplates', [...state.bomTemplates, copy]);
    setExpandedTemplateId(newId);
  };

  const handleUpdateTemplate = (id: string, updates: Partial<BOMTemplate>) => {
    updateSub('bomTemplates', state.bomTemplates.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("Delete this BOM template?")) {
      updateSub('bomTemplates', state.bomTemplates.filter(t => t.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {(['company', 'pricing', 'terms', 'bank', 'warranty', 'bom', 'products'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-6 py-4 text-sm font-medium capitalize whitespace-nowrap transition-colors ${activeSubTab === tab ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'bom' ? 'BOM Templates' : tab === 'products' ? 'Product Names & Links' : tab === 'pricing' ? 'Pricing Table' : tab}
          </button>
        ))}
      </div>
      <div className="p-8">
        {activeSubTab === 'company' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Company Profile</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex items-center gap-6 p-4 border rounded-lg bg-gray-50">
                  {state.company.logo && <img src={state.company.logo} className="h-16 w-auto object-contain border bg-white p-1 rounded" alt="Logo" />}
                  <div>
                    <label className="bg-white border px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-50 inline-block">
                      Change Logo
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
               </div>

               <div className="flex items-center gap-6 p-4 border rounded-lg bg-gray-50">
                  {state.company.seal && <img src={state.company.seal} className="h-16 w-auto object-contain border bg-white p-1 rounded" alt="Seal" />}
                  <div>
                    <label className="bg-white border px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-50 inline-block">
                      Upload Official Seal
                      <input type="file" className="hidden" accept="image/*" onChange={handleSealUpload} />
                    </label>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs uppercase font-black text-gray-400 mb-1">Company Full Name</label>
                <input value={state.company.name} onChange={e => updateSub('company', { ...state.company, name: e.target.value })} className="w-full border p-2 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase font-black text-gray-400 mb-1">Head Office Address</label>
                <textarea value={state.company.headOffice} onChange={e => updateSub('company', { ...state.company, headOffice: e.target.value })} className="w-full border p-2 rounded" rows={2} />
              </div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Regional Branch 1</label><input value={state.company.regionalOffice1} onChange={e => updateSub('company', { ...state.company, regionalOffice1: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Regional Branch 2</label><input value={state.company.regionalOffice2} onChange={e => updateSub('company', { ...state.company, regionalOffice2: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">GSTIN</label><input value={state.company.gstin} onChange={e => updateSub('company', { ...state.company, gstin: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Contact Phone</label><input value={state.company.phone} onChange={e => updateSub('company', { ...state.company, phone: e.target.value })} className="w-full border p-2 rounded" /></div>
            </div>
          </div>
        )}

        {activeSubTab === 'pricing' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Standard Pricing Packages</h3>
              <button onClick={handleAddPricing} className="bg-black text-white px-4 py-2 rounded text-sm font-bold flex items-center"><Plus className="w-4 h-4 mr-2" /> New Pricing Model</button>
            </div>
            <div className="space-y-4">
              {state.productPricing.map(p => (
                <div key={p.id} className="border rounded-lg bg-gray-50 overflow-hidden">
                  <div className="p-4 bg-white flex justify-between items-center border-b">
                    <input className="font-bold text-gray-900 bg-transparent border-b border-transparent focus:border-red-600 outline-none flex-1 mr-4" value={p.name} onChange={e => updatePricingItem(p.id, { name: e.target.value })} placeholder="Pricing Package Name" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingItemId(editingItemId === p.id ? null : p.id)} className="text-xs font-bold text-blue-600 border px-3 py-1 rounded">{editingItemId === p.id ? 'Save' : 'Edit Prices'}</button>
                      <button onClick={() => deletePricingItem(p.id)} className="text-red-600 p-1"><Trash2 className="w-4 h-4" /> </button>
                    </div>
                  </div>
                  {editingItemId === p.id && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">On-Grid System Cost (₹)</label><input type="number" value={p.onGridSystemCost} onChange={e => updatePricingItem(p.id, { onGridSystemCost: Number(e.target.value), rooftopPlantCost: Number(e.target.value) })} className="w-full border p-2 rounded bg-white" /></div>
                      <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Subsidy Amount (₹)</label><input type="number" value={p.subsidyAmount} onChange={e => updatePricingItem(p.id, { subsidyAmount: Number(e.target.value) })} className="w-full border p-2 rounded bg-white" /></div>
                      <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">KSEB Charges</label><input type="number" value={p.ksebCharges} onChange={e => updatePricingItem(p.id, { ksebCharges: Number(e.target.value) })} className="w-full border p-2 rounded bg-white" /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Product Headings & Auto-Links</h3>
              <button 
                onClick={() => updateSub('productDescriptions', [...state.productDescriptions, { id: Date.now().toString(), name: 'New Product', defaultPricingId: '', defaultBomTemplateId: '' }])} 
                className="bg-black text-white px-4 py-2 rounded text-sm font-bold flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </button>
            </div>
            
            <div className="space-y-3">
              {state.productDescriptions.map((desc, idx) => (
                <div key={desc.id || idx} className="grid grid-cols-12 gap-3 p-4 border rounded items-start bg-gray-50">
                  <div className="col-span-5">
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Product Description</label>
                    <textarea 
                      className="w-full bg-white border p-2 rounded text-sm font-medium" 
                      value={desc.name} 
                      rows={2}
                      onChange={e => { 
                        const newList = [...state.productDescriptions]; 
                        newList[idx] = { ...desc, name: e.target.value }; 
                        updateSub('productDescriptions', newList); 
                      }} 
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Link Default Pricing</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-white border p-2 rounded text-xs appearance-none pr-6 truncate"
                        value={desc.defaultPricingId || ''}
                        onChange={e => {
                           const newList = [...state.productDescriptions]; 
                           newList[idx] = { ...desc, defaultPricingId: e.target.value }; 
                           updateSub('productDescriptions', newList); 
                        }}
                      >
                        <option value="">-- No Auto Select --</option>
                        {state.productPricing.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <Link className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Link Default BOM</label>
                     <div className="relative">
                      <select 
                        className="w-full bg-white border p-2 rounded text-xs appearance-none pr-6 truncate"
                        value={desc.defaultBomTemplateId || ''}
                        onChange={e => {
                           const newList = [...state.productDescriptions]; 
                           newList[idx] = { ...desc, defaultBomTemplateId: e.target.value }; 
                           updateSub('productDescriptions', newList); 
                        }}
                      >
                        <option value="">-- No Auto Select --</option>
                        {state.bomTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <Link className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end mt-5">
                    <button 
                      onClick={() => updateSub('productDescriptions', state.productDescriptions.filter((_, i) => i !== idx))} 
                      className="text-red-600 p-2 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'terms' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Standard Terms</h3><button onClick={() => updateSub('terms', [...state.terms, { id: Date.now().toString(), text: 'New Term', enabled: true, order: state.terms.length + 1 }])} className="bg-black text-white px-4 py-2 rounded text-sm font-bold">Add New Term</button></div>
            <div className="space-y-3">
              {state.terms.sort((a,b) => a.order - b.order).map((term, idx) => (
                <div key={term.id} className="flex items-start gap-4 p-4 border rounded bg-gray-50">
                  <span className="mt-1 font-bold text-gray-400">{idx + 1}.</span>
                  <textarea value={term.text} onChange={e => updateSub('terms', state.terms.map(t => t.id === term.id ? { ...t, text: e.target.value } : t))} className="flex-1 border-0 bg-transparent focus:ring-0 p-0 text-sm" rows={2} />
                  <div className="flex items-center gap-4 self-center">
                    <input type="checkbox" checked={term.enabled} onChange={e => updateSub('terms', state.terms.map(t => t.id === term.id ? { ...t, enabled: e.target.checked } : t))} className="w-5 h-5 accent-red-600" />
                    <button onClick={() => updateSub('terms', state.terms.filter(t => t.id !== term.id))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'bank' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Remittance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2"><label className="block text-xs uppercase font-black text-gray-400 mb-1">Account Beneficiary Name</label><input value={state.bank.companyName} onChange={e => updateSub('bank', { ...state.bank, companyName: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Bank Name</label><input value={state.bank.bankName} onChange={e => updateSub('bank', { ...state.bank, bankName: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Branch Name</label><input value={state.bank.branch} onChange={e => updateSub('bank', { ...state.bank, branch: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Account Number</label><input value={state.bank.accountNumber} onChange={e => updateSub('bank', { ...state.bank, accountNumber: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">IFSC Code</label><input value={state.bank.ifsc} onChange={e => updateSub('bank', { ...state.bank, ifsc: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">GST Number (GSTIN)</label><input value={state.bank.gstNumber} onChange={e => updateSub('bank', { ...state.bank, gstNumber: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">PAN Number</label><input value={state.bank.pan} onChange={e => updateSub('bank', { ...state.bank, pan: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">UPI ID</label><input value={state.bank.upiId} onChange={e => updateSub('bank', { ...state.bank, upiId: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div className="md:col-span-2"><label className="block text-xs uppercase font-black text-gray-400 mb-1">Bank Address</label><textarea value={state.bank.address} onChange={e => updateSub('bank', { ...state.bank, address: e.target.value })} className="w-full border p-2 rounded" rows={2}/></div>
            </div>
          </div>
        )}

        {activeSubTab === 'warranty' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Standard Warranty Declarations</h3>
            <div className="grid grid-cols-1 gap-6">
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Solar Panel Warranty Statement</label><input value={state.warranty.panelWarranty} onChange={e => updateSub('warranty', { ...state.warranty, panelWarranty: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">Inverter Warranty Statement</label><input value={state.warranty.inverterWarranty} onChange={e => updateSub('warranty', { ...state.warranty, inverterWarranty: e.target.value })} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-xs uppercase font-black text-gray-400 mb-1">System Free Service Period</label><input value={state.warranty.systemWarranty} onChange={e => updateSub('warranty', { ...state.warranty, systemWarranty: e.target.value })} className="w-full border p-2 rounded" /></div>
            </div>
          </div>
        )}

        {activeSubTab === 'bom' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Bill of Materials Templates</h3>
              <button onClick={handleCreateTemplate} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center">
                <Plus className="w-4 h-4 mr-2" /> Create BOM Template
              </button>
            </div>
            
            <div className="space-y-4">
              {state.bomTemplates.map(template => (
                <div key={template.id} className="border rounded-lg bg-gray-50 overflow-hidden transition-all duration-200">
                  <div className="p-4 flex items-center gap-4">
                    <button 
                      onClick={() => setExpandedTemplateId(expandedTemplateId === template.id ? null : template.id)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500"
                    >
                      {expandedTemplateId === template.id ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                    </button>
                    
                    <input 
                      className="font-bold bg-transparent border-b border-transparent focus:border-red-600 outline-none flex-1 px-2 py-1" 
                      value={template.name} 
                      onChange={e => handleUpdateTemplate(template.id, { name: e.target.value })}
                    />

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDuplicateTemplate(template)}
                        className="text-blue-600 p-2 hover:bg-blue-50 rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4"/>
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(template.id)} 
                        className="text-red-500 p-2 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  {expandedTemplateId === template.id && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm mb-4">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="font-normal p-2">Product</th>
                              <th className="font-normal p-2 w-24">UOM</th>
                              <th className="font-normal p-2 w-24">Qty</th>
                              <th className="font-normal p-2">Spec</th>
                              <th className="font-normal p-2">Make</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {template.items.map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td className="p-1">
                                  <input 
                                    className="w-full border rounded p-1.5 focus:border-red-500 outline-none" 
                                    value={item.product} 
                                    placeholder="Product Name"
                                    onChange={e => {
                                      const newItems = [...template.items];
                                      newItems[idx] = { ...item, product: e.target.value };
                                      handleUpdateTemplate(template.id, { items: newItems });
                                    }} 
                                  />
                                </td>
                                <td className="p-1">
                                  <input 
                                    className="w-full border rounded p-1.5 focus:border-red-500 outline-none" 
                                    value={item.uom} 
                                    placeholder="UOM"
                                    onChange={e => {
                                      const newItems = [...template.items];
                                      newItems[idx] = { ...item, uom: e.target.value };
                                      handleUpdateTemplate(template.id, { items: newItems });
                                    }} 
                                  />
                                </td>
                                <td className="p-1">
                                  <input 
                                    className="w-full border rounded p-1.5 focus:border-red-500 outline-none" 
                                    value={item.quantity} 
                                    placeholder="Qty"
                                    onChange={e => {
                                      const newItems = [...template.items];
                                      newItems[idx] = { ...item, quantity: e.target.value };
                                      handleUpdateTemplate(template.id, { items: newItems });
                                    }} 
                                  />
                                </td>
                                <td className="p-1">
                                  <input 
                                    className="w-full border rounded p-1.5 focus:border-red-500 outline-none" 
                                    value={item.specification} 
                                    placeholder="Specification"
                                    onChange={e => {
                                      const newItems = [...template.items];
                                      newItems[idx] = { ...item, specification: e.target.value };
                                      handleUpdateTemplate(template.id, { items: newItems });
                                    }} 
                                  />
                                </td>
                                <td className="p-1">
                                  <input 
                                    className="w-full border rounded p-1.5 focus:border-red-500 outline-none" 
                                    value={item.make} 
                                    placeholder="Make"
                                    onChange={e => {
                                      const newItems = [...template.items];
                                      newItems[idx] = { ...item, make: e.target.value };
                                      handleUpdateTemplate(template.id, { items: newItems });
                                    }} 
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <button 
                                    onClick={() => {
                                      const newItems = template.items.filter((_, i) => i !== idx);
                                      handleUpdateTemplate(template.id, { items: newItems });
                                    }} 
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4"/>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button 
                        onClick={() => {
                          const newItem: BOMItem = { 
                            id: `${Date.now()}-${template.items.length}`, 
                            product: '', 
                            uom: '', 
                            quantity: '', 
                            specification: '', 
                            make: '' 
                          };
                          handleUpdateTemplate(template.id, { items: [...template.items, newItem] });
                        }}
                        className="text-xs font-bold text-red-600 flex items-center hover:bg-red-50 px-3 py-2 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1"/> Add Item Row
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
