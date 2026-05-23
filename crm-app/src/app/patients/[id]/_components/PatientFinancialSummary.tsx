'use client';

interface Props {
  costoTotal: number;
  totalAbonado: number;
  saldo: number;
  showAbonoButton: boolean;
  onAbono: () => void;
}

export default function PatientFinancialSummary({ costoTotal, totalAbonado, saldo, showAbonoButton, onAbono }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 border border-gray-100">
        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total a Pagar</p>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">${costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 border border-gray-100">
        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total Abonado</p>
        <p className="text-2xl font-bold text-green-600">${totalAbonado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className={`rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 flex items-center justify-between border ${saldo > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${saldo > 0 ? 'text-red-700' : 'text-green-700'}`}>Saldo Pendiente</p>
          <p className={`text-2xl font-bold ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        {showAbonoButton && (
          <button onClick={onAbono} className="text-xs font-bold px-4 py-2 bg-white rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm transition-all">
            + Abono
          </button>
        )}
      </div>
    </div>
  );
}
