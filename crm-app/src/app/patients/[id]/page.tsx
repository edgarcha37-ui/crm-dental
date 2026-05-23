'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Receipt, StickyNote, Plus, ChevronRight, CheckCircle, X, Activity } from 'lucide-react';
import MedicalHistoryEditor from '@/components/MedicalHistoryEditor';
import { usePatient } from '@/components/patients/usePatient';
import { EmptyState } from '@/components/patients/utils';
import PatientHeader from './_components/PatientHeader';
import TimelineTab, { TimelineItem } from './_components/TimelineTab';
import FilesTab from './_components/FilesTab';
import TreatmentPlansPanel from './_components/TreatmentPlansPanel';
import Odontograma from '@/components/Odontograma';
import { useToast } from '@/components/Toast';

const STATUS_COLORS: Record<string, string> = { 'Completado': 'bg-green-50 text-green-600', 'En Progreso': 'bg-yellow-50 text-yellow-700', 'Pendiente': 'bg-blue-50 text-blue-600', 'Suspendido': 'bg-orange-50 text-orange-600', 'Cancelado': 'bg-red-50 text-red-600' };

const BASICOS = ['Consulta / Valoración dental','Limpieza dental (profilaxis)','Resinas dentales','Extracciones simples','Radiografías dentales','Aplicación de flúor','Selladores dentales','Blanqueamiento dental','Urgencias dentales','Curaciones dentales','Ajuste o cementado de coronas/provisionales','Placas de descarga básicas','Control y revisión dental periódica'];
const ESPECIALIDAD = ['Valoración ortodóntica','Diagnóstico ortodóntico','Radiografías y estudios ortodónticos','Colocación de brackets metálicos','Colocación de brackets estéticos','Colocación de brackets autoligado','Ortodoncia invisible (alineadores)','Ajustes ortodónticos mensuales','Cambio de ligas ortodónticas','Retiro de brackets','Colocación de retenedores fijos','Colocación de retenedores removibles','Expansión maxilar','Corrección de mordida','Tratamiento de apiñamiento dental','Tratamiento de diastemas','Ortodoncia interceptiva infantil','Mantenimiento ortodóntico','Reparación de brackets o alambres','Contención post-ortodoncia'];

type TabKey = 'historial' | 'tratamientos' | 'citas' | 'odontograma' | 'facturas' | 'notas' | 'archivos';
const TABS: { key: TabKey; label: string }[] = [{ key: 'historial', label: 'Historial' }, { key: 'tratamientos', label: 'Tratamientos' },{ key: 'citas', label: 'Citas' },{ key: 'odontograma', label: 'Odontograma' },{ key: 'facturas', label: 'Facturas' },{ key: 'notas', label: 'Notas Clínicas' },{ key: 'archivos', label: 'Archivos' }];

// NOTA: el data loading y los helpers ya están extraídos. Un siguiente paso
// (Fase 4) puede sacar <PatientHeader>, <TimelineTab>, <FilesTab>, etc.

export default function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();

    async function enviarRecordatorio(appointmentId: number) {
        try {
            const res = await fetch(`/api/appointments/${appointmentId}/remind`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error');
            toast.success(`Recordatorio enviado a ${data.telefono}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo enviar el recordatorio');
        }
    }
    const {
        patient, treatments, appointments, invoices, notes,
        archivos: archivosClinico, setArchivos: setArchivosClinico,
        loading, refetch,
    } = usePatient(id);
    const fetchAll = refetch; // alias para no tocar todas las llamadas existentes

    const [activeTab, setActiveTab] = useState<TabKey>('historial');
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({ nombre:'', telefono:'', correo:'', direccion:'', fuente_captacion:'', notas_generales:'' });
    const [showNote, setShowNote] = useState(false);
    const [noteForm, setNoteForm] = useState({ titulo:'', contenido:'' });
    const [showAbono, setShowAbono] = useState(false);
    const [abonoForm, setAbonoForm] = useState({ monto:'', concepto:'' });
    const [savingAbono, setSavingAbono] = useState(false);
    const [showNewTr, setShowNewTr] = useState(false);
    const [newTr, setNewTr] = useState({ clasificacion:'Básico', nombre:'', precio:'' });
    const [savingTr, setSavingTr] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    type CitaDetalle = (typeof appointments)[number];
    const [citaDetalle, setCitaDetalle] = useState<CitaDetalle | null>(null);
    const [filterCita, setFilterCita] = useState('');
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    async function savePatient() {
        await fetch(`/api/patients/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(editForm) });
        setShowEdit(false); fetchAll();
    }
    async function archivarPaciente() {
        if (!confirm(patient?.archivado ? '¿Restaurar este paciente?' : '¿Archivar este paciente? Esto indica que no tiene tratamientos pendientes.')) return;
        await fetch(`/api/patients/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ archivado: !patient?.archivado }) });
        fetchAll();
    }
    async function createNote() {
        await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...noteForm, tipo:'nota', prioridad:'Media', completada:false, paciente_id:Number(id)}) });
        setShowNote(false); setNoteForm({titulo:'',contenido:''});
        await fetchAll();
    }
    async function setEstatus(treatmentId: number, estatus: string) {
        const res = await fetch(`/api/treatments/${treatmentId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({estatus}) });
        if (!res.ok) console.error('Error updating estatus:', await res.text());
        await fetchAll();
    }
    async function agregarTratamiento() {
        if (!newTr.nombre) return;
        setSavingTr(true);
        try {
            const res = await fetch('/api/treatments', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ paciente_id:Number(id), nombre_tratamiento:newTr.nombre, estatus:'Pendiente', costo_total:Number(newTr.precio)||0, monto_pagado:0 }) });
            if (!res.ok) { console.error('Error creating treatment:', await res.text()); return; }
            setShowNewTr(false); setNewTr({clasificacion:'Básico',nombre:'',precio:''});
            await fetchAll();
        } finally { setSavingTr(false); }
    }
    async function registrarAbono() {
        if (!abonoForm.monto || treatments.length===0) return;
        setSavingAbono(true);
        try {
            // Estatus válidos: Pendiente | En Progreso | Completado | Cancelado | Suspendido.
            // "Activo" no existe — preferimos un tratamiento en progreso, luego pendiente, luego cualquiera.
            const target =
                treatments.find(t => t.estatus === 'En Progreso') ||
                treatments.find(t => t.estatus === 'Pendiente') ||
                treatments[0];
            await fetch('/api/abonos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tratamiento_id:target.id, paciente_id:Number(id), monto:parseFloat(abonoForm.monto), concepto:abonoForm.concepto||undefined }) });
            setShowAbono(false); setAbonoForm({monto:'',concepto:''}); await fetchAll();
        } finally { setSavingAbono(false); }
    }
    async function handleFileUpload(files: FileList | null) {
        if (!files?.length) return;
        setUploadingFile(true);
        for (const file of Array.from(files)) {
            try {
                setUploadProgress(p => ({...p, [file.name]: 0}));
                const res = await fetch('/api/archivos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ paciente_id:Number(id), nombre_archivo:file.name, tipo_archivo:file.type, peso_archivo:file.size, categoria:'General' }) });
                if (!res.ok) { console.error('Error presigned:', await res.text()); continue; }
                const { signedUrl } = await res.json();
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.upload.onprogress = (e) => { if(e.lengthComputable) setUploadProgress(p=>({...p,[file.name]:Math.round(e.loaded/e.total*100)})); };
                    xhr.onload = () => { setUploadProgress(p=>({...p,[file.name]:100})); resolve(); };
                    xhr.onerror = reject;
                    xhr.open('PUT', signedUrl);
                    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                    xhr.send(file);
                });
            } catch(e) { console.error('Upload error:', e); }
        }
        await fetchAll();
        setUploadingFile(false);
        setTimeout(() => setUploadProgress({}), 2000);
        if (fileRef.current) fileRef.current.value = '';
    }
    async function eliminarArchivo(archivoId: number) {
        if (!confirm('¿Eliminar este archivo?')) return;
        await fetch(`/api/archivos?id=${archivoId}`, { method:'DELETE' });
        setArchivosClinico(a => a.filter(f => f.id !== archivoId));
    }

    if (loading) return <div className="p-8 flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin"/></div>;
    if (!patient) return <div className="p-8 flex flex-col items-center justify-center h-[60vh] gap-4"><p className="text-[var(--color-text-muted)]">Paciente no encontrado</p><Link href="/patients" className="text-sm text-[var(--color-accent-blue)] hover:underline flex items-center gap-1"><ArrowLeft size={14}/> Regresar</Link></div>;

    const costoTotal = treatments.reduce((a, t) => a + (t.costo_total ?? t.costo ?? 0), 0);
    const totalAbonado = treatments.reduce((a, t) => a + (t.monto_pagado ?? 0), 0);
    const saldo = Math.max(0, costoTotal - totalAbonado);
    const listaTipos = newTr.clasificacion==='Especialidad' ? ESPECIALIDAD : BASICOS;

    // Construir Historial (Timeline)
    const timelineItems = [
        ...appointments.map(a => ({ type: 'cita' as const, date: new Date(a.fecha+'T12:00:00'), data: a })),
        ...invoices.map(i => ({ type: 'factura' as const, date: new Date(i.fecha), data: i })),
        ...notes.map(n => ({ type: 'nota' as const, date: new Date(n.created_at), data: n }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-sm text-[var(--color-text-muted)]">
                <Link href="/patients" className="flex items-center gap-1 hover:text-[var(--color-accent-blue)]"><ArrowLeft size={14}/> Pacientes</Link>
                <ChevronRight size={14}/><span className="text-[var(--color-text-primary)] font-medium">{patient.nombre}</span>
            </div>
            
            <PatientHeader
                patient={patient}
                onEdit={() => {
                    setEditForm({
                        nombre: patient.nombre,
                        telefono: patient.telefono || '',
                        correo: patient.correo || '',
                        direccion: patient.direccion || '',
                        fuente_captacion: patient.fuente_captacion || '',
                        notas_generales: patient.notas_generales || '',
                    });
                    setShowEdit(true);
                }}
                onArchivar={archivarPaciente}
            />

            {/* Historia clínica estructurada */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] shadow-sm p-5 mb-6">
                <MedicalHistoryEditor pacienteId={Number(id)} />
            </div>

            {/* Resumen Financiero Dinámico */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 border border-gray-100">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total a Pagar</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">${costoTotal.toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 border border-gray-100">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total Abonado</p>
                    <p className="text-2xl font-bold text-green-600">${totalAbonado.toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                </div>
                <div className={`rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 flex items-center justify-between border ${saldo>0?'bg-red-50 border-red-200':'bg-green-50 border-green-200'}`}>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${saldo>0?'text-red-700':'text-green-700'}`}>Saldo Pendiente</p>
                        <p className={`text-2xl font-bold ${saldo>0?'text-red-600':'text-green-600'}`}>${saldo.toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                    </div>
                    {treatments.length>0&&<button onClick={()=>setShowAbono(true)} className="text-xs font-bold px-4 py-2 bg-white rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm transition-all">+ Abono</button>}
                </div>
            </div>

            <TreatmentPlansPanel pacienteId={Number(id)} />

            <div className="flex items-center gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 w-fit">
                {TABS.map(({key,label})=><button key={key} onClick={()=>setActiveTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab===key?'bg-[var(--color-accent-blue)] text-white shadow-md':'text-[var(--color-text-secondary)] hover:bg-gray-50'}`}>{label}</button>)}
            </div>

            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 border border-[var(--color-border-light)] min-h-[400px]">
                
                {activeTab === 'historial' && <TimelineTab items={timelineItems as TimelineItem[]} />}

                {activeTab === 'odontograma' && <Odontograma pacienteId={Number(id)} />}

                {activeTab==='tratamientos'&&(
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Tratamientos del Paciente</h2>
                            <button onClick={()=>setShowNewTr(true)} className="flex items-center gap-1.5 text-xs bg-[var(--color-accent-blue)] text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600 shadow-sm"><Plus size={13}/> Nuevo Tratamiento</button>
                        </div>
                        {treatments.length===0?<EmptyState icon={<CheckCircle size={32} className="text-gray-300"/>} text="Sin tratamientos registrados"/>:(
                            <div className="space-y-3">
                                {treatments.map(t=>{
                                    const costo = t.costo_total ?? t.costo ?? 0;
                                    return(
                                    <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border-light)] hover:shadow-sm transition-all bg-white">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[var(--color-text-primary)]">{t.nombre||<span className="text-gray-400 italic">Sin nombre</span>}</p>
                                            {t.fecha_inicio&&<p className="text-xs text-[var(--color-text-muted)] mt-1">{new Date(t.fecha_inicio).toLocaleDateString('es-MX')}</p>}
                                        </div>
                                        <div className="flex items-center gap-6">
                                            {costo>0&&<p className="text-sm font-bold text-[var(--color-text-primary)]">${Number(costo).toLocaleString('es-MX')}</p>}
                                            <div className={`flex items-center rounded-lg px-2 py-1 border ${STATUS_COLORS[t.estatus]||'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                <select
                                                    value={t.estatus}
                                                    onChange={e=>setEstatus(t.id,e.target.value)}
                                                    className="text-xs font-bold bg-transparent border-0 outline-none cursor-pointer pr-1"
                                                    style={{color:'inherit'}}
                                                >
                                                    <option value="Pendiente">Pendiente</option>
                                                    <option value="En Progreso">En Progreso</option>
                                                    <option value="Completado">Completado</option>
                                                    <option value="Cancelado">Cancelado</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>);
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab==='citas'&&(()=>{
                    const APT_COLORS: Record<string,string> = {'Completada':'bg-green-50 text-green-700','Confirmada':'bg-blue-50 text-blue-700','Pendiente':'bg-yellow-50 text-yellow-700','Cancelada':'bg-red-50 text-red-700','No Asistió':'bg-gray-100 text-gray-600'};
                    const filtered = appointments.filter(a => !filterCita || a.estado===filterCita);
                    return (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Historial de Citas</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={filterCita} onChange={e=>setFilterCita(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white font-medium">
                                    <option value="">Todas las citas</option>
                                    {['Confirmada','Pendiente','Completada','Cancelada','No Asistió'].map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                                <Link href={`/appointments/new?paciente_id=${id}`} className="flex items-center gap-1 text-xs bg-[var(--color-accent-blue)] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 shadow-sm">
                                    <Plus size={12}/> Agendar
                                </Link>
                            </div>
                        </div>
                        {filtered.length===0?<EmptyState icon={<Calendar size={32} className="text-gray-300"/>} text="Sin citas registradas"/>:(
                            <div className="space-y-3">
                                {filtered.map(apt => {
                                    const aptDate = new Date(apt.fecha + 'T12:00:00');
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const esFutura = aptDate >= today && (apt.estado === 'Confirmada' || apt.estado === 'Pendiente');
                                    return (
                                    <div key={apt.id} className="p-4 rounded-xl border border-[var(--color-border-light)] hover:shadow-sm transition-all bg-white">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setCitaDetalle(apt)}>
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <Calendar size={18} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{apt.motivo_consulta || apt.motivo || 'Cita'}</p>
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{aptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}{apt.hora_inicio && ` · ${apt.hora_inicio}`}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {esFutura && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); enviarRecordatorio(apt.id); }}
                                                        className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-100"
                                                        title="Enviar recordatorio WhatsApp ahora"
                                                    >
                                                        📲 Recordar
                                                    </button>
                                                )}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${APT_COLORS[apt.estado] || 'bg-gray-50 text-gray-500'}`}>{apt.estado}</span>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                    );
                })()}

                {activeTab==='facturas'&&(
                    <>
                        <div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold text-[var(--color-text-primary)]">Facturación</h2></div>
                        {invoices.length===0?<EmptyState icon={<Receipt size={32} className="text-gray-300"/>} text="Sin facturas"/>:(
                            <div className="space-y-3">{invoices.map(inv=>(
                                <div key={inv.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border-light)] bg-white hover:shadow-sm transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><Receipt size={18} className="text-green-500"/></div>
                                    <div className="flex-1"><p className="text-sm font-bold">{inv.numero_factura||`Factura #${inv.id}`}</p><p className="text-xs text-[var(--color-text-muted)] mt-0.5">{new Date(inv.fecha).toLocaleDateString('es-MX')}</p></div>
                                    <p className="text-sm font-bold text-[var(--color-text-primary)]">${inv.monto.toLocaleString('es-MX',{minimumFractionDigits:2})}</p>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${inv.estatus==='Pagada'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{inv.estatus}</span>
                                </div>
                            ))}</div>
                        )}
                    </>
                )}

                {activeTab==='notas'&&(
                    <>
                        <div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold">Notas Clínicas</h2><button onClick={()=>setShowNote(true)} className="flex items-center gap-1.5 text-xs text-[var(--color-accent-blue)] font-bold hover:bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg transition-all"><Plus size={13}/> Nueva Nota</button></div>
                        {notes.length===0?<EmptyState icon={<StickyNote size={32} className="text-gray-300"/>} text="Sin notas clínicas registradas"/>:(
                            <div className="space-y-4">{notes.map(n=>(
                                <div key={n.id} className="p-5 rounded-xl border border-yellow-200 bg-yellow-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-bold text-gray-800">{n.titulo}</p>
                                        <p className="text-[10px] font-medium text-gray-500">{new Date(n.created_at).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}</p>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{n.contenido}</p>
                                </div>
                            ))}</div>
                        )}
                    </>
                )}

                {activeTab === 'archivos' && (
                    <FilesTab
                        archivos={archivosClinico}
                        uploading={uploadingFile}
                        uploadProgress={uploadProgress}
                        onUpload={handleFileUpload}
                        onDelete={eliminarArchivo}
                    />
                )}
            </div>

            {/* Modales - Se mantienen igual pero con diseño limpio */}
            {showNewTr&&(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setShowNewTr(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[480px] shadow-2xl" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Agregar Tratamiento</h2><button onClick={()=>setShowNewTr(false)}><X size={20} className="text-gray-400"/></button></div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Clasificación</label>
                                <select value={newTr.clasificacion} onChange={e=>setNewTr({...newTr,clasificacion:e.target.value,nombre:''})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20">
                                    <option value="Básico">Básico</option>
                                    <option value="Especialidad">Especialidad</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Tipo de Tratamiento</label>
                                <select value={newTr.nombre} onChange={e=>setNewTr({...newTr,nombre:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20">
                                    <option value="">Seleccionar...</option>
                                    {listaTipos.map(o=><option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Precio ($)</label>
                                <input type="number" value={newTr.precio} onChange={e=>setNewTr({...newTr,precio:e.target.value})} placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"/>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={()=>setShowNewTr(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
                            <button onClick={agregarTratamiento} disabled={savingTr||!newTr.nombre} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-bold hover:bg-blue-600 shadow-md disabled:opacity-50 transition-all">{savingTr?'Guardando...':'Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showAbono&&treatments.length>0&&(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setShowAbono(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[420px] shadow-2xl" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Registrar Pago</h2><button onClick={()=>setShowAbono(false)}><X size={20} className="text-gray-400"/></button></div>
                        <p className="text-xs text-[var(--color-text-muted)] mb-6">Saldo actual: <span className="font-bold text-red-500">${saldo.toLocaleString('es-MX',{minimumFractionDigits:2})}</span></p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Monto a Abonar ($)</label>
                                <input type="number" min="1" value={abonoForm.monto} onChange={e=>setAbonoForm({...abonoForm,monto:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" placeholder="0.00" autoFocus/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Concepto</label>
                                <input type="text" value={abonoForm.concepto} onChange={e=>setAbonoForm({...abonoForm,concepto:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" placeholder="Ej: Abono de brackets..."/>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={()=>setShowAbono(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
                            <button onClick={registrarAbono} disabled={savingAbono||!abonoForm.monto||parseFloat(abonoForm.monto)<=0} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 shadow-md disabled:opacity-50 transition-all">{savingAbono?'Procesando...':'Confirmar Pago'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showNote&&(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setShowNote(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[500px] shadow-2xl" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Nueva Nota Médica</h2><button onClick={()=>setShowNote(false)}><X size={20} className="text-gray-400"/></button></div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Motivo / Título</label><input type="text" value={noteForm.titulo} onChange={e=>setNoteForm({...noteForm,titulo:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" placeholder="Ej: Control mensual..."/></div>
                            <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Observaciones</label><textarea value={noteForm.contenido} onChange={e=>setNoteForm({...noteForm,contenido:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 h-32 resize-none" placeholder="Escribe aquí las notas clínicas..."/></div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={()=>setShowNote(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
                            <button onClick={createNote} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-bold hover:bg-blue-600 shadow-md transition-all">Guardar Nota</button>
                        </div>
                    </div>
                </div>
            )}

            {showEdit&&(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setShowEdit(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[520px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Editar Perfil</h2><button onClick={()=>setShowEdit(false)}><X size={20} className="text-gray-400"/></button></div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Nombre Completo</label><input type="text" value={editForm.nombre} onChange={e=>setEditForm({...editForm,nombre:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Teléfono</label><input type="text" value={editForm.telefono} onChange={e=>setEditForm({...editForm,telefono:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"/></div>
                                <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Correo</label><input type="email" value={editForm.correo} onChange={e=>setEditForm({...editForm,correo:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"/></div>
                            </div>
                            <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Dirección</label><input type="text" value={editForm.direccion} onChange={e=>setEditForm({...editForm,direccion:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"/></div>
                            <div><label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Alertas Médicas / Alergias</label><textarea value={editForm.notas_generales} onChange={e=>setEditForm({...editForm,notas_generales:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 h-24 resize-none" placeholder="Alergia a la penicilina, hipertensión..."/></div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={()=>setShowEdit(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
                            <button onClick={savePatient} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-bold hover:bg-blue-600 shadow-md transition-all">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
