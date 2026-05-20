import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, upsertSettings } from '@/lib/data/settings';
import { upsertSettingsSchema, zodErrorResponse } from '@/schemas';

export async function GET() {
  try {
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/settings:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = upsertSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    await upsertSettings(parsed.data.section, parsed.data.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/settings:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
