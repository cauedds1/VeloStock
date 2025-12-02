import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, Printer } from "lucide-react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2pdf from "html2pdf.js";

type ReportData = {
  empresa: { nome: string; logo: string | null };
  periodo: { tipo: string; mes: number; ano: number; dataInicio: string; dataFim: string };
  resumoFinanceiro: {
    receitaTotal: number;
    custoAquisicao: number;
    custoOperacional: number;
    despesasOperacionais: number;
    comissoes: number;
    custoTotal: number;
    lucroLiquido: number;
    margemLucro: number;
  };
  vendas: { quantidade: number; receitaTotal: number; ticketMedio: number };
  comissoes: { total: number; pagas: number; aPagar: number };
  contasPagar: { lista: any[]; total: number; quantidade?: number; vencidas: number; valorVencido: number };
  contasReceber: { lista: any[]; total: number; quantidade?: number; vencidas: number; valorVencido: number };
  despesasOperacionais: { lista: any[]; total: number };
  custosPorCategoria: { categoria: string; total: number; quantidade: number }[];
  rankingVendedores: { nome: string; email: string; vendas: number; receita: number; comissao: number }[];
  observacoesPendentes: number;
  dataGeracao: string;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function FinancialReportPDF() {
  const [open, setOpen] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("mensal");
  const [mesAno, setMesAno] = useState<string>(`${new Date().getMonth() + 1}-${new Date().getFullYear()}`);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const buildReportUrl = () => {
    const params = new URLSearchParams();
    
    if (tipoRelatorio === "personalizado" && dataInicio && dataFim) {
      params.set("startDate", dataInicio);
      params.set("endDate", dataFim);
      params.set("tipo", "personalizado");
    } else if (tipoRelatorio === "ultimos3meses") {
      const now = new Date();
      const start = subMonths(now, 3);
      params.set("startDate", start.toISOString());
      params.set("endDate", now.toISOString());
      params.set("tipo", "ultimos3meses");
    } else if (tipoRelatorio === "mespassado") {
      const lastMonth = subMonths(new Date(), 1);
      params.set("mes", String(lastMonth.getMonth() + 1));
      params.set("ano", String(lastMonth.getFullYear()));
      params.set("tipo", "mespassado");
    } else {
      const [mes, ano] = mesAno.split("-");
      params.set("mes", mes);
      params.set("ano", ano);
      params.set("tipo", "mensal");
    }
    
    return `/api/financial/report/complete?${params.toString()}`;
  };

  const { data: reportData, isLoading, refetch } = useQuery<ReportData>({
    queryKey: [buildReportUrl()],
    enabled: open,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getPeriodoLabel = () => {
    if (!reportData) return "";
    const { tipo, mes, ano, dataInicio, dataFim } = reportData.periodo;
    
    if (tipo === "personalizado" || tipo === "ultimos3meses") {
      return `${formatDate(dataInicio)} a ${formatDate(dataFim)}`;
    }
    return `${MESES[mes - 1]} de ${ano}`;
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    setIsGenerating(true);
    
    const element = reportRef.current;
    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: `Fluxo_Caixa_${reportData?.empresa.nome || "Empresa"}_${format(new Date(), "yyyy-MM-dd")}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fluxo de Caixa - ${reportData?.empresa.nome}</title>
          <style>
            ${getReportStyles()}
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getReportStyles = () => `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', -apple-system, Arial, sans-serif; margin: 0; padding: 0; }
    body { color: #1a1a1a; line-height: 1.3; font-size: 9px; }
    
    .report-page {
      width: 194mm;
      min-height: 277mm;
      max-height: 277mm;
      margin: 0 auto;
      padding: 0;
      overflow: hidden;
    }
    
    /* HEADER - 18% */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8px;
      border-bottom: 2px solid #7c3aed;
      margin-bottom: 8px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-box {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #7c3aed, #9333ea);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 20px;
    }
    .header-title h1 {
      font-size: 14px;
      color: #1a1a1a;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .header-title .subtitle {
      font-size: 10px;
      color: #7c3aed;
      font-weight: 600;
    }
    .header-right {
      text-align: right;
      font-size: 9px;
      color: #666;
    }
    .header-right .periodo {
      font-size: 11px;
      color: #1a1a1a;
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    /* SALDO PRINCIPAL - 12% */
    .saldo-box {
      background: linear-gradient(135deg, #f8f5ff, #ede9fe);
      border: 2px solid #7c3aed;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
      margin-bottom: 10px;
    }
    .saldo-label {
      font-size: 10px;
      color: #5b21b6;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .saldo-value {
      font-size: 28px;
      font-weight: 700;
    }
    .saldo-value.positivo { color: #16a34a; }
    .saldo-value.negativo { color: #dc2626; }
    .saldo-subtitle {
      font-size: 9px;
      color: #666;
      margin-top: 4px;
    }
    
    /* FLUXO DE CAIXA - GRID 2 COLUNAS - 28% */
    .fluxo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .fluxo-col {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 10px;
    }
    .fluxo-col.entradas { border-left: 3px solid #16a34a; }
    .fluxo-col.saidas { border-left: 3px solid #dc2626; }
    
    .fluxo-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e5;
    }
    .fluxo-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
    }
    .fluxo-icon.entrada { background: #16a34a; }
    .fluxo-icon.saida { background: #dc2626; }
    .fluxo-title {
      font-size: 11px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .fluxo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 9px;
    }
    .fluxo-item-label { color: #666; }
    .fluxo-item-value { font-weight: 600; color: #1a1a1a; }
    .fluxo-item-detail { font-size: 8px; color: #999; }
    
    .fluxo-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 2px solid #e5e5e5;
      font-size: 11px;
      font-weight: 700;
    }
    .fluxo-total.entrada { color: #16a34a; }
    .fluxo-total.saida { color: #dc2626; }
    
    /* SEÇÕES DE TABELAS - 35% */
    .tables-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }
    .section {
      margin-bottom: 0;
    }
    .section-header {
      background: #7c3aed;
      color: white;
      font-size: 9px;
      font-weight: 700;
      padding: 5px 8px;
      border-radius: 4px 4px 0 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-content {
      border: 1px solid #e5e5e5;
      border-top: none;
      border-radius: 0 0 4px 4px;
      background: white;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
    }
    th {
      background: #f5f3ff;
      color: #5b21b6;
      font-weight: 700;
      padding: 5px 6px;
      text-align: left;
      font-size: 7px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1px solid #e5e5e5;
    }
    td {
      padding: 4px 6px;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
    }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #fafaf8; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-green { color: #16a34a; }
    .text-red { color: #dc2626; }
    
    .empty-message {
      padding: 12px;
      text-align: center;
      color: #999;
      font-size: 8px;
      font-style: italic;
    }
    
    /* RODAPÉ - 5% */
    .footer {
      margin-top: auto;
      padding-top: 6px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 7px;
      color: #999;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-page { width: 100%; min-height: auto; }
    }
  `;

  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    for (let y = currentYear; y >= currentYear - 2; y--) {
      for (let m = (y === currentYear ? currentMonth : 11); m >= 0; m--) {
        options.push({ value: `${m + 1}-${y}`, label: `${MESES[m]} ${y}` });
      }
    }
    return options;
  };

  // Calcular totais de fluxo de caixa
  const calcularFluxo = () => {
    if (!reportData) return { entradas: 0, saidas: 0, saldo: 0 };
    
    const entradas = 
      reportData.vendas.receitaTotal + 
      reportData.contasReceber.total;
    
    const saidas = 
      reportData.resumoFinanceiro.custoAquisicao +
      reportData.resumoFinanceiro.custoOperacional +
      reportData.resumoFinanceiro.despesasOperacionais +
      reportData.comissoes.pagas +
      reportData.contasPagar.total;
    
    return {
      entradas,
      saidas,
      saldo: entradas - saidas
    };
  };

  const fluxo = calcularFluxo();
  const top5Custos = reportData?.custosPorCategoria.slice(0, 5) || [];
  const top3Vendedores = reportData?.rankingVendedores.slice(0, 3) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-export-pdf">
          <FileText className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Exportar PDF</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Fluxo de Caixa
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={tipoRelatorio} onValueChange={(v) => { setTipoRelatorio(v); refetch(); }}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="mespassado">Mês Passado</SelectItem>
                  <SelectItem value="ultimos3meses">Últimos 3 Meses</SelectItem>
                  <SelectItem value="personalizado">Por Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {tipoRelatorio === "mensal" && (
              <div className="space-y-2">
                <Label>Mês/Ano</Label>
                <Select value={mesAno} onValueChange={(v) => { setMesAno(v); refetch(); }}>
                  <SelectTrigger data-testid="select-month-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {tipoRelatorio === "personalizado" && (
              <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input 
                    type="date" 
                    value={dataInicio} 
                    onChange={(e) => setDataInicio(e.target.value)}
                    data-testid="input-date-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input 
                    type="date" 
                    value={dataFim} 
                    onChange={(e) => setDataFim(e.target.value)}
                    data-testid="input-date-end"
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end gap-2">
              <Button onClick={generatePDF} disabled={isGenerating || isLoading || !reportData} data-testid="button-download-pdf">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                <span className="hidden sm:inline">Baixar PDF</span>
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={isLoading || !reportData} data-testid="button-print">
                <Printer className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : reportData ? (
            <div ref={reportRef} style={{ backgroundColor: 'white', color: '#1a1a1a', padding: '16px' }}>
              <style>{getReportStyles()}</style>
              <div className="report-page">
                
                {/* ========== HEADER - 18% ========== */}
                <div className="header">
                  <div className="header-left">
                    <div className="logo-box">V</div>
                    <div className="header-title">
                      <h1>{reportData.empresa.nome}</h1>
                      <div className="subtitle">Relatório de Fluxo de Caixa</div>
                    </div>
                  </div>
                  <div className="header-right">
                    <div className="periodo">{getPeriodoLabel()}</div>
                    <div>Gerado em: {format(new Date(reportData.dataGeracao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                  </div>
                </div>

                {/* ========== SALDO DO PERÍODO - 12% ========== */}
                <div className="saldo-box">
                  <div className="saldo-label">Saldo do Período (Entradas - Saídas)</div>
                  <div className={`saldo-value ${fluxo.saldo >= 0 ? 'positivo' : 'negativo'}`}>
                    {formatCurrency(fluxo.saldo)}
                  </div>
                  <div className="saldo-subtitle">
                    {reportData.vendas.quantidade} veículo(s) vendido(s) no período
                  </div>
                </div>

                {/* ========== FLUXO DE CAIXA - 28% ========== */}
                <div className="fluxo-grid">
                  {/* ENTRADAS */}
                  <div className="fluxo-col entradas">
                    <div className="fluxo-header">
                      <div className="fluxo-icon entrada">+</div>
                      <div className="fluxo-title">ENTRADAS</div>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Receitas de Vendas</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.vendas.receitaTotal)}</span>
                    </div>
                    <div className="fluxo-item">
                      <span className="fluxo-item-detail">{reportData.vendas.quantidade} veículo(s)</span>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Contas Recebidas</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.contasReceber.total)}</span>
                    </div>
                    <div className="fluxo-item">
                      <span className="fluxo-item-detail">{reportData.contasReceber.lista?.length || 0} conta(s)</span>
                    </div>
                    
                    <div className="fluxo-total entrada">
                      <span>TOTAL DE ENTRADAS</span>
                      <span>{formatCurrency(fluxo.entradas)}</span>
                    </div>
                  </div>

                  {/* SAÍDAS */}
                  <div className="fluxo-col saidas">
                    <div className="fluxo-header">
                      <div className="fluxo-icon saida">-</div>
                      <div className="fluxo-title">SAÍDAS</div>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Custo de Aquisição</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.resumoFinanceiro.custoAquisicao)}</span>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Custos Operacionais</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.resumoFinanceiro.custoOperacional)}</span>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Despesas Operacionais</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.resumoFinanceiro.despesasOperacionais)}</span>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Comissões Pagas</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.comissoes.pagas)}</span>
                    </div>
                    
                    <div className="fluxo-item">
                      <span className="fluxo-item-label">Contas Pagas</span>
                      <span className="fluxo-item-value">{formatCurrency(reportData.contasPagar.total)}</span>
                    </div>
                    <div className="fluxo-item">
                      <span className="fluxo-item-detail">{reportData.contasPagar.lista?.length || 0} conta(s)</span>
                    </div>
                    
                    <div className="fluxo-total saida">
                      <span>TOTAL DE SAÍDAS</span>
                      <span>{formatCurrency(fluxo.saidas)}</span>
                    </div>
                  </div>
                </div>

                {/* ========== TABELAS - 35% ========== */}
                <div className="tables-grid">
                  {/* CUSTOS POR CATEGORIA */}
                  <div className="section">
                    <div className="section-header">Detalhamento de Custos (Top 5)</div>
                    <div className="section-content">
                      {top5Custos.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Categoria</th>
                              <th className="text-center">Qtd</th>
                              <th className="text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {top5Custos.map((cat, idx) => (
                              <tr key={idx}>
                                <td>{cat.categoria}</td>
                                <td className="text-center">{cat.quantidade}</td>
                                <td className="text-right font-bold">{formatCurrency(cat.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="empty-message">Nenhum custo registrado no período</div>
                      )}
                    </div>
                  </div>

                  {/* RANKING DE VENDEDORES */}
                  <div className="section">
                    <div className="section-header">Performance de Vendedores (Top 3)</div>
                    <div className="section-content">
                      {top3Vendedores.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Vendedor</th>
                              <th className="text-center">Vendas</th>
                              <th className="text-right">Receita</th>
                              <th className="text-right">Comissão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {top3Vendedores.map((vendor, idx) => (
                              <tr key={idx}>
                                <td>{vendor.nome}</td>
                                <td className="text-center">{vendor.vendas}</td>
                                <td className="text-right text-green">{formatCurrency(vendor.receita)}</td>
                                <td className="text-right">{formatCurrency(vendor.comissao)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="empty-message">Nenhuma venda registrada no período</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========== RODAPÉ - 5% ========== */}
                <div className="footer">
                  Relatório gerado pelo VeloStock em {format(new Date(reportData.dataGeracao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
