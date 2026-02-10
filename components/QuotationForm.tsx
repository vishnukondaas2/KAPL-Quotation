
import React, { useState, useEffect } from 'react';
import { AppState, Quotation, BOMItem, BOMTemplate, ProductPricing } from '../types';
import { Save, X, Plus, Trash2, RefreshCw, Package, Bookmark, IndianRupee } from 'lucide-react';

interface Props {
  state: AppState;
  editData: Quotation | null;
  onSave: (q: Quotation) => void;
  onSaveTemplate: (name: string, items: BOMItem[]) => void;
  onCancel: () => void;
}

const QuotationForm: React.FC<Props> = ({ state, editData, onSave, onSaveTemplate, onCancel }) => {
  const generateNewId = () => {
    const now = new Date();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yy = now.getFullYear().toString().slice(-2);
    return `KAPL-${state.nextId}/${mm}-${yy}`;
  };

  const [formData, setFormData] = useState<Quotation>({
    id: editData?.id || generateNewId(),
    date: editData?.date || new Date().toISOString().split('T')[0],
    customerName: editData?.customerName || '',
    discomNumber: editData?.discomNumber || '',
    address: editData?.address || '',
    mobile: editData?.mobile || '',
    email: editData?.email || '',
    location: editData?.location || '',
    pricing: editData?.pricing || { ...state.productPricing[0] },
    bom: editData?.bom || (state.bomTemplates[0]?.items || []),
    systemDescription: editData?.systemDescription || (state.productDescriptions[0] || '3kW ON-GRID SOLAR POWER GENERATING SYSTEM')
  });

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = state.bomTemplates.find(t => t.id === e.target.value);
    if (template) {
      setFormData({
        ...formData,
        systemDescription: template.name,
        bom: template.items.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }))
      });
    }
  };

  const handlePricingModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = state.productPricing.find(p => p.id === e.target.value);
    if (model) {
      const { id, name, ...pricingValues } = model;
      setFormData({
        ...formData,
        pricing: { ...pricingValues }
      });
    }
  };

  const handleBOMChange = (idx: number, field: keyof BOMItem, value: string) => {
    const newBOM = [...formData.bom];
    newBOM[idx] = { ...newBOM[idx], [field]: value };
    setFormData({ ...formData, bom: newBOM });
  };

  const addBOMItem = () => {
    setFormData({
      ...formData,
      bom: [...formData.bom, { id: Date.now().toString(), product: '', uom: '', quantity: '', specification: '', make: '' }]
    });
  };

  const removeBOMItem = (idx: number) => {
    setFormData({ ...formData, bom: formData.bom.filter((_, i) => i !== idx) });
  };

  const handleQuickSaveTemplate = () => {
    const name = prompt("Enter a Product/Configuration Name for this BOM:", formData.systemDescription);
    if (name) {
      onSaveTemplate(name, formData.bom);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{editData ? 'Edit' : 'Create New'} Quotation</h2>
        <div className="text-lg font-mono text-red-600 bg-red-50 px-4 py-1 rounded-full border border-red-100">
          {formData.id}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Customer Info */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1 font-bold">Customer Name</label>
              <input 
                required
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-bold">Consumer DISCOM No.</label>
              <input 
                value={formData.discomNumber}
                onChange={e => setFormData({ ...formData, discomNumber: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm text-gray-600 mb-1 font-bold">Address</label>
              <textarea 
                required
                rows={2}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-bold">Mobile Number</label>
              <input 
                required
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-bold">Email</label>
              <input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-bold">Product Description</label>
              <div className="relative">
                 <select 
                   value={formData.systemDescription}
                   onChange={e => setFormData({ ...formData, systemDescription: e.target.value })}
                   className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none bg-white appearance-none"
                 >
                   <option value="">Select Description...</option>
                   {state.productDescriptions.map((desc, idx) => (
                     <option key={idx} value={desc}>{desc}</option>
                   ))}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <Package className="w-4 h-4" />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-gray-50 p-6 rounded-lg border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Pricing Estimation</h3>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
               <IndianRupee className="w-4 h-4 text-red-600" />
               <select 
                 onChange={handlePricingModelSelect}
                 className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none"
               >
                 <option value="">Select Pricing Model...</option>
                 {state.productPricing.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs uppercase font-black text-gray-400 mb-1">On-Grid System Cost (₹)</label>
              <input 
                type="number"
                value={formData.pricing.onGridSystemCost}
                onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, onGridSystemCost: Number(e.target.value), rooftopPlantCost: Number(e.target.value) } })}
                className="w-full border p-2 rounded bg-white shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-black text-gray-400 mb-1">Subsidy Amount (₹)</label>
              <input 
                type="number"
                value={formData.pricing.subsidyAmount}
                onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, subsidyAmount: Number(e.target.value) } })}
                className="w-full border p-2 rounded bg-white shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-black text-gray-400 mb-1">KSEB Charges (INR)</label>
              <input 
                type="number"
                value={formData.pricing.ksebCharges}
                onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, ksebCharges: Number(e.target.value) } })}
                className="w-full border p-2 rounded bg-white shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-black text-gray-400 mb-1">Customized Structure Cost (₹)</label>
              <input 
                type="number"
                value={formData.pricing.customizedStructureCost}
                onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, customizedStructureCost: Number(e.target.value) } })}
                className="w-full border p-2 rounded bg-white shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-black text-gray-400 mb-1">Addtl. Material Cost (₹)</label>
              <input 
                type="number"
                value={formData.pricing.additionalMaterialCost}
                onChange={e => setFormData({ ...formData, pricing: { ...formData.pricing, additionalMaterialCost: Number(e.target.value) } })}
                className="w-full border p-2 rounded bg-white shadow-inner"
              />
            </div>
            <div className="bg-black text-white p-6 rounded flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-3">
              <div>
                <p className="text-[10px] uppercase font-black text-red-600 mb-1 tracking-widest">Effective Investment</p>
                <p className="text-xs text-gray-400 font-bold uppercase">Estimated Customer Cost (After Subsidy)</p>
              </div>
              <span className="text-3xl font-black">₹ {(formData.pricing.onGridSystemCost - formData.pricing.subsidyAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>

        {/* BOM Selection & Table */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Bill of Materials</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-gray-100 p-1 px-3 rounded-lg border">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <select 
                  onChange={handleTemplateSelect}
                  className="bg-transparent border-none p-1 text-sm font-bold focus:ring-0 outline-none"
                >
                  <option value="">Load Materials...</option>
                  {state.bomTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="button" 
                onClick={addBOMItem}
                className="flex items-center text-xs font-bold bg-black text-white px-3 py-2 rounded"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Row
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">UOM</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Spec/Type</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Make</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500 uppercase w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formData.bom.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-1"><input className="w-full text-sm border-0 focus:ring-1 focus:ring-red-500" value={item.product} onChange={e => handleBOMChange(idx, 'product', e.target.value)} /></td>
                    <td className="p-1"><input className="w-full text-sm border-0 focus:ring-1 focus:ring-red-500" value={item.uom} onChange={e => handleBOMChange(idx, 'uom', e.target.value)} /></td>
                    <td className="p-1"><input className="w-full text-sm border-0 focus:ring-1 focus:ring-red-500" value={item.quantity} onChange={e => handleBOMChange(idx, 'quantity', e.target.value)} /></td>
                    <td className="p-1"><input className="w-full text-sm border-0 focus:ring-1 focus:ring-red-500" value={item.specification} onChange={e => handleBOMChange(idx, 'specification', e.target.value)} /></td>
                    <td className="p-1"><input className="w-full text-sm border-0 focus:ring-1 focus:ring-red-500" value={item.make} onChange={e => handleBOMChange(idx, 'make', e.target.value)} /></td>
                    <td className="p-1 text-center"><button type="button" onClick={() => removeBOMItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors">
            <Save className="w-5 h-5 mr-2 inline" /> {editData ? 'Update' : 'Save'} Quotation
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default QuotationForm;
