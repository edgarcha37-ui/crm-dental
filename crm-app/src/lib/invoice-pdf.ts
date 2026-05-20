/**
 * Genera un PDF de recibo/factura local (lado cliente).
 * Diseño A4 minimalista — sin dependencias del lado server.
 * Si en el futuro se necesita PDF oficial (con sello SAT), pasar al flujo de n8n.
 */
import { jsPDF } from 'jspdf';

export interface InvoicePDFData {
  numero: string;
  fecha: string;
  paciente_nombre: string;
  razon_social?: string | null;
  rfc?: string | null;
  direccion_fiscal?: string | null;
  tratamiento_nombre?: string | null;
  concepto?: string | null;
  monto: number;
  estatus: string;
  tipo?: string;
}

export interface ClinicHeader {
  nombre: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
}

export function generateInvoicePDF(invoice: InvoicePDFData, clinic: ClinicHeader): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 20;
  let y = MARGIN;

  // Header de la clínica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(clinic.nombre, MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (clinic.direccion) { doc.text(clinic.direccion, MARGIN, y); y += 4; }
  const contactLine = [clinic.telefono, clinic.correo].filter(Boolean).join('  ·  ');
  if (contactLine) { doc.text(contactLine, MARGIN, y); y += 4; }

  // Título de documento
  y += 6;
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const docTitle = invoice.tipo === 'abono' ? 'Recibo de Abono' : 'Factura';
  doc.text(docTitle, MARGIN, y);

  // Número y fecha a la derecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  const fecha = new Date(invoice.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`No. ${invoice.numero}`, PAGE_W - MARGIN, y - 4, { align: 'right' });
  doc.text(fecha, PAGE_W - MARGIN, y, { align: 'right' });

  y += 12;

  // Datos del paciente / receptor
  doc.setTextColor(120);
  doc.setFontSize(8);
  doc.text('CLIENTE', MARGIN, y);
  y += 4;

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.razon_social || invoice.paciente_nombre, MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  if (invoice.rfc) { doc.text(`RFC: ${invoice.rfc}`, MARGIN, y); y += 4; }
  if (invoice.direccion_fiscal) {
    const lines = doc.splitTextToSize(invoice.direccion_fiscal, PAGE_W - 2 * MARGIN);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4;
  }

  y += 8;

  // Concepto
  doc.setDrawColor(220);
  doc.setFillColor(248, 248, 248);
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, 8, 'F');
  doc.setTextColor(80);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', MARGIN + 3, y + 5);
  doc.text('IMPORTE', PAGE_W - MARGIN - 3, y + 5, { align: 'right' });
  y += 12;

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const concepto = invoice.concepto || invoice.tratamiento_nombre || 'Servicios dentales';
  doc.text(concepto, MARGIN + 3, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${invoice.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, PAGE_W - MARGIN - 3, y, { align: 'right' });

  y += 12;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL', PAGE_W - MARGIN - 50, y, { align: 'right' });
  doc.text(`$${invoice.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, PAGE_W - MARGIN - 3, y, { align: 'right' });

  y += 14;
  // Estado
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (invoice.estatus === 'Pagada') doc.setTextColor(34, 139, 87);
  else doc.setTextColor(200, 130, 30);
  doc.text(`Estado: ${invoice.estatus}`, MARGIN, y);

  // Footer
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text(
    'Documento generado por DentalCRM. No tiene validez fiscal salvo que se emita con CFDI.',
    PAGE_W / 2,
    285,
    { align: 'center' }
  );

  const filename = `${invoice.tipo === 'abono' ? 'recibo' : 'factura'}-${invoice.numero || invoice.fecha}.pdf`;
  doc.save(filename);
}
