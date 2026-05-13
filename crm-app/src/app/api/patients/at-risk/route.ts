import { NextResponse } from 'next/server';
import { getPatientsAtRisk } from '@/lib/data/patients';

export async function GET() {
    try {
        const patients = await getPatientsAtRisk();
        return NextResponse.json(patients);
    } catch (err) {
        console.error('GET /api/patients/at-risk error:', err);
        return NextResponse.json([], { status: 200 }); // Fail silently para demo
    }
}
