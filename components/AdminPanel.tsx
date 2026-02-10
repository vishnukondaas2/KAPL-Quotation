
import React from 'react';
import { AppState, Quotation } from '../types';
import { Edit3, Trash2, Search, Printer, FileSpreadsheet, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Props {
  state: AppState;
  onEdit: (q: Quotation) => void;
  onPrint: (q: Quotation) => void;
  onDownload: (q: Quotation) => void;
  onDelete: (id: string) => void;
}

const AdminPanel: React.FC<Props> = ({ state, onEdit, onPrint, onDownload, onDelete }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredQuotes = state.quotations.filter(q => 
    q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => b.id.localeCompare(a.id));

  const exportToExcel = (q: Quotation) => {
    const pricingData = [
      ['Quotation No', q.id],
      ['Customer', q.customerName],
      ['Date', q.date],
      [],
      ['Description', 'Rate (₹)'],
      ['ONGRID SOLAR POWER GENERATING SYSTEM COST', q.pricing.onGridSystemCost],
      ['Subsidy Amount', q.pricing.subsidyAmount],
      ['Effective Cost', q.pricing.onGridSystemCost - q.pricing.subsidyAmount],
    ];
    
    const bomData = q.bom.map((item, idx) => [
      idx + 1, item.product, item.uom, item.quantity, item.specification, item.make
    ]);

    const wb = XLSX.utils.book_new();
    const ws_pricing = XLSX.utils.aoa_to_sheet(pricingData);
    const ws_bom = XLSX.utils.aoa_to_sheet([['SL No', 'Product', 'UOM', 'Qty', 'Spec', 'Make'], ...bomData]);
    
    XLSX.utils.book_append_sheet(wb, ws_pricing, "Pricing");
    XLSX.utils.book_append_sheet(wb, ws_bom, "Bill of Materials");
    
    XLSX.writeFile(wb, `${q.id}_Solar_Quotation.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quotation Dashboard</h2>
          <p className="text-gray-500">View and manage all your solar proposals</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by ID or Customer Name..." 
            className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Quote ID</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Capacity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotes.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{q.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(q.date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{q.customerName}</div>
                    <div className="text-xs text-gray-500">{q.mobile}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{q.systemDescription}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                    <button onClick={() => onDownload(q)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg" title="Download PDF">
                      <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => onPrint(q)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg" title="Print to A4">
                      <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={() => exportToExcel(q)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg" title="Export Excel">
                      <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button onClick={() => onEdit(q)} className="text-gray-600 hover:bg-gray-50 p-2 rounded-lg" title="Edit">
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button onClick={() => { if(confirm('Delete this quotation?')) onDelete(q.id); }} className="text-red-600 hover:bg-red-50 p-2 rounded-lg" title="Delete">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No quotations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
