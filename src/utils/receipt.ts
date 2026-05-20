
export const getReceiptHtml = (sale: any, settings: any) => {
  if (!sale) return '';

  // Ensure items exist and totals are correct
  const items = Array.isArray(sale.items) ? sale.items : [];
  const totalItems = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  const discountValue = Number(sale.discount || 0);
  
  // If it's from API, total_amount is the final total. If it's from lastSale, total is the final total.
  const totalValue = Number(sale.total || sale.total_amount || 0);
  
  // Subtotal is the sum of items before discount
  const subtotalValue = Number(sale.subtotal || (totalValue + discountValue) || items.reduce((s: number, i: any) => s + (Number(i.price || i.unit_price || 0) * Number(i.quantity || 0)), 0));
  
  let paymentsList = sale.payments;
  if (!paymentsList && sale.payment_method) {
    if (typeof sale.payment_method === 'string' && (sale.payment_method.startsWith('[') || sale.payment_method.startsWith('{'))) {
      try {
        const parsed = JSON.parse(sale.payment_method);
        paymentsList = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        paymentsList = [{ method: sale.payment_method, amount: totalValue }];
      }
    } else {
      paymentsList = [{ method: sale.payment_method, amount: totalValue }];
    }
  }
  if (!paymentsList) paymentsList = [{ method: 'Não informado', amount: totalValue }];

  const totalPaid = paymentsList.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const change = sale.change !== undefined ? sale.change : (sale.change_amount !== undefined ? sale.change_amount : (totalPaid > totalValue ? totalPaid - totalValue : 0));

  return `
    <html>
      <head>
        <title>Comprovante de Venda - ${settings?.market_name || 'Market Manager'}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 70mm; 
            padding: 5mm; 
            font-size: 11px; 
            line-height: 1.2;
            color: #000;
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .market-name { font-size: 14px; font-weight: bold; text-transform: uppercase; }
          .details { margin-bottom: 10px; font-size: 10px; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .totals { font-weight: bold; }
          .total-row { display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; font-size: 9px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="market-name">${settings?.market_name || 'MARKET MANAGER'}</div>
          <div>${settings?.address || ''}</div>
          <div>CNPJ: ${settings?.cnpj || ''}</div>
          <div>Tel: ${settings?.phone || ''}</div>
        </div>
        
        <div class="details">
          <div>VENDA: #${sale.id}</div>
          <div>DATA: ${new Date(sale.date || sale.created_at || new Date()).toLocaleString('pt-BR')}</div>
          <div>CLIENTE: ${sale.customer?.name || sale.customer_name || 'CONSUMIDOR FINAL'}</div>
        </div>

        <div class="divider"></div>
        
        <div class="items">
          <div class="item" style="font-weight: bold; margin-bottom: 5px;">
            <span>ITEM</span>
            <span>QTD x V.UNIT</span>
            <span>TOTAL</span>
          </div>
          ${items.length > 0 ? items.map((item: any) => {
            const name = item.name || item.product_name || item.products?.name || 'Produto';
            const qty = Number(item.quantity || 0);
            const price = Number(item.price || item.unit_price || 0);
            const total = qty * price;
            const itemNotes = item.notes ? `<div style="font-size: 9px; font-style: italic; color: #666; margin-bottom: 3px;">Obs: ${item.notes}</div>` : '';
            
            return `
              <div class="item">
                <div style="flex: 1;">${name}</div>
              </div>
              ${itemNotes}
              <div class="item" style="margin-bottom: 5px;">
                <span></span>
                <span>${qty} x R$ ${price.toFixed(2)}</span>
                <span>R$ ${total.toFixed(2)}</span>
              </div>
            `;
          }).join('') : '<div style="text-align:center">Nenhum item</div>'}
        </div>

        ${sale.notes ? `
          <div style="margin-bottom: 10px; padding: 5px; border: 1px solid #000; font-size: 10px;">
            <strong>OBSERVAÇÃO:</strong><br/>
            ${sale.notes}
          </div>
        ` : ''}

        <div class="totals">
          <div class="total-row">
            <span>QTD. TOTAL ITENS:</span>
            <span>${totalItems}</span>
          </div>
          <div class="total-row">
            <span>SUBTOTAL:</span>
            <span>R$ ${subtotalValue.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>DESCONTO:</span>
            <span>- R$ ${discountValue.toFixed(2)}</span>
          </div>
          <div class="total-row" style="font-size: 12px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px;">
            <span>TOTAL:</span>
            <span>R$ ${totalValue.toFixed(2)}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="payments">
          <div style="font-weight: bold; margin-bottom: 5px;">PAGAMENTO:</div>
          ${paymentsList.map((p: any) => `
            <div class="total-row">
              <span>${p.method || p}:</span>
              <span>R$ ${Number(p.amount || totalValue).toFixed(2)}</span>
            </div>
          `).join('')}
          ${change > 0 ? `
            <div class="total-row" style="font-weight: bold; margin-top: 2px;">
              <span>TROCO:</span>
              <span>R$ ${change.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>Obrigado pela preferência!</div>
          <div>Volte sempre.</div>
        </div>
      </body>
    </html>
  `;
};

export const executePrint = (sale: any, settings: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const copies = Number(settings?.peripheral_printer_copies || 1);
  const receiptHtml = getReceiptHtml(sale, settings);
  
  // Repeat the receipt content if more than one copy is needed
  let fullContent = '';
  for (let i = 0; i < copies; i++) {
    fullContent += receiptHtml.replace('</body>', i < copies - 1 ? '<div style="page-break-after: always; border-bottom: 1px dashed #000; margin: 20px 0;"></div></body>' : '</body>');
  }

  const printHtml = `
    ${fullContent.replace(/<\/body>/g, '').replace(/<html>/g, '').replace(/<head>[\s\S]*?<\/head>/g, '').replace(/<body>/g, '')}
    <script>
      function startPrint() {
        window.print();
        setTimeout(() => {
          window.close();
        }, 500);
      }
      
      if (document.readyState === 'complete') {
        startPrint();
      } else {
        window.onload = startPrint;
      }
    </script>
  `;

  // Wrap in a single html structure
  const finalHtml = `
    <html>
      <head>
        <title>Impressão - ${settings?.market_name || 'Market Manager'}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 70mm; padding: 5mm; font-size: 11px; line-height: 1.2; color: #000; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .market-name { font-size: 14px; font-weight: bold; text-transform: uppercase; }
          .details { margin-bottom: 10px; font-size: 10px; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .totals { font-weight: bold; }
          .total-row { display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; font-size: 9px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
        </style>
      </head>
      <body>
        ${printHtml}
      </body>
    </html>
  `;

  printWindow.document.write(finalHtml);
  printWindow.document.close();
};
