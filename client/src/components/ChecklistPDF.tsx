import { getChecklistCategories, getChecklistItems, ChecklistData } from "@shared/checklistUtils";

interface CustomChecklistItem {
  id: string;
  itemName: string;
  categoryKey: string | null;
  categoryId: string | null;
}

interface CustomCategory {
  id: string;
  name: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateChecklistHTML(
  vehicle: any, 
  checklist: ChecklistData,
  customItems?: CustomChecklistItem[],
  customCategories?: CustomCategory[]
) {
  const vehicleType = (vehicle?.vehicleType || "Carro") as "Carro" | "Moto";
  const categories = getChecklistCategories(vehicleType);
  const items = getChecklistItems(vehicleType);
  const safeFilename = `checklist-${escapeHtml(vehicle.brand || '')}-${escapeHtml(vehicle.model || '')}-${escapeHtml(vehicle.plate || '')}.pdf`;

  const customItemsByCategory = customItems?.reduce((acc, item) => {
    const key = item.categoryKey || `custom:${item.categoryId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item.itemName);
    return acc;
  }, {} as Record<string, string[]>) || {};

  const customCategoryMap = customCategories?.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Checklist - ${escapeHtml(vehicle.brand || '')} ${escapeHtml(vehicle.model || '')}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* TOOLBAR - Hidden on print */
        .toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1000;
        }
        .toolbar-title {
          color: white;
          font-size: 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .toolbar-title svg {
          width: 24px;
          height: 24px;
        }
        .toolbar-buttons {
          display: flex;
          gap: 12px;
        }
        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toolbar-btn svg {
          width: 18px;
          height: 18px;
        }
        .btn-print {
          background: white;
          color: #7c3aed;
        }
        .btn-print:hover {
          background: #f3f4f6;
          transform: translateY(-1px);
        }
        .btn-download {
          background: #22c55e;
          color: white;
        }
        .btn-download:hover {
          background: #16a34a;
          transform: translateY(-1px);
        }
        .btn-download:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        
        /* PAGE CONTAINER */
        .page-wrapper {
          padding: 80px 20px 20px 20px;
          display: flex;
          justify-content: center;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 18mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        /* HEADER / LOGO */
        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: #a855f7;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-icon svg {
          width: 28px;
          height: 28px;
        }
        .logo-text {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          letter-spacing: -0.5px;
        }
        .logo-text span {
          color: #22c55e;
        }
        .header-title {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* VEHICLE INFO SECTION */
        .vehicle-info-box {
          border: 1.5px solid #1f2937;
          margin-bottom: 20px;
        }
        .vehicle-info-header {
          font-weight: bold;
          font-size: 11px;
          background: #f3f4f6;
          padding: 8px 12px;
          border-bottom: 1px solid #1f2937;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vehicle-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
        }
        .vehicle-field {
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          padding: 10px 12px;
          min-height: 42px;
        }
        .vehicle-field:nth-child(3n) {
          border-right: none;
        }
        .vehicle-field:nth-child(n+4) {
          border-bottom: none;
        }
        .vehicle-field-label {
          font-weight: bold;
          font-size: 10px;
          color: #6b7280;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .vehicle-field-value {
          font-size: 13px;
          color: #1f2937;
          font-weight: 500;
        }
        
        /* CHECKLIST SECTION */
        .section-title {
          font-weight: bold;
          font-size: 12px;
          margin: 0 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid #1f2937;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .checklist-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .checklist-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        
        .category-section {
          margin-bottom: 4px;
        }
        
        .category-header {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e7eb;
          text-transform: uppercase;
          color: #374151;
        }
        
        .checkbox-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }
        
        .checkbox {
          width: 12px;
          height: 12px;
          border: 1.5px solid #374151;
          flex-shrink: 0;
        }
        
        .item-text {
          font-size: 10px;
          color: #1f2937;
          white-space: nowrap;
        }
        
        .item-obs-line {
          flex: 1;
          border-bottom: 1px solid #d1d5db;
          margin-left: 4px;
          min-width: 30px;
        }
        
        /* SERVICE HISTORY TABLE */
        .service-section {
          margin-bottom: 20px;
        }
        
        .service-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        
        .service-table th {
          background: #f3f4f6;
          border: 1px solid #1f2937;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
        }
        
        .service-table td {
          border: 1px solid #d1d5db;
          padding: 14px 8px;
          min-height: 32px;
        }
        
        /* OBSERVATIONS */
        .obs-section {
          margin-bottom: 25px;
          flex-grow: 1;
        }
        
        .obs-box {
          border: 1.5px solid #1f2937;
          min-height: 100px;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        
        .obs-line {
          border-bottom: 1px solid #d1d5db;
          height: 24px;
          width: 100%;
        }
        .obs-line:last-child {
          border-bottom: none;
        }
        
        /* FOOTER - Aligned */
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          padding-top: 20px;
          gap: 40px;
        }
        
        .footer-signature {
          flex: 1;
          max-width: 280px;
        }
        
        .footer-signature-line {
          border-bottom: 1px solid #1f2937;
          height: 1px;
          margin-bottom: 6px;
        }
        
        .footer-signature-label {
          font-size: 11px;
          color: #374151;
          text-align: center;
        }
        
        .footer-date {
          font-size: 11px;
          color: #374151;
          white-space: nowrap;
        }
        
        /* Print break rules */
        .vehicle-info-box,
        .category-section,
        .service-section,
        .service-table,
        .obs-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .toolbar {
            display: none !important;
          }
          .page-wrapper {
            padding: 0;
          }
          .page { 
            margin: 0; 
            padding: 15mm 18mm;
            box-shadow: none;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <!-- TOOLBAR -->
      <div class="toolbar">
        <div class="toolbar-title">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 17H21C21.27 17 21.5 16.89 21.71 16.71C21.9 16.5 22 16.27 22 16V14C22 12.9 21.1 12 20 12H18L16.5 9.5C16.17 8.9 15.53 8.5 14.83 8.5H9.17C8.47 8.5 7.83 8.9 7.5 9.5L6 12H4C2.9 12 2 12.9 2 14V16C2 16.27 2.1 16.5 2.29 16.71C2.5 16.89 2.73 17 3 17H5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="7" cy="17" r="2" stroke="white" stroke-width="2"/>
            <circle cx="17" cy="17" r="2" stroke="white" stroke-width="2"/>
          </svg>
          VeloStock - Checklist de Inspeção
        </div>
        <div class="toolbar-buttons">
          <button class="toolbar-btn btn-print" onclick="window.print()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
          <button class="toolbar-btn btn-download" id="downloadBtn" onclick="downloadPDF()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Baixar PDF
          </button>
        </div>
      </div>

      <!-- PAGE CONTENT -->
      <div class="page-wrapper">
        <div class="page" id="checklistPage">
          <!-- HEADER COM LOGO -->
          <div class="header">
            <div class="logo-container">
              <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 17H21C21.27 17 21.5 16.89 21.71 16.71C21.9 16.5 22 16.27 22 16V14C22 12.9 21.1 12 20 12H18L16.5 9.5C16.17 8.9 15.53 8.5 14.83 8.5H9.17C8.47 8.5 7.83 8.9 7.5 9.5L6 12H4C2.9 12 2 12.9 2 14V16C2 16.27 2.1 16.5 2.29 16.71C2.5 16.89 2.73 17 3 17H5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="7" cy="17" r="2" stroke="white" stroke-width="2"/>
                  <circle cx="17" cy="17" r="2" stroke="white" stroke-width="2"/>
                </svg>
              </div>
              <div class="logo-text">Velo<span>Stock</span></div>
            </div>
            <div class="header-title">Checklist de Inspeção de Veículos</div>
          </div>

          <!-- INFORMAÇÕES DO VEÍCULO -->
          <div class="vehicle-info-box">
            <div class="vehicle-info-header">Informações do Veículo</div>
            <div class="vehicle-info-grid">
              <div class="vehicle-field">
                <div class="vehicle-field-label">Marca:</div>
                <div class="vehicle-field-value">${escapeHtml(vehicle.brand || '')}</div>
              </div>
              <div class="vehicle-field">
                <div class="vehicle-field-label">Modelo:</div>
                <div class="vehicle-field-value">${escapeHtml(vehicle.model || '')}</div>
              </div>
              <div class="vehicle-field">
                <div class="vehicle-field-label">Ano:</div>
                <div class="vehicle-field-value">${escapeHtml(String(vehicle.year || ''))}</div>
              </div>
              <div class="vehicle-field">
                <div class="vehicle-field-label">Placa:</div>
                <div class="vehicle-field-value">${escapeHtml(vehicle.plate || '')}</div>
              </div>
              <div class="vehicle-field">
                <div class="vehicle-field-label">Cor:</div>
                <div class="vehicle-field-value">${escapeHtml(vehicle.color || '')}</div>
              </div>
              <div class="vehicle-field">
                <div class="vehicle-field-label">KM:</div>
                <div class="vehicle-field-value">${vehicle.kmOdometer ? escapeHtml(vehicle.kmOdometer.toLocaleString('pt-BR')) : ''}</div>
              </div>
            </div>
          </div>

          <!-- CHECKLIST DE INSPEÇÃO -->
          <div class="section-title">Checklist de Inspeção</div>
          <div class="checklist-container">
            <!-- Coluna Esquerda -->
            <div class="checklist-column">
              <!-- PNEUS -->
              <div class="category-section">
                <div class="category-header">${categories.pneus}</div>
                <div class="checkbox-list">
                  ${[...(items.pneus || []), ...(customItemsByCategory['pneus'] || [])].map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- INTERIOR / BANCOS -->
              <div class="category-section">
                <div class="category-header">${categories.interior}</div>
                <div class="checkbox-list">
                  ${[...(items.interior || []), ...(customItemsByCategory['interior'] || [])].map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- LATARIA / PINTURA -->
              <div class="category-section">
                <div class="category-header">${categories.lataria}</div>
                <div class="checkbox-list">
                  ${[...(items.lataria || []), ...(customItemsByCategory['lataria'] || [])].map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <!-- Coluna Direita -->
            <div class="checklist-column">
              <!-- SOM / ELÉTRICA -->
              <div class="category-section">
                <div class="category-header">${categories.somEletrica}</div>
                <div class="checkbox-list">
                  ${[...(items.somEletrica || []), ...(customItemsByCategory['somEletrica'] || [])].map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- DOCUMENTAÇÃO -->
              <div class="category-section">
                <div class="category-header">${categories.documentacao}</div>
                <div class="checkbox-list">
                  ${[...(items.documentacao || []), ...(customItemsByCategory['documentacao'] || [])].map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- EQUIPAMENTOS DE SEGURANÇA -->
              <div class="category-section">
                <div class="category-header">${categories.equipamentos}</div>
                <div class="checkbox-list">
                  ${[...(items.equipamentos || []), ...(customItemsByCategory['equipamentos'] || [])].map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- CATEGORIAS CUSTOMIZADAS -->
          ${Object.keys(customItemsByCategory).filter(key => key.startsWith('custom:')).map(key => {
            const categoryId = key.replace('custom:', '');
            const categoryName = customCategoryMap[categoryId] || 'Categoria Personalizada';
            const categoryItems = customItemsByCategory[key] || [];
            return `
              <div class="category-section" style="margin-bottom: 16px;">
                <div class="category-header">${escapeHtml(categoryName)}</div>
                <div class="checkbox-list">
                  ${categoryItems.map(item => `
                    <div class="checkbox-item">
                      <div class="checkbox"></div>
                      <div class="item-text">${escapeHtml(item)}</div>
                      <div class="item-obs-line"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}

          <!-- HISTÓRICO DE SERVIÇOS -->
          <div class="service-section">
            <div class="section-title">Histórico de Serviços</div>
            <table class="service-table">
              <thead>
                <tr>
                  <th style="width: 30%">Tipo de Serviço</th>
                  <th style="width: 15%">Data</th>
                  <th style="width: 15%">Local</th>
                  <th style="width: 40%">Observações</th>
                </tr>
              </thead>
              <tbody>
                <tr><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td></td><td></td><td></td></tr>
              </tbody>
            </table>
          </div>

          <!-- OBSERVAÇÕES GERAIS -->
          <div class="obs-section">
            <div class="section-title">Observações Gerais</div>
            <div class="obs-box">
              <div class="obs-line"></div>
              <div class="obs-line"></div>
              <div class="obs-line"></div>
              <div class="obs-line"></div>
            </div>
          </div>

          <!-- FOOTER - Aligned -->
          <div class="footer">
            <div class="footer-signature">
              <div class="footer-signature-line"></div>
              <div class="footer-signature-label">Responsável pela Inspeção</div>
            </div>
            <div class="footer-date">Data: ____/____/________</div>
          </div>
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
      <script>
        function downloadPDF() {
          const btn = document.getElementById('downloadBtn');
          btn.disabled = true;
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg> Gerando...';
          
          const opt = {
            margin: 0,
            filename: '${safeFilename}',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
              scale: 2,
              useCORS: true,
              logging: false
            },
            jsPDF: { format: 'a4', orientation: 'portrait' }
          };
          
          html2pdf().set(opt).from(document.getElementById('checklistPage')).save().then(function() {
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Baixar PDF';
          });
        }
      </script>
      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    </body>
    </html>
  `;

  return html;
}

export async function openChecklistPreview(
  vehicle: any, 
  checklist: ChecklistData,
  customItems?: CustomChecklistItem[],
  customCategories?: CustomCategory[]
) {
  try {
    const htmlContent = generateChecklistHTML(vehicle, checklist, customItems, customCategories);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (error) {
    console.error('Erro ao abrir visualização:', error);
    throw error;
  }
}

export async function downloadChecklistPDF(
  vehicle: any, 
  checklist: ChecklistData,
  customItems?: CustomChecklistItem[],
  customCategories?: CustomCategory[]
) {
  return openChecklistPreview(vehicle, checklist, customItems, customCategories);
}
