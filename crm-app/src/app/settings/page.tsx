'use client';

import { useState } from 'react';
import {
    Building2, User, Bell, Palette, Shield, Webhook,
    Save, Check, ChevronRight,
} from 'lucide-react';

type Section = 'clinica' | 'perfil' | 'notificaciones' | 'apariencia' | 'seguridad' | 'integraciones';

const SECTIONS: { key: Section; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'clinica', label: 'Datos de la Clínica', icon: <Building2 size={18} />, description: 'Nombre, dirección, horarios' },
    { key: 'perfil', label: 'Perfil del Dentista', icon: <User size={18} />, description: 'Información personal y cédula' },
    { key: 'notificaciones', label: 'Notificaciones', icon: <Bell size={18} />, description: 'Recordatorios y alertas' },
    { key: 'apariencia', label: 'Apariencia', icon: <Palette size={18} />, description: 'Tema y preferencias visuales' },
    { key: 'seguridad', label: 'Seguridad', icon: <Shield size={18} />, description: 'Contraseña y accesos' },
    { key: 'integraciones', label: 'Integraciones n8n', icon: <Webhook size={18} />, description: 'Webhooks y automatizaciones' },
];

function SaveButton({ onSave }: { onSave: () => void }) {
    const [saved, setSaved] = useState(false);
    function handleSave() {
        onSave();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }
    return (
        <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${saved
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--color-accent-blue)] text-white hover:bg-blue-600'
                }`}
        >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Guardado' : 'Guardar Cambios'}
        </button>
    );
}

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState<Section>('clinica');

    // Estado de los formularios
    const [clinica, setClinica] = useState({
        nombre: 'Consultorio Dental Thorne',
        direccion: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
        telefono: '+52 55 1234 5678',
        correo: 'contacto@dentaltorne.mx',
        horario_apertura: '09:00',
        horario_cierre: '18:00',
        dias_atencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    });

    const [perfil, setPerfil] = useState({
        nombre: 'Dr. Aris Thorne',
        especialidad: 'Cirujano Dental',
        cedula: '12345678',
        universidad: 'UNAM',
        correo: 'aris.thorne@dentaltorne.mx',
        telefono: '+52 55 9876 5432',
    });

    const [notificaciones, setNotificaciones] = useState({
        recordatorio_cita: true,
        confirmacion_cita: true,
        cancelacion_cita: true,
        pago_pendiente: true,
        nuevo_paciente: false,
        reporte_diario: true,
        horas_anticipacion: '24',
    });

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

                    {/* CLÍNICA */}
                    {activeSection === 'clinica' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Datos de la Clínica</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Información que aparece en facturas y comunicaciones</p>
                                </div>
                                <SaveButton onSave={() => { }} />
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
                                <SaveButton onSave={() => { }} />
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

                    {/* NOTIFICACIONES */}
                    {activeSection === 'notificaciones' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Notificaciones</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Configura cuándo y cómo recibir alertas</p>
                                </div>
                                <SaveButton onSave={() => { }} />
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

                    {/* APARIENCIA */}
                    {activeSection === 'apariencia' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Apariencia</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">Personaliza los colores y el tema del CRM</p>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">Tema</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'claro', label: 'Claro', preview: 'bg-white border-2 border-[var(--color-accent-blue)]' },
                                            { id: 'oscuro', label: 'Oscuro (próximamente)', preview: 'bg-slate-800 opacity-50 cursor-not-allowed' },
                                        ].map(theme => (
                                            <div key={theme.id} className={`${theme.preview} rounded-2xl p-6 flex items-center justify-center`}>
                                                <span className={`text-sm font-medium ${theme.id === 'oscuro' ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>{theme.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">Color de Acento</label>
                                    <div className="flex items-center gap-3">
                                        {['#4A90D9', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map(color => (
                                            <button key={color} className="w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-all" style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SEGURIDAD */}
                    {activeSection === 'seguridad' && (
                        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Seguridad</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">Contraseña y acceso al sistema</p>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Contraseña Actual</label>
                                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nueva Contraseña</label>
                                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Confirmar Nueva Contraseña</label>
                                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]" />
                                </div>
                                <button className="px-6 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
                                    Actualizar Contraseña
                                </button>
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
                                    http://localhost:3000
                                </code>
                                <p className="text-xs text-[var(--color-text-muted)] mt-2">Al desplegar en producción, reemplaza con tu dominio real.</p>
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
                                <p className="text-green-300">URL: <span className="text-white">http://localhost:3000/api/patients</span></p>
                                <p className="text-green-300 mt-2">{`// Ejemplo: registrar nueva cita`}</p>
                                <p className="text-green-300">Method: <span className="text-white">POST</span></p>
                                <p className="text-green-300">URL: <span className="text-white">http://localhost:3000/api/appointments</span></p>
                                <p className="text-green-300">Body: <span className="text-yellow-200">{`{ "paciente_id": 1, "fecha": "2026-03-20", "hora_inicio": "10:00", ... }`}</span></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
