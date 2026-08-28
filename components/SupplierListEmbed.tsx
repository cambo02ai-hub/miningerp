import { translateValue } from '../utils/locale';
import React from 'react';

interface SupplierListEmbedProps {
    suppliers: any[];
}

const SupplierListEmbed = ({ suppliers }: SupplierListEmbedProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    Suppliers Reference
                </h3>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">အမည်</th>
                            <th className="px-6 py-3">အမျိုးအစား</th>
                            <th className="px-6 py-3">ဆက်သွယ်ရန်</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {suppliers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-slate-400">ရောင်းချသူဒေတာ မတင်ရသေးပါ။</td>
                            </tr>
                        ) : (
                            suppliers.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                                    <td className="px-6 py-3">
                                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                            {translateValue(s.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{s.phone || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierListEmbed;
