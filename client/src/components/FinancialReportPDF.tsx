import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, Printer, TrendingUp, TrendingDown, DollarSign, Users, Wallet, Calendar } from "lucide-react";
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
  contasPagar: { lista: any[]; total: number; vencidas: number; valorVencido: number };
  contasReceber: { lista: any[]; total: number; vencidas: number; valorVencido: number };
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
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Relatorio_Financeiro_${reportData?.empresa.nome || "Empresa"}_${format(new Date(), "yyyy-MM-dd")}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
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
          <title>Relatório Financeiro - ${reportData?.empresa.nome}</title>
          <style>
            ${getPrintStyles()}
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

  const getPrintStyles = () => `
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 0; color: #1a1a1a; line-height: 1.4; }
    .report-container { width: 100%; max-width: 210mm; margin: 0 auto; }
    .header { text-align: center; padding-bottom: 15px; border-bottom: 3px solid #7c3aed; margin-bottom: 20px; }
    .header h1 { font-size: 24px; color: #7c3aed; margin: 0 0 5px 0; }
    .header p { color: #666; margin: 3px 0; font-size: 12px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 600; color: #7c3aed; padding: 8px 12px; background: #f5f3ff; border-left: 4px solid #7c3aed; margin-bottom: 12px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .summary-card { padding: 12px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; text-align: center; }
    .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
    .summary-card .value { font-size: 16px; font-weight: 700; }
    .summary-card .value.positive { color: #16a34a; }
    .summary-card .value.negative { color: #dc2626; }
    .summary-card .value.neutral { color: #1a1a1a; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f5f3ff; font-weight: 600; color: #5b21b6; font-size: 10px; text-transform: uppercase; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e5e5; font-size: 10px; color: #888; text-align: center; }
    .result-box { padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0; }
    .result-box.profit { background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid #86efac; }
    .result-box.loss { background: linear-gradient(135deg, #fee2e2, #fecaca); border: 1px solid #fca5a5; }
    .result-box .label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .result-box .value { font-size: 28px; font-weight: 700; }
    .result-box.profit .value { color: #15803d; }
    .result-box.loss .value { color: #b91c1c; }
    .mini-stats { display: flex; justify-content: center; gap: 30px; margin-top: 10px; font-size: 11px; color: #666; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-export-pdf">
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório Financeiro
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
                Baixar PDF
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={isLoading || !reportData} data-testid="button-print">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto border rounded-lg bg-white dark:bg-slate-950">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : reportData ? (
            <div ref={reportRef} className="p-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
              <style>{getPrintStyles()}</style>
              <div className="report-container">
                <div className="header">
                  <h1>{reportData.empresa.nome}</h1>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: '#5b21b6' }}>Relatório Financeiro</p>
                  <p>Período: {getPeriodoLabel()}</p>
                  <p>Gerado em: {format(new Date(reportData.dataGeracao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>

                <div className="result-box" style={{ background: reportData.resumoFinanceiro.lucroLiquido >= 0 ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #fee2e2, #fecaca)', border: reportData.resumoFinanceiro.lucroLiquido >= 0 ? '1px solid #86efac' : '1px solid #fca5a5' }}>
                  <div className="label">Resultado do Período</div>
                  <div className="value" style={{ color: reportData.resumoFinanceiro.lucroLiquido >= 0 ? '#15803d' : '#b91c1c' }}>
                    {formatCurrency(reportData.resumoFinanceiro.lucroLiquido)}
                  </div>
                  <div className="mini-stats">
                    <span>Margem: {reportData.resumoFinanceiro.margemLucro.toFixed(1)}%</span>
                    <span>|</span>
                    <span>{reportData.vendas.quantidade} veículos vendidos</span>
                  </div>
                </div>

                <div className="section">
                  <div className="section-title">Resumo Financeiro</div>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="label">Receita Total</div>
                      <div className="value positive">{formatCurrency(reportData.resumoFinanceiro.receitaTotal)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="label">Custo Aquisição</div>
                      <div className="value negative">{formatCurrency(reportData.resumoFinanceiro.custoAquisicao)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="label">Custo Operacional</div>
                      <div className="value negative">{formatCurrency(reportData.resumoFinanceiro.custoOperacional)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="label">Despesas</div>
                      <div className="value negative">{formatCurrency(reportData.resumoFinanceiro.despesasOperacionais)}</div>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-title">Vendas</div>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="label">Quantidade</div>
                      <div className="value neutral">{reportData.vendas.quantidade}</div>
                    </div>
                    <div className="summary-card">
                      <div className="label">Receita</div>
                      <div className="value positive">{formatCurrency(reportData.vendas.receitaTotal)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="label">Ticket Médio</div>
                      <div className="value neutral">{formatCurrency(reportData.vendas.ticketMedio)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="label">Comissões</div>
                      <div className="value negative">{formatCurrency(reportData.comissoes.total)}</div>
                    </div>
                  </div>
                </div>

                <div className="two-col" style={{ pageBreakInside: 'avoid' }}>
                  <div className="section">
                    <div className="section-title">Contas a Pagar</div>
                    <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <div className="summary-card">
                        <div className="label">Total</div>
                        <div className="value negative">{formatCurrency(reportData.contasPagar.total)}</div>
                      </div>
                      <div className="summary-card">
                        <div className="label">Vencidas</div>
                        <div className="value" style={{ color: reportData.contasPagar.vencidas > 0 ? '#dc2626' : '#16a34a' }}>
                          {reportData.contasPagar.vencidas} ({formatCurrency(reportData.contasPagar.valorVencido)})
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-title">Contas a Receber</div>
                    <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <div className="summary-card">
                        <div className="label">Total</div>
                        <div className="value positive">{formatCurrency(reportData.contasReceber.total)}</div>
                      </div>
                      <div className="summary-card">
                        <div className="label">Vencidas</div>
                        <div className="value" style={{ color: reportData.contasReceber.vencidas > 0 ? '#dc2626' : '#16a34a' }}>
                          {reportData.contasReceber.vencidas} ({formatCurrency(reportData.contasReceber.valorVencido)})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {reportData.custosPorCategoria.length > 0 && (
                  <div className="section" style={{ pageBreakInside: 'avoid' }}>
                    <div className="section-title">Custos por Categoria</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Categoria</th>
                          <th className="text-center">Quantidade</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.custosPorCategoria.map((cat, idx) => (
                          <tr key={idx}>
                            <td>{cat.categoria}</td>
                            <td className="text-center">{cat.quantidade}</td>
                            <td className="text-right" style={{ color: '#dc2626' }}>{formatCurrency(cat.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportData.rankingVendedores.length > 0 && (
                  <div className="section" style={{ pageBreakInside: 'avoid' }}>
                    <div className="section-title">Ranking de Vendedores</div>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Vendedor</th>
                          <th className="text-center">Vendas</th>
                          <th className="text-right">Receita</th>
                          <th className="text-right">Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.rankingVendedores.map((v, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: idx === 0 ? '#ca8a04' : '#666' }}>{idx + 1}</td>
                            <td>{v.nome || "Não informado"}</td>
                            <td className="text-center">{v.vendas}</td>
                            <td className="text-right" style={{ color: '#16a34a' }}>{formatCurrency(v.receita)}</td>
                            <td className="text-right">{formatCurrency(v.comissao)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportData.despesasOperacionais.lista.length > 0 && (
                  <div className="section" style={{ pageBreakInside: 'avoid' }}>
                    <div className="section-title">Despesas Operacionais ({formatCurrency(reportData.despesasOperacionais.total)})</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Categoria</th>
                          <th>Descrição</th>
                          <th className="text-center">Status</th>
                          <th className="text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.despesasOperacionais.lista.slice(0, 20).map((d: any, idx) => (
                          <tr key={idx}>
                            <td>{format(new Date(d.createdAt), "dd/MM/yy")}</td>
                            <td>{d.categoria}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.descricao}</td>
                            <td className="text-center">
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                fontSize: '10px',
                                background: d.pago === 'true' ? '#dcfce7' : '#fef3c7',
                                color: d.pago === 'true' ? '#15803d' : '#a16207'
                              }}>
                                {d.pago === 'true' ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                            <td className="text-right" style={{ color: '#dc2626' }}>{formatCurrency(Number(d.valor))}</td>
                          </tr>
                        ))}
                        {reportData.despesasOperacionais.lista.length > 20 && (
                          <tr>
                            <td colSpan={5} className="text-center" style={{ fontStyle: 'italic', color: '#888' }}>
                              ... e mais {reportData.despesasOperacionais.lista.length - 20} despesas
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="footer">
                  <p>Relatório gerado automaticamente pelo sistema VeloStock</p>
                  <p>{reportData.empresa.nome} - {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Selecione o período para visualizar o relatório
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
