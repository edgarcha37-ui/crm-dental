'use client';

import { useEffect, useState } from 'react';
import {
    Building2, User, Bell, Palette, Shield, Webhook,
    Save, Check, ChevronRight, AlertCircle, Stethoscope,
} from 'lucide-react';
import DoctorsManager from '@/components/DoctorsManager';

type Section = 'clinica' | 'perfil' | 'doctores' | 'notificaciones' | 'apariencia' | 'seguridad' | 'integraciones';

const SECTIONS: { key: Section; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'clinica', label: 'Datos de la Clínica', icon: <Building2 size={18} />, description: 'Nombre, dirección, horarios' },
    { key: 'perfil', label: 'Perfil del Dentista', icon: <User size={18} />, description: 'Información personal y cédula' },
    { key: 'doctores', label: 'Doctores', icon: <Stethoscope size={18} />, description: 'Equipo clínico de la consulta' },
    { key: 'notificaciones', label: 'Notificaciones', icon: <Bell size={18} />, description: 'Recordatorios y alertas' },
    { key: 'apariencia', label: 'Apariencia', icon: <Palette size={18} />, description: 'Tema y preferencias visuales' },
    { key: 'seguridad', label: 'Seguridad', icon: <Shield size={18} />, description: 'Contraseña y accesos' },
    { key: 'integraciones', label: 'Integraciones n8n', icon: <Webhook size={18} />, description: 'Webhooks y automatizaciones' },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function SaveButton({ onSave, state }: { onSave: () => void; state: SaveState }) {
    const isSaved = state === 'saved';
    const isSaving = state === 'saving';
    const isError = state === 'error';
    return (
        <button
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md disabled:opacity-60 ${
                isSaved ? 'bg-green-500 text-white' :
                isError ? 'bg-red-500 text-white' :
                'bg-[var(--color-accent-blue)] text-white hover:bg-blue-600'
            }`}
        >
            {isSaved ? <Check size={16} /> : isError ? <AlertCircle size={16} /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : isSaved ? 'Guardado' : isError ? 'Error al guardar' : 'Guardar Cambios'}
        </button>
    );
}

interface ClinicaForm {
    nombre: string;
    direccion: string;
    telefono: string;
    correo: string;
    horario_apertura: string;
    horario_cierre: string;
    dias_atencion: string[];
}

interface PerfilForm {
    nombre: string;
    especialidad: string;
    cedula: string;
    universidad: string;
    correo: string;
    telefono: string;
}

interface NotificacionesForm {
    recordatorio_cita: boolean;
    confirmacion_cita: boolean;
    cancelacion_cita: boolean;
    pago_pendiente: boolean;
    nuevo_paciente: boolean;
    reporte_diario: boolean;
    horas_anticipacion: string;
}

const EMPTY_CLINICA: ClinicaForm = {
    nombre: '', direccion: '', telefono: '', correo: '',
    horario_apertura: '09:00', horario_cierre: '18:00',
    dias_atencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
};
const EMPTY_PERFIL: PerfilForm = { nombre: '', especialidad: '', cedula: '', universidad: '', correo: '', telefono: '' };
const EMPTY_NOTIF: NotificacionesForm = {
    recordatorio_cita: true, confirmacion_cita: true, cancelacion_cita: true,
    pago_pendiente: true, nuevo_paciente: false, reporte_diario: true,
    horas_anticipacion: '24',
};

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState<Section>('clinica');
    const [loading, setLoading] = useState(true);
    const [clinica, setClinica] = useState<ClinicaForm>(EMPTY_CLINICA);
    const [perfil, setPerfil] = useState<PerfilForm>(EMPTY_PERFIL);
    const [notificaciones, setNotificaciones] = useState<NotificacionesForm>(EMPTY_NOTIF);

    // Estado de guardado por sección, así "Guardado" solo se ve en la sección que se guardó.
    const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
    const setSaveState = (section: string, s: SaveState) =>
        setSaveStates(prev => ({ ...prev, [section]: s }));

    // URL base real del CRM para la documentación de endpoints n8n.
    // Se resuelve en cliente para mostrar el dominio de producción en vez de localhost.
    const [crmBaseUrl, setCrmBaseUrl] = useState('');
    useEffect(() => { setCrmBaseUrl(window.location.origin); }, []);

    // Carga inicial desde el backend.
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/settings');
                if (!res.ok) throw new Error('failed');
                const data = await res.json();
                setClinica({ ...EMPTY_CLINICA, ...data.clinica });
                setPerfil({ ...EMPTY_PERFIL, ...data.perfil });
                setNotificaciones({ ...EMPTY_NOTIF, ...data.notificaciones });
            } catch (e) {
                console.error('Error al cargar settings:', e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function saveSection(section: 'clinica' | 'perfil' | 'notificaciones', data: unknown) {
        setSaveState(section, 'saving');
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, data }),
            });
            if (!res.ok) throw new Error('save failed');
            setSaveState(section, 'saved');
            setTimeout(() => setSaveState(section, 'idle'), 2000);
        } catch (e) {
            console.error('Error al guardar', section, e);
            setSaveState(section, 'error');
            setTimeout(() => setSaveState(section, 'idle'), 3000);
        }
    }

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    function toggleDia(dia: string) {
        setClinica(prev => ({
            ...prev,
            dias_atencion: prev.dias_atencion.includes(dia)
                ? prev.dias_atencion.filter(d => d !== dia)
                : [...prev.dias_atencion, dia],
        }));
    }

    const n8nEndpoints = [
        { metodo: 'GET', ruta: '/api/patients', descripcion: 'Listar todos los pacientes' },
        { metodo: 'POST', ruta: '/api/patients', descripcion: 'Crear nuevo paciente' },
        { metodo: 'GET', ruta: '/api/patients/:id', descripcion: 'Expediente completo de paciente' },
        { metodo: 'PUT', ruta: '/api/patients/:id', descripcion: 'Actualizar datos de paciente' },
        { metodo: 'GET', ruta: '/api/appointments', descripcion: 'Listar citas (filtro por fecha)' },
        { metodo: 'POST', ruta: '/api/appointments', descripcion: 'Crear nueva cita' },
        { metodo: 'GET', ruta: '/api/invoices', descripcion: 'Listar facturas (filtro por estado)' },
        { metodo: 'POST', ruta: '/api/invoices', descripcion: 'Crear factura' },
        { metodo: 'GET', ruta: '/api/notes', descripcion: 'Listar notas y recordatorios' },
        { metodo: 'POST', ruta: '/api/notes', descripcion: 'Crear nota o tarea' },
        { metodo: 'GET', ruta: '/api/metrics', descripcion: 'Obtener métricas del CRM' },
        { metodo: 'POST', ruta: '/api/metrics', descripcion: 'Insertar/actualizar métrica desde n8n' },
    ];

    const methodColors: Record<string, string> = {
        GET: 'bg-green-50 text-green-600',
        POST: 'bg-blue-50 text-blue-600',
        PUT: 'bg-yellow-50 text-yellow-600',
        DELETE: 'bg-red-50 text-red-600',
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Configuración</h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Administra las preferencias y datos de tu consultorio.</p>
            </div>

            <div className="flex gap-8">
                {/* Menú lateral */}
                <div className="w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {SECTIONS.map(({ key, label, icon, description }) => (
                            <button
                                key={key}
                                onClick={() => setActiveSection(key)}
                                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeSection === key
                                        ? 'bg-[var(--color-accent-blue)] text-white shadow-md'
                                        : 'hover:bg-white text-[var(--color-text-secondary)]'
                                    }`}
                            >
                                <span className="mt-0.5 flex-shrink-0">{icon}</span>
                                <div>
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className={`text-[10px] mt-0.5 ${activeSection === key ? 'text-blue-100' : 'text-[var(--color-text-muted)]'}`}>{description}</p>
                                </div>
                                {activeSection === key && <ChevronRight size={14} className="ml-auto mt-1 flex-shrink-0" />}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Contenido */}
                <div className="flex-1">
                    {loading && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-12 text-center text-sm text-[var(--color-text-muted)]">
                            Cargando configuración...
                        </div>
                    )}
                    {!loading && (<>

                    {/* CLÍNICA */}
                    {activeSection === 'clinica' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Datos de la Clínica</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Información que aparece en facturas y comunicaciones</p>
                                </div>
                                <SaveButton onSave={() => saveSection('clinica', clinica)} state={saveStates.clinica ?? 'idle'} />
                            </div>
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nombre del Consultorio</label>
                                        <input type="text" value={clinica.nombre} onChange={e => setClinica({ ...clinica, nombre: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Correo Electrónico</label>
                                        <input type="email" value={clinica.correo} onChange={e => setClinica({ ...clinica, correo: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Dirección</label>
                                    <input type="text" value={clinica.direccion} onChange={e => setClinica({ ...clinica, direccion: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                </div>
                                <div className="grid grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Teléfono</label>
                                        <input type="text" value={clinica.telefono} onChange={e => setClinica({ ...clinica, telefono: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Apertura</label>
                                        <input type="time" value={clinica.horario_apertura} onChange={e => setClinica({ ...clinica, horario_apertura: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Cierre</label>
                                        <input type="time" value={clinica.horario_cierre} onChange={e => setClinica({ ...clinica, horario_cierre: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Días de Atención</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {diasSemana.map(dia => (
                                            <button
                                                key={dia}
                                                onClick={() => toggleDia(dia)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${clinica.dias_atencion.includes(dia)
                                                        ? 'bg-[var(--color-accent-blue)] text-white'
                                                        : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                                                    }`}
                                            >
                                                {dia.substring(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PERFIL */}
                    {activeSection === 'perfil' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Perfil del Dentista</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Información profesional y de contacto</p>
                                </div>
                                <SaveButton onSave={() => saveSection('perfil', perfil)} state={saveStates.perfil ?? 'idle'} />
                            </div>
                            <div className="flex items-center gap-6 mb-8 p-5 bg-gray-50 rounded-2xl">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">AT</div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{perfil.nombre}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{perfil.especialidad}</p>
                                    <button className="mt-2 text-xs text-[var(--color-accent-blue)] font-medium hover:underline">Cambiar foto de perfil</button>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nombre Completo</label>
                                        <input type="text" value={perfil.nombre} onChange={e => setPerfil({ ...perfil, nombre: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Especialidad</label>
                                        <input type="text" value={perfil.especialidad} onChange={e => setPerfil({ ...perfil, especialidad: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Cédula Profesional</label>
                                        <input type="text" value={perfil.cedula} onChange={e => setPerfil({ ...perfil, cedula: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Universidad</label>
                                        <input type="text" value={perfil.universidad} onChange={e => setPerfil({ ...perfil, universidad: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Correo</label>
                                        <input type="email" value={perfil.correo} onChange={e => setPerfil({ ...perfil, correo: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Teléfono</label>
                                        <input type="text" value={perfil.telefono} onChange={e => setPerfil({ ...perfil, telefono: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCTORES */}
                    {activeSection === 'doctores' && <DoctorsManager />}

                    {/* NOTIFICACIONES */}
                    {activeSection === 'notificaciones' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Notificaciones</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Configura cuándo y cómo recibir alertas</p>
                                </div>
                                <SaveButton onSave={() => saveSection('notificaciones', notificaciones)} state={saveStates.notificaciones ?? 'idle'} />
                            </div>
                            <div className="space-y-4">
                                {[
                                    { key: 'recordatorio_cita', label: 'Recordatorio de cita', desc: 'Enviar recordatorio al paciente antes de su cita' },
                                    { key: 'confirmacion_cita', label: 'Confirmación de cita', desc: 'Notificar al dentista cuando se confirme una cita' },
                                    { key: 'cancelacion_cita', label: 'Cancelación de cita', desc: 'Alerta inmediata cuando un paciente cancele' },
                                    { key: 'pago_pendiente', label: 'Pago pendiente', desc: 'Recordatorio de saldos por cobrar' },
                                    { key: 'nuevo_paciente', label: 'Nuevo paciente', desc: 'Notificar cuando se registre un nuevo paciente' },
                                    { key: 'reporte_diario', label: 'Reporte diario', desc: 'Resumen diario de la actividad de la clínica' },
                                ].map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border-light)] hover:bg-gray-50/50 transition-all">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</p>
                                        </div>
                                        <button
                                            onClick={() => setNotificaciones(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                            className={`w-11 h-6 rounded-full transition-all flex-shrink-0 ${notificaciones[key as keyof typeof notificaciones] ? 'bg-[var(--color-accent-blue)]' : 'bg-gray-200'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-all mx-1 ${notificaciones[key as keyof typeof notificaciones] ? 'translate-x-5' : 'translate-x-0'
                                                }`} />
                                        </button>
                                    </div>
                                ))}
                                <div className="p-4 rounded-xl border border-[var(--color-border-light)]">
                                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Horas de anticipación para recordatorios</label>
                                    <select
                                        value={notificaciones.horas_anticipacion}
                                        onChange={e => setNotificaciones({ ...notificaciones, horas_anticipacion: e.target.value })}
                                        className="w-48 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    >
                                        <option value="1">1 hora antes</option>
                                        <option value="2">2 horas antes</option>
                                        <option value="24">24 horas antes</option>
                                        <option value="48">48 horas antes</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* APARIENCIA — pendiente de implementar */}
                    {activeSection === 'apariencia' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Apariencia</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">Personaliza los colores y el tema del CRM</p>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-[var(--color-border-light)] text-center">
                                <Palette size={32} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-sm font-medium text-[var(--color-text-primary)]">Próximamente</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">Tema oscuro y color de acento personalizado en una próxima versión.</p>
                            </div>
                        </div>
                    )}

                    {/* SEGURIDAD — pendiente de implementar */}
                    {activeSection === 'seguridad' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Seguridad</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">Contraseña y acceso al sistema</p>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-[var(--color-border-light)] text-center">
                                <Shield size={32} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-sm font-medium text-[var(--color-text-primary)]">Próximamente</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">Cambio de contraseña desde el CRM en una próxima versión. Por ahora se gestiona vía variables de entorno.</p>
                            </div>
                        </div>
                    )}

                    {/* INTEGRACIONES n8n */}
                    {activeSection === 'integraciones' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Integraciones n8n</h2>
                                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Endpoints disponibles para conectar con flujos de n8n</p>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
                                <p className="text-sm font-semibold text-[var(--color-accent-blue)] mb-1">URL Base del CRM</p>
                                <code className="text-xs font-mono text-[var(--color-text-primary)] bg-white px-3 py-1.5 rounded-lg border border-blue-100 block">
                                    {crmBaseUrl || 'http://localhost:3000'}
                                </code>
                                <p className="text-xs text-[var(--color-text-muted)] mt-2">Esta es la URL base para los webhooks y llamadas desde n8n.</p>
                            </div>

                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Endpoints Disponibles</h3>
                            <div className="space-y-2">
                                {n8nEndpoints.map((ep, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border-light)] hover:bg-gray-50/50 transition-all font-mono">
                                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${methodColors[ep.metodo]}`}>
                                            {ep.metodo}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-primary)] flex-shrink-0">{ep.ruta}</span>
                                        <span className="text-xs text-[var(--color-text-muted)] ml-auto font-sans">{ep.descripcion}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-5 bg-slate-800 rounded-2xl text-sm font-mono">
                                <p className="text-blue-300 text-xs mb-3">{`// Ejemplo: leer pacientes desde n8n (HTTP Request node)`}</p>
                                <p className="text-green-300">Method: <span className="text-white">GET</span></p>
                                <p className="text-green-300">URL: <span className="text-white">{crmBaseUrl || 'http://localhost:3000'}/api/patients</span></p>
                                <p className="text-green-300 mt-2">{`// Ejemplo: registrar nueva cita`}</p>
                                <p className="text-green-300">Method: <span className="text-white">POST</span></p>
                                <p className="text-green-300">URL: <span className="text-white">{crmBaseUrl || 'http://localhost:3000'}/api/appointments</span></p>
                                <p className="text-green-300">Body: <span className="text-yellow-200">{`{ "paciente_id": 1, "fecha": "2026-03-20", "hora_inicio": "10:00", ... }`}</span></p>
                            </div>
                        </div>
                    )}
                    </>)}
                </div>
            </div>
        </div>
    );
}
