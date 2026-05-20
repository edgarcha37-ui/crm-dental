'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { FileText } from 'lucide-react';
import { EmptyState, getFileIcon, formatBytes } from '@/components/patients/utils';
import { ArchivoClinicoShape } from '@/components/patients/usePatient';

interface Props {
  archivos: ArchivoClinicoShape[];
  uploading: boolean;
  uploadProgress: Record<string, number>;
  onUpload: (files: FileList | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function FilesTab({ archivos, uploading, uploadProgress, onUpload, onDelete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <input
        type="file"
        ref={fileRef}
        multiple
        onChange={(e) => onUpload(e.target.files)}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-all cursor-pointer ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-bold text-[var(--color-text-primary)]">
          {uploading ? 'Subiendo archivos...' : 'Arrastra tus archivos aquí'}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Soporta PDF, JPG, PNG (Max 10MB)</p>
        <button className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
          Explorar Archivos
        </button>
      </div>

      {Object.entries(uploadProgress).map(([name, pct]) => (
        <div key={name} className="mb-4">
          <div className="flex justify-between text-xs font-bold text-[var(--color-text-muted)] mb-1.5">
            <span>{name}</span><span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}

      {archivos.length === 0 ? (
        <EmptyState icon={<FileText size={32} className="text-gray-300" />} text="No hay archivos subidos" />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {archivos.map(f => (
            <div key={f.id} className="rounded-xl border border-[var(--color-border-light)] overflow-hidden hover:shadow-md transition-all group bg-white flex flex-col">
              {f.tipo_archivo?.startsWith('image/') ? (
                // next/image acepta width/height; usamos unoptimized para URLs externas
                <Image src={f.url_publica} alt={f.nombre_archivo} width={300} height={128} unoptimized className="w-full h-32 object-cover bg-gray-100" />
              ) : (
                <div className="w-full h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                  {getFileIcon(f.tipo_archivo)}
                </div>
              )}
              <div className="p-3 flex flex-col flex-1">
                <p className="text-xs font-bold text-gray-800 truncate mb-1" title={f.nombre_archivo}>{f.nombre_archivo}</p>
                <p className="text-[10px] text-gray-500 mb-3">{formatBytes(f.peso_archivo)} · {new Date(f.created_at).toLocaleDateString('es-MX')}</p>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <a href={f.url_publica} download target="_blank" rel="noreferrer" className="text-center text-[10px] font-bold py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    Abrir
                  </a>
                  <button onClick={() => onDelete(f.id)} className="text-[10px] font-bold py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
