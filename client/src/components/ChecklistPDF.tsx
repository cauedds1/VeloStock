import { getChecklistCategories, getChecklistItems, ChecklistData } from "@shared/checklistUtils";

export function generateChecklistPDF(vehicle: any, checklist: ChecklistData) {
  const vehicleType = (vehicle?.vehicleType || "Carro") as "Carro" | "Moto";
  const categories = getChecklistCategories(vehicleType);
  const items = getChecklistItems(vehicleType);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Checklist - ${vehicle.brand} ${vehicle.model}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          background: white;
          color: #000;
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 8mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 2px solid #000;
        }
        .logo svg {
          width: 40px;
          height: 30px;
        }
        .header-title {
          font-size: 14px;
          font-weight: bold;
        }
        
        /* Vehicle Info Section */
        .vehicle-info-box {
          border: 2px solid #000;
          padding: 0;
          margin-bottom: 6px;
        }
        .vehicle-info-label {
          font-weight: bold;
          font-size: 11px;
          background: #f5f5f5;
          padding: 3px 6px;
          border-bottom: 1px solid #000;
        }
        .vehicle-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
        }
        .vehicle-field {
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 4px 6px;
          min-height: 26px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .vehicle-field:nth-child(3n) {
          border-right: none;
        }
        .vehicle-field-label {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 2px;
        }
        .vehicle-field-value {
          font-size: 11px;
          border-bottom: 1px solid #000;
          padding-bottom: 1px;
          min-height: 12px;
        }
        
        /* Checklist Section */
        .section-title {
          font-weight: bold;
          font-size: 11px;
          margin: 4px 0 4px 0;
          padding-bottom: 2px;
          border-bottom: 2px solid #000;
        }
        .checklist-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
          margin-bottom: 6px;
          max-height: 110px;
          overflow: hidden;
        }
        .checklist-column {
          font-size: 10px;
        }
        .category-header {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 3px;
          padding-bottom: 1px;
          border-bottom: 1px solid #000;
        }
        .checkbox-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 2px;
          gap: 3px;
        }
        .checkbox {
          width: 11px;
          height: 11px;
          border: 1px solid #000;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .item-text {
          flex: 1;
          font-size: 9px;
        }
        .item-line {
          border-bottom: 1px solid #999;
          flex: 1;
          margin-top: 5px;
        }
        
        /* Table */
        .service-table {
          width: 100%;
          border-collapse: collapse;
          margin: 4px 0 6px 0;
          font-size: 9px;
          height: 50px;
        }
        .service-table th,
        .service-table td {
          border: 1px solid #000;
          padding: 2px 3px;
          text-align: left;
        }
        .service-table th {
          background: #f5f5f5;
          font-weight: bold;
          height: 16px;
        }
        .service-table td {
          height: 17px;
        }
        
        /* Observations */
        .obs-box {
          border: 2px solid #000;
          padding: 6px;
          flex-grow: 1;
          margin-bottom: 6px;
          min-height: 80px;
        }
        
        /* Footer */
        .footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 10px;
          margin-top: 2px;
        }
        .footer-field {
          display: flex;
          flex-direction: column;
        }
        .footer-label {
          font-size: 9px;
          margin-bottom: 1px;
        }
        .footer-line {
          border-bottom: 1px solid #000;
          height: 18px;
        }
        
        @media print {
          body { margin: 0; padding: 0; }
          .page { margin: 0; padding: 8mm; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- HEADER -->
        <div class="header">
          <div class="logo">
            <svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="5" fill="#6366f1"/>
              <circle cx="22" cy="8" r="5" fill="#10b981"/>
              <circle cx="32" cy="14" r="5" fill="#f472b6"/>
              <circle cx="26" cy="26" r="5" fill="#06b6d4"/>
              <text x="42" y="22" font-family="Arial" font-size="13" font-weight="bold">
                <tspan fill="#6366f1">Velo</tspan><tspan fill="#10b981">Stock</tspan>
              </text>
            </svg>
          </div>
          <div class="header-title">Checklist de Inspeção de Veículos</div>
        </div>

        <!-- VEHICLE INFO -->
        <div class="vehicle-info-box">
          <div class="vehicle-info-label">INFORMAÇÕES DO VEÍCULO</div>
          <div class="vehicle-info-grid">
            <div class="vehicle-field">
              <div class="vehicle-field-label">MARCA:</div>
              <div class="vehicle-field-value">${vehicle.brand || ''}</div>
            </div>
            <div class="vehicle-field">
              <div class="vehicle-field-label">MODELO:</div>
              <div class="vehicle-field-value">${vehicle.model || ''}</div>
            </div>
            <div class="vehicle-field" style="border-right: none;">
              <div class="vehicle-field-label">ANO:</div>
              <div class="vehicle-field-value">${vehicle.year || ''}</div>
            </div>
            <div class="vehicle-field">
              <div class="vehicle-field-label">PLACA:</div>
              <div class="vehicle-field-value">${vehicle.plate || ''}</div>
            </div>
            <div class="vehicle-field">
              <div class="vehicle-field-label">COR:</div>
              <div class="vehicle-field-value">${vehicle.color || ''}</div>
            </div>
            <div class="vehicle-field" style="border-right: none;">
              <div class="vehicle-field-label">KM:</div>
              <div class="vehicle-field-value">${vehicle.kmOdometer ? vehicle.kmOdometer.toLocaleString('pt-BR') : ''}</div>
            </div>
          </div>
        </div>

        <!-- CHECKLIST -->
        <div class="section-title">CHECKLIST DE INSPEÇÃO</div>
        <div class="checklist-grid">
          ${(Object.keys(categories) as Array<keyof typeof categories>)
            .map((category) => {
              const categoryItems = items[category] || [];
              return `
                <div class="checklist-column">
                  <div class="category-header">${categories[category]}</div>
                  ${categoryItems
                    .map(
                      (itemName) => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${itemName}</div>
                      <div class="item-line"></div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- HISTÓRICO -->
        <div class="section-title">HISTÓRICO DE SERVIÇOS</div>
        <table class="service-table">
          <thead>
            <tr>
              <th style="width: 25%">Tipo de Serviço</th>
              <th style="width: 15%">Data</th>
              <th style="width: 15%">Local</th>
              <th style="width: 45%">Observações</th>
            </tr>
          </thead>
          <tbody>
            <tr><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <!-- OBSERVAÇÕES -->
        <div class="section-title">OBSERVAÇÕES GERAIS</div>
        <div class="obs-box"></div>

        <!-- FOOTER -->
        <div class="footer">
          <div class="footer-field">
            <div class="footer-label">Responsável pela Inspeção:</div>
            <div class="footer-line"></div>
          </div>
          <div class="footer-field">
            <div class="footer-label">Data: ___/___/_____</div>
            <div class="footer-line"></div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          const opt = {
            margin: 0,
            filename: 'checklist-${vehicle.brand}-${vehicle.model}-${vehicle.plate}.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { format: 'a4', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(document.querySelector('.page')).save();
          setTimeout(() => window.close(), 1000);
        };
      </script>
    </body>
    </html>
  `;

  return html;
}

export async function downloadChecklistPDF(vehicle: any, checklist: ChecklistData) {
  try {
    const htmlContent = generateChecklistPDF(vehicle, checklist);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}
