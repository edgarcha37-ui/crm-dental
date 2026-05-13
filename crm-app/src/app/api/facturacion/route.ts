import { NextRequest, NextResponse } from 'next/server';
import { getDatosFiscales, upsertDatosFiscales, getFacturasByPaciente } from '@/lib/data/facturacion';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pacienteId = Number(searchParams.get('paciente_id'));
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 });
  try {
    const [fiscal, facturas] = await Promise.all([
      getDatosFiscales(pacienteId),
      getFacturasByPaciente(pacienteId),
    ]);
    return NextResponse.json({ fiscal, facturas });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await upsertDatosFiscales(body);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
