'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, User, Calendar, Receipt, StickyNote, FileText, Image, File, Plus, ChevronRight, Edit, CheckCircle, Clock, AlertCircle, MapPin, Tag, Trash2, X, Activity } from 'lucide-react';

interface Patient { id: number; nombre: string; telefono: string; correo: string; fecha_nacimiento: string; sexo: string; direccion: string; fuente_captacion: string; fecha_registro: string; notas_generales: string; archivado: boolean; }
interface Treatment { id: number; nombre: string; descripcion: string; fecha_inicio: string; fecha_fin: string; costo: number; costo_total: number; estatus: string; monto_pagado: number; }
interface Appointment { id: number; fecha: string; hora_inicio: string; hora_fin: string; motivo: string; motivo_consulta?: string; notas_clinicas?: string; fuente?: string; estado: string; }

interface Invoice { id: number; numero_factura: string; monto: number; fecha: string; estatus: string; }
interface PatientNote { id: number; titulo: string; contenido: string; fecha_creacion: string; categoria: string; }
interface FileRecord { id: number; nombre_archivo: string; tipo_archivo: string; tamano: number; fecha_subida: string; }
interface ArchivoClinico { id: number; paciente_id: number; nombre_archivo: string; url_publica: string; storage_path: string; tipo_archivo: string; peso_archivo: number; categoria: string; created_at: string; }

const STATUS_COLORS: Record<string, string> = { 'Completado': 'bg-green-50 text-green-600', 'En Progreso': 'bg-yellow-50 text-yellow-700', 'Pendiente': 'bg-blue-50 text-blue-600', 'Suspendido': 'bg-orange-50 text-orange-600', 'Cancelado': 'bg-red-50 text-red-600' };

const BASICOS = ['Consulta / Valoración dental','Limpieza dental (profilaxis)','Resinas dentales','Extracciones simples','Radiografías dentales','Aplicación de flúor','Selladores dentales','Blanqueamiento dental','Urgencias dentales','Curaciones dentales','Ajuste o cementado de coronas/provisionales','Placas de descarga básicas','Control y revisión dental periódica'];
const ESPECIALIDAD = ['Valoración ortodóntica','Diagnóstico ortodóntico','Radiografías y estudios ortodónticos','Colocación de brackets metálicos','Colocación de brackets estéticos','Colocación de brackets autoligado','Ortodoncia invisible (alineadores)','Ajustes ortodónticos mensuales','Cambio de ligas ortodónticas','Retiro de brackets','Colocación de retenedores fijos','Colocación de retenedores removibles','Expansión maxilar','Corrección de mordida','Tratamiento de apiñamiento dental','Tratamiento de diastemas','Ortodoncia interceptiva infantil','Mantenimiento ortodóntico','Reparación de brackets o alambres','Contención post-ortodoncia'];

type TabKey = 'historial' | 'tratamientos' | 'citas' | 'facturas' | 'notas' | 'archivos';
const TABS: { key: TabKey; label: string }[] = [{ key: 'historial', label: 'Historial' }, { key: 'tratamientos', label: 'Tratamientos' },{ key: 'citas', label: 'Citas' },{ key: 'facturas', label: 'Facturas' },{ key: 'notas', label: 'Notas Clínicas' },{ key: 'archivos', label: 'Archivos' }];

function getInitials(n: string) { return n.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase(); }
function calcAge(dob: string) { if (!dob) return '—'; return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25*24*60*60*1000)) + ' años'; }
function formatBytes(b: number) { if (b >= 1048576) return (b/1048576).toFixed(1)+' MB'; if (b >= 1024) return (b/1024).toFixed(1)+' KB'; return b+' B'; }
function getFileIcon(tipo: string) { if (tipo?.includes('pdf')) return <FileText size={18} className="text-red-400" />; if (tipo?.includes('image')) return <Image size={18} className="text-blue-400" />; return <File size={18} className="text-gray-400" />; }
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex flex-col items-center justify-center py-16 text-center gap-3">{icon}<p className="text-sm text-[var(--color-text-muted)]">{text}</p></div>; }

export default function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [notes, setNotes] = useState<PatientNote[]>([]);
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [activeTab, setActiveTab] = useState<TabKey>('historial');
    const [loading, setLoading] = useState(true);
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
    const [archivosClinico, setArchivosClinico] = useState<ArchivoClinico[]>([]);
    const [citaDetalle, setCitaDetalle] = useState<Appointment | null>(null);
    const [filterCita, setFilterCita] = useState('');
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    async function fetchAll() {
        try {
            const res = await fetch(`/api/patients/${id}`);
            const data = await res.json();
            setPatient(data.patient); setTreatments(data.treatments || []); setFiles(data.files || []);
            const [inv, apt, note, arch] = await Promise.all([
                fetch(`/api/invoices?paciente_id=${id}`),
                fetch(`/api/appointments?paciente_id=${id}`),
                fetch(`/api/notes?paciente_id=${id}`),
                fetch(`/api/archivos?paciente_id=${id}`),
            ]);
            setInvoices(await inv.json()); setAppointments(await apt.json()); setNotes(await note.json());
            const archData = await arch.json(); setArchivosClinico(Array.isArray(archData) ? archData : []);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    useEffect(() => { fetchAll(); }, [id]);

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
        await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...noteForm, tipo:'nota', prioridad:'medium', completada:0, paciente_id:Number(id)}) });
        setShowNote(false); setNoteForm({titulo:'',contenido:''});
        setNotes(await (await fetch(`/api/notes?paciente_id=${id}`)).json());
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
            const target = treatments.find(t=>t.estatus==='Activo') || treatments[0];
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

    const costoTotal = treatments.reduce((a,t) => a+((t as any).costo_total??(t as any).costo??0), 0);
    const totalAbonado = treatments.reduce((a,t) => a+((t as any).monto_pagado??0), 0);
    const saldo = Math.max(0, costoTotal - totalAbonado);
    const listaTipos = newTr.clasificacion==='Especialidad' ? ESPECIALIDAD : BASICOS;

    // Construir Historial (Timeline)
    const timelineItems = [
        ...appointments.map(a => ({ type: 'cita' as const, date: new Date(a.fecha+'T12:00:00'), data: a })),
        ...invoices.map(i => ({ type: 'factura' as const, date: new Date(i.fecha), data: i })),
        ...notes.map(n => ({ type: 'nota' as const, date: new Date(n.fecha_creacion), data: n }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-sm text-[var(--color-text-muted)]">
                <Link href="/patients" className="flex items-center gap-1 hover:text-[var(--color-accent-blue)]"><ArrowLeft size={14}/> Pacientes</Link>
                <ChevronRight size={14}/><span className="text-[var(--color-text-primary)] font-medium">{patient.nombre}</span>
            </div>
            
            {/* Header del Paciente */}
            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 mb-6">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">{getInitials(patient.nombre)}</div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
                                    {patient.nombre}
                                    {patient.notas_generales && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md border border-red-200">
                                            <AlertCircle size={14} /> Alerta Médica
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-[var(--color-text-muted)] mt-1">Paciente #P-{String(9000+patient.id).padStart(4,'0')} · Registrado el {new Date(patient.fecha_registro).toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={()=>{setEditForm({nombre:patient.nombre,telefono:patient.telefono||'',correo:patient.correo||'',direccion:patient.direccion||'',fuente_captacion:patient.fuente_captacion||'',notas_generales:patient.notas_generales||''});setShowEdit(true);}} className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--color-border)] rounded-xl hover:bg-gray-50 text-[var(--color-text-secondary)] transition-all"><Edit size={15}/> Editar</button>
                                <button onClick={archivarPaciente} className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-xl transition-all ${patient.archivado ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}>
                                    {patient.archivado ? '↩ Restaurar' : '📁 Archivar Paciente'}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-5 mt-4">
                            {patient.telefono&&<span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Phone size={13} className="text-[var(--color-accent-blue)]"/>{patient.telefono}</span>}
                            {patient.correo&&<span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><User size={13} className="text-[var(--color-accent-blue)]"/>{patient.correo}</span>}
                            {patient.fecha_nacimiento&&<span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Calendar size={13} className="text-[var(--color-accent-blue)]"/>{calcAge(patient.fecha_nacimiento)}</span>}
                            {patient.direccion&&<span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><MapPin size={13} className="text-[var(--color-accent-blue)]"/>{patient.direccion}</span>}
                            {patient.fuente_captacion&&<span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Tag size={13} className="text-[var(--color-accent-blue)]"/>{patient.fuente_captacion}</span>}
                        </div>
                    </div>
                </div>
                
                {/* Alertas Médicas Detalle */}
                {patient.notas_generales && (
                    <div className="mt-5 p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 items-start shadow-sm">
                        <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-red-800 mb-1">Alergias o Condiciones Médicas Importantes</p>
                            <p className="text-sm text-red-700 leading-relaxed">{patient.notas_generales}</p>
                        </div>
                    </div>
                )}
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

            <div className="flex items-center gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 w-fit">
                {TABS.map(({key,label})=><button key={key} onClick={()=>setActiveTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab===key?'bg-[var(--color-accent-blue)] text-white shadow-md':'text-[var(--color-text-secondary)] hover:bg-gray-50'}`}>{label}</button>)}
            </div>

            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 border border-[var(--color-border-light)] min-h-[400px]">
                
                {/* Nueva Pestaña Historial (Timeline) */}
                {activeTab==='historial'&&(
                    <>
                        <div className="flex items-center justify-between mb-6"><h2 className="text-base font-bold text-[var(--color-text-primary)]">Historial de Actividades</h2></div>
                        {timelineItems.length===0?<EmptyState icon={<Activity size={32} className="text-gray-300"/>} text="Sin actividad reciente"/>:(
                            <div className="relative pl-6">
                                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100"/>
                                <div className="space-y-6">
                                    {timelineItems.map((item, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                                                item.type === 'cita' ? 'bg-blue-100 text-blue-600' :
                                                item.type === 'factura' ? 'bg-green-100 text-green-600' :
                                                'bg-yellow-100 text-yellow-600'
                                            }`}>
                                                {item.type === 'cita' && <Calendar size={12} />}
                                                {item.type === 'factura' && <Receipt size={12} />}
                                                {item.type === 'nota' && <StickyNote size={12} />}
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                                                        {item.type === 'cita' && 'Cita Programada'}
                                                        {item.type === 'factura' && 'Factura Generada'}
                                                        {item.type === 'nota' && 'Nota Clínica'}
                                                    </h4>
                                                    <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                                                        {item.date.toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })}
                                                    </span>
                                                </div>
                                                
                                                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 mt-2">
                                                    {item.type === 'cita' && (
                                                        <div className="text-sm">
                                                            <p className="font-semibold">{item.data.motivo_consulta || item.data.motivo}</p>
                                                            <p className="text-xs text-gray-500 mt-1">Estatus: <span className="font-medium text-gray-700">{item.data.estado}</span></p>
                                                        </div>
                                                    )}
                                                    {item.type === 'factura' && (
                                                        <div className="text-sm">
                                                            <p className="font-semibold text-green-700">${item.data.monto.toLocaleString('es-MX')} MXN</p>
                                                            <p className="text-xs text-gray-500 mt-1">Referencia: {item.data.numero_factura || `#${item.data.id}`}</p>
                                                        </div>
                                                    )}
                                                    {item.type === 'nota' && (
                                                        <div className="text-sm">
                                                            <p className="font-semibold text-gray-800">{item.data.titulo}</p>
                                                            <p className="text-xs text-gray-600 mt-1 italic">"{item.data.contenido}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab==='tratamientos'&&(
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Tratamientos del Paciente</h2>
                            <button onClick={()=>setShowNewTr(true)} className="flex items-center gap-1.5 text-xs bg-[var(--color-accent-blue)] text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600 shadow-sm"><Plus size={13}/> Nuevo Tratamiento</button>
                        </div>
                        {treatments.length===0?<EmptyState icon={<CheckCircle size={32} className="text-gray-300"/>} text="Sin tratamientos registrados"/>:(
                            <div className="space-y-3">
                                {treatments.map(t=>{
                                    const costo=(t as any).costo_total??(t as any).costo??0;
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
                    const APT_COLORS: Record<string,string> = {'Completada':'bg-green-50 text-green-700','Confirmada':'bg-blue-50 text-blue-700','Pendiente':'bg-yellow-50 text-yellow-700','Cancelada':'bg-red-50 text-red-700','No asistió':'bg-gray-100 text-gray-600'};
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
                                    {['Confirmada','Pendiente','Completada','Cancelada','No asistió'].map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                                <Link href={`/appointments/new?paciente_id=${id}`} className="flex items-center gap-1 text-xs bg-[var(--color-accent-blue)] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 shadow-sm">
                                    <Plus size={12}/> Agendar
                                </Link>
                            </div>
                        </div>
                        {filtered.length===0?<EmptyState icon={<Calendar size={32} className="text-gray-300"/>} text="Sin citas registradas"/>:(
                            <div className="space-y-3">
                                {filtered.map(apt=>(
                                    <div key={apt.id} className="p-4 rounded-xl border border-[var(--color-border-light)] hover:shadow-sm transition-all cursor-pointer bg-white" onClick={()=>setCitaDetalle(apt)}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <Calendar size={18} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{apt.motivo_consulta||apt.motivo||'Cita'}</p>
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{new Date(apt.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}{apt.hora_inicio&&` · ${apt.hora_inicio}`}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0 ${APT_COLORS[apt.estado]||'bg-gray-50 text-gray-500'}`}>{apt.estado}</span>
                                        </div>
                                    </div>
                                ))}
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
                                        <p className="text-[10px] font-medium text-gray-500">{new Date(n.fecha_creacion).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}</p>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{n.contenido}</p>
                                </div>
                            ))}</div>
                        )}
                    </>
                )}

                {activeTab==='archivos'&&(
                    <>
                        <input type="file" ref={fileRef} multiple onChange={e=>handleFileUpload(e.target.files)} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"/>
                        <div
                            onDragOver={e=>{e.preventDefault();setDragging(true);}}
                            onDragLeave={()=>setDragging(false)}
                            onDrop={e=>{e.preventDefault();setDragging(false);handleFileUpload(e.dataTransfer.files);}}
                            className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-all cursor-pointer ${dragging?'border-blue-400 bg-blue-50':'border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'}`}
                            onClick={()=>fileRef.current?.click()}
                        >
                            <FileText size={32} className="mx-auto text-gray-300 mb-3"/>
                            <p className="text-sm font-bold text-[var(--color-text-primary)]">{uploadingFile?'Subiendo archivos...':'Arrastra tus archivos aquí'}</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">Soporta PDF, JPG, PNG (Max 10MB)</p>
                            <button className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">Explorar Archivos</button>
                        </div>
                        
                        {Object.entries(uploadProgress).map(([name,pct])=>(
                            <div key={name} className="mb-4">
                                <div className="flex justify-between text-xs font-bold text-[var(--color-text-muted)] mb-1.5"><span>{name}</span><span>{pct}%</span></div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{width:`${pct}%`}}/></div>
                            </div>
                        ))}

                        {archivosClinico.length===0?<EmptyState icon={<FileText size={32} className="text-gray-300"/>} text="No hay archivos subidos"/>:(
                            <div className="grid grid-cols-3 gap-4">
                            {archivosClinico.map(f=>(
                                <div key={f.id} className="rounded-xl border border-[var(--color-border-light)] overflow-hidden hover:shadow-md transition-all group bg-white flex flex-col">
                                    {f.tipo_archivo?.startsWith('image/')?
                                        <img src={f.url_publica} alt={f.nombre_archivo} className="w-full h-32 object-cover bg-gray-100"/>
                                        :<div className="w-full h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100">{getFileIcon(f.tipo_archivo)}</div>
                                    }
                                    <div className="p-3 flex flex-col flex-1">
                                        <p className="text-xs font-bold text-gray-800 truncate mb-1" title={f.nombre_archivo}>{f.nombre_archivo}</p>
                                        <p className="text-[10px] text-gray-500 mb-3">{formatBytes(f.peso_archivo)} · {new Date(f.created_at).toLocaleDateString('es-MX')}</p>
                                        <div className="mt-auto grid grid-cols-2 gap-2">
                                            <a href={f.url_publica} download target="_blank" rel="noreferrer" className="text-center text-[10px] font-bold py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Abrir</a>
                                            <button onClick={()=>eliminarArchivo(f.id)} className="text-[10px] font-bold py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Eliminar</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </>
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
