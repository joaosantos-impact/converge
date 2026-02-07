import jsPDF from 'jspdf';

interface SaleEventPDF {
  date: Date;
  symbol: string;
  amount: number;
  revenue: number;
  costBasis: number;
  realizedPnL: number;
  holdingDays: number;
  isTaxFree: boolean;
  taxFreePortion: number;
  taxablePortion: number;
}

interface TaxReportData {
  year: number;
  userName: string;
  generatedAt: Date;
  currency: string;
  formatValue: (v: number) => string;
  summary: {
    totalRealizedPnL: number;
    taxFreeRealizedPnL: number;
    taxableRealizedPnL: number;
    totalBuyVolume: number;
    totalSellVolume: number;
    totalFees: number;
    potentialTax: number;
    totalValue: number;
    totalInvested: number;
  };
  sales: SaleEventPDF[];
  assets: Array<{
    asset: string;
    firstPurchase: Date | null;
    holdingDays: number;
    isTaxFree: boolean;
    totalAmount: number;
    totalCost: number;
    currentValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  }>;
}

export function generateTaxReportPDF(data: TaxReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const fmt = data.formatValue;

  // Colors
  const primaryColor: [number, number, number] = [0, 0, 0];
  const mutedColor: [number, number, number] = [100, 100, 100];
  const greenColor: [number, number, number] = [16, 185, 129];
  const redColor: [number, number, number] = [239, 68, 68];
  const amberColor: [number, number, number] = [202, 138, 4];

  let yPos = 20;

  // --- Header ---
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Converge', 20, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('Relatório Fiscal de Criptomoedas', 20, yPos + 8);

  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ano Fiscal: ${data.year}`, pageWidth - 20, yPos, { align: 'right' });

  yPos += 20;

  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // User info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(`Utilizador: ${data.userName}`, 20, yPos);
  doc.text(`Gerado em: ${data.generatedAt.toLocaleString('pt-PT')}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Moeda: ${data.currency}  |  Método: FIFO  |  País: Portugal  |  Taxa: 28%`, 20, yPos);

  yPos += 15;

  // --- Summary boxes ---
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Resumo Fiscal', 20, yPos);
  yPos += 10;

  const boxW = (pageWidth - 50) / 2;

  // Row 1: P&L Realizado + Imposto
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, boxW, 28, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('P&L Realizado (total)', 25, yPos + 9);
  doc.setFontSize(14);
  doc.setTextColor(...(data.summary.totalRealizedPnL >= 0 ? greenColor : redColor));
  doc.setFont('helvetica', 'bold');
  doc.text((data.summary.totalRealizedPnL >= 0 ? '+' : '') + fmt(data.summary.totalRealizedPnL), 25, yPos + 21);

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(30 + boxW, yPos, boxW, 28, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Imposto Estimado (28%)', 35 + boxW, yPos + 9);
  doc.setFontSize(14);
  doc.setTextColor(...redColor);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(data.summary.potentialTax), 35 + boxW, yPos + 21);

  yPos += 35;

  // Row 2: Isento + Tributável
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, yPos, boxW, 28, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('P&L Isento (>365 dias)', 25, yPos + 9);
  doc.setFontSize(14);
  doc.setTextColor(...greenColor);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(data.summary.taxFreeRealizedPnL), 25, yPos + 21);

  doc.setFillColor(254, 249, 195);
  doc.roundedRect(30 + boxW, yPos, boxW, 28, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('P&L Tributável (<365 dias)', 35 + boxW, yPos + 9);
  doc.setFontSize(14);
  doc.setTextColor(...amberColor);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(data.summary.taxableRealizedPnL), 35 + boxW, yPos + 21);

  yPos += 35;

  // Row 3: Volumes + Fees
  const thirdW = (pageWidth - 60) / 3;
  const labels3 = ['Volume Compras', 'Volume Vendas', 'Comissões'];
  const values3 = [data.summary.totalBuyVolume, data.summary.totalSellVolume, data.summary.totalFees];
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * (thirdW + 10);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, yPos, thirdW, 22, 3, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(labels3[i], x + 5, yPos + 8);
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(values3[i]), x + 5, yPos + 17);
  }

  yPos += 32;

  // --- Vendas Realizadas ---
  if (data.sales.length > 0) {
    const checkNewPage = (needed: number) => {
      if (yPos + needed > 275) {
        doc.addPage();
        yPos = 20;
      }
    };

    checkNewPage(25);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`Vendas Realizadas (${data.sales.length})`, 20, yPos);
    yPos += 10;

    // Table header
    const saleColW = [25, 30, 25, 25, 25, 22, 22];
    const saleHeaders = ['Data', 'Par', 'Receita', 'Custo FIFO', 'P&L', 'Dias', 'Estado'];

    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    let xP = 22;
    saleHeaders.forEach((h, i) => {
      doc.text(h, xP, yPos + 5.5);
      xP += saleColW[i];
    });
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    for (const sale of data.sales) {
      checkNewPage(10);

      xP = 22;
      doc.setFontSize(7);

      // Date
      doc.setTextColor(...primaryColor);
      doc.text(sale.date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }), xP, yPos + 4);
      xP += saleColW[0];

      // Symbol
      doc.setFont('helvetica', 'bold');
      doc.text(sale.symbol, xP, yPos + 4);
      doc.setFont('helvetica', 'normal');
      xP += saleColW[1];

      // Revenue
      doc.setTextColor(...primaryColor);
      doc.text(fmt(sale.revenue), xP, yPos + 4);
      xP += saleColW[2];

      // Cost basis
      doc.setTextColor(...mutedColor);
      doc.text(fmt(sale.costBasis), xP, yPos + 4);
      xP += saleColW[3];

      // P&L
      doc.setTextColor(...(sale.realizedPnL >= 0 ? greenColor : redColor));
      doc.text((sale.realizedPnL >= 0 ? '+' : '') + fmt(sale.realizedPnL), xP, yPos + 4);
      xP += saleColW[4];

      // Holding days
      doc.setTextColor(...mutedColor);
      doc.text(`${sale.holdingDays}d`, xP, yPos + 4);
      xP += saleColW[5];

      // Status
      doc.setTextColor(...(sale.isTaxFree ? greenColor : amberColor));
      doc.setFont('helvetica', 'bold');
      doc.text(sale.isTaxFree ? 'Isento' : 'Tributável', xP, yPos + 4);
      doc.setFont('helvetica', 'normal');

      yPos += 8;
    }

    yPos += 10;
  }

  // --- Holdings ---
  if (data.assets.length > 0) {
    const checkNewPage2 = (needed: number) => {
      if (yPos + needed > 275) {
        doc.addPage();
        yPos = 20;
      }
    };

    checkNewPage2(25);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Holdings Atuais', 20, yPos);
    yPos += 10;

    const colWidths = [25, 30, 22, 25, 25, 25, 22];
    const headers = ['Asset', '1ª Compra', 'Dias', 'Custo', 'Valor', 'P&L', 'Estado'];

    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    let xH = 22;
    headers.forEach((h, i) => {
      doc.text(h, xH, yPos + 5.5);
      xH += colWidths[i];
    });
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    for (const asset of data.assets) {
      checkNewPage2(10);

      xH = 22;
      doc.setFontSize(7);

      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(asset.asset, xH, yPos + 4);
      doc.setFont('helvetica', 'normal');
      xH += colWidths[0];

      doc.setTextColor(...mutedColor);
      doc.text(asset.firstPurchase ? new Date(asset.firstPurchase).toLocaleDateString('pt-PT') : '-', xH, yPos + 4);
      xH += colWidths[1];

      doc.text(asset.holdingDays.toString(), xH, yPos + 4);
      xH += colWidths[2];

      doc.setTextColor(...primaryColor);
      doc.text(fmt(asset.totalCost), xH, yPos + 4);
      xH += colWidths[3];

      doc.text(fmt(asset.currentValue), xH, yPos + 4);
      xH += colWidths[4];

      doc.setTextColor(...(asset.unrealizedPnL >= 0 ? greenColor : redColor));
      doc.text((asset.unrealizedPnL >= 0 ? '+' : '') + fmt(asset.unrealizedPnL), xH, yPos + 4);
      xH += colWidths[5];

      doc.setTextColor(...(asset.isTaxFree ? greenColor : amberColor));
      doc.setFont('helvetica', 'bold');
      doc.text(asset.isTaxFree ? 'Isento' : 'Tributável', xH, yPos + 4);
      doc.setFont('helvetica', 'normal');

      yPos += 8;
    }
  }

  // --- Footer ---
  yPos = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'italic');
  doc.text('Este relatório é meramente informativo e não constitui aconselhamento fiscal.', pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Regime fiscal: Portugal | Método: FIFO | Isenção: >365 dias | Taxa: 28% | Moeda: ${data.currency}`, pageWidth / 2, yPos + 4, { align: 'center' });

  doc.save(`converge-impostos-${data.year}.pdf`);
}
