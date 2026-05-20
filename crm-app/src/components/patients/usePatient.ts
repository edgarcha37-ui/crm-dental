'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Patient, Treatment, Appointment, Invoice, Note } from '@/types';

// Las "Shape" eran un duplicado del dominio. Las alineamos con los tipos centrales
// y mantenemos los alias para no tocar todos los imports.
export type PatientShape = Patient;
export type TreatmentShape = Treatment & {
    /** Legacy field — algunas filas viejas tenían `costo` en lugar de `costo_total`. */
    costo?: number;
    /** Algunas filas no tienen `nombre_tratamiento` en la fuente original; la UI lee `nombre`. */
    nombre?: string;
    descripcion?: string;
};
export type AppointmentShape = Appointment;
export type InvoiceShape = Invoice;
export type PatientNoteShape = Note;
export interface ArchivoClinicoShape {
    id: number; paciente_id: number; nombre_archivo: string; url_publica: string; storage_path: string;
    tipo_archivo: string; peso_archivo: number; categoria: string; created_at: string;
}

/**
 * Centraliza el data loading del expediente del paciente. Reemplaza el bloque
 * de useState + fetchAll que vivía dentro del componente página.
 *
 * Devuelve también `refetch` para que los formularios (abono, nuevo tratamiento,
 * etc.) puedan recargar sin tener que conocer la implementación interna.
 */
export function usePatient(id: string | number | undefined) {
    const [patient, setPatient] = useState<PatientShape | null>(null);
    const [treatments, setTreatments] = useState<TreatmentShape[]>([]);
    const [appointments, setAppointments] = useState<AppointmentShape[]>([]);
    const [invoices, setInvoices] = useState<InvoiceShape[]>([]);
    const [notes, setNotes] = useState<PatientNoteShape[]>([]);
    const [archivos, setArchivos] = useState<ArchivoClinicoShape[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/patients/${id}`);
            if (!res.ok) throw new Error(`Error ${res.status} al cargar paciente`);
            const data = await res.json();
            setPatient(data.patient);
            setTreatments(data.treatments || []);

            const [inv, apt, note, arch] = await Promise.all([
                fetch(`/api/invoices?paciente_id=${id}`),
                fetch(`/api/appointments?paciente_id=${id}`),
                fetch(`/api/notes?paciente_id=${id}`),
                fetch(`/api/archivos?paciente_id=${id}`),
            ]);
            setInvoices(await inv.json());
            setAppointments(await apt.json());
            setNotes(await note.json());
            const archData = await arch.json();
            setArchivos(Array.isArray(archData) ? archData : []);
            setError(null);
        } catch (e) {
            console.error('usePatient:', e);
            setError(e instanceof Error ? e.message : 'Error al cargar expediente');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { refetch(); }, [refetch]);

    return {
        patient, treatments, appointments, invoices, notes, archivos,
        loading, error, refetch,
        // setters específicos por si la UI necesita actualizar local sin refetch (ej. delete archivo)
        setArchivos, setNotes,
    };
}
