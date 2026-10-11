import type { PerformanceReport } from '@/types';
import { formatDate } from './date';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate and download an RFC 4180 compliant CSV export
 */
export function exportReportToCSV(report: PerformanceReport, branchName = 'Bank of Abyssinia Branch') {
  const lines: string[] = [];

  // Metadata block
  lines.push(`BANK OF ABYSSINIA - BRANCH STAFF PERFORMANCE REPORT`);
  lines.push(`Branch,${escapeCsvCell(branchName)}`);
  lines.push(`Evaluation Period,${escapeCsvCell(report.period.toUpperCase())}`);
  lines.push(`Date Range,${escapeCsvCell(`${formatDate(report.from)} to ${formatDate(report.to)}`)}`);
  lines.push(`Generated At,${escapeCsvCell(new Date(report.generatedAt).toLocaleString())}`);
  lines.push(`Calculation Basis,${escapeCsvCell(report.calculationBasis)}`);
  lines.push('');

  // Executive summary
  const validStaff = report.byStaff.filter((s) => s.overallPercent !== null);
  const avgScore = validStaff.length > 0
    ? (validStaff.reduce((sum, s) => sum + (s.overallPercent ?? 0), 0) / validStaff.length).toFixed(1)
    : '0';
  const onTargetCount = report.byStaff.filter((s) => s.status === 'on_target').length;
  const needsAttentionCount = report.byStaff.filter((s) => s.status === 'needs_attention').length;
  const belowTargetCount = report.byStaff.filter((s) => s.status === 'below_target').length;

  lines.push(`EXECUTIVE SUMMARY`);
  lines.push(`Total Staff Evaluated,${report.byStaff.length}`);
  lines.push(`Average Branch Performance Score,${avgScore}%`);
  lines.push(`On Target Attainment Rate,${report.byStaff.length > 0 ? ((onTargetCount / report.byStaff.length) * 100).toFixed(1) : 0}%`);
  lines.push(`On Target Count,${onTargetCount}`);
  lines.push(`Needs Attention Count,${needsAttentionCount}`);
  lines.push(`Below Target Count,${belowTargetCount}`);
  lines.push(`Total Key Performance Indicators,${report.byKpi.length}`);
  lines.push('');

  // Section 1: Staff breakdown
  lines.push(`STAFF PERFORMANCE BREAKDOWN`);
  lines.push([
    'Employee ID',
    'Full Name',
    'Position',
    'Overall Score %',
    'Performance Band',
    'Entries Submitted',
    'Entries Expected',
    'Submission Compliance %',
  ].map(escapeCsvCell).join(','));

  for (const s of report.byStaff) {
    const compliance = s.entriesExpected > 0 ? Math.round((s.entriesSubmitted / s.entriesExpected) * 100) : 100;
    const band = s.status === 'on_target' ? 'On Target' : s.status === 'needs_attention' ? 'Needs Attention' : 'Below Target';
    lines.push([
      s.employeeId,
      s.fullName,
      s.position,
      s.overallPercent !== null ? `${s.overallPercent}%` : 'N/A',
      band,
      s.entriesSubmitted,
      s.entriesExpected,
      `${compliance}%`,
    ].map(escapeCsvCell).join(','));
  }
  lines.push('');

  // Section 2: KPI breakdown
  lines.push(`KEY PERFORMANCE INDICATORS (KPI) SUMMARY`);
  lines.push([
    'Indicator Name',
    'Unit',
    'Measurement Type',
    'Assigned Staff',
    'Total Recorded Entries',
    'Average Achievement %',
    'Status Band',
  ].map(escapeCsvCell).join(','));

  for (const k of report.byKpi) {
    const band = k.status === 'on_target' ? 'On Target' : k.status === 'needs_attention' ? 'Needs Attention' : 'Below Target';
    lines.push([
      k.kpiName,
      k.unit,
      k.valueType,
      k.assignedStaff,
      k.entries,
      k.averagePercent !== null ? `${k.averagePercent}%` : 'N/A',
      band,
    ].map(escapeCsvCell).join(','));
  }

  // Prepend UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const filename = `BOA_Performance_Report_${report.period}_${report.from}_${report.to}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Generate and download a formatted Microsoft Excel Workbook (XML Spreadsheet 2003)
 * Opens cleanly in Microsoft Excel, Apple Numbers, LibreOffice with structured sheets and styling.
 */
export function exportReportToExcel(report: PerformanceReport, branchName = 'Bank of Abyssinia Branch') {
  const validStaff = report.byStaff.filter((s) => s.overallPercent !== null);
  const avgScore = validStaff.length > 0
    ? (validStaff.reduce((sum, s) => sum + (s.overallPercent ?? 0), 0) / validStaff.length).toFixed(1)
    : '0';
  const onTargetCount = report.byStaff.filter((s) => s.status === 'on_target').length;
  const needsAttentionCount = report.byStaff.filter((s) => s.status === 'needs_attention').length;
  const belowTargetCount = report.byStaff.filter((s) => s.status === 'below_target').length;

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Segoe UI" ss:Size="16" ss:Bold="1" ss:Color="#0E0E10"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#4B5563"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0E0E10" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Font ss:FontName="Segoe UI" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="Number">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Percent">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Bold="1"/>
  </Style>
  <Style ss:ID="OnTarget">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#065F46"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NeedsAttention">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#92400E"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BelowTarget">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <!-- Sheet 1: Staff Performance -->
 <Worksheet ss:Name="Staff Performance">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="100"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>

   <Row ss:Height="28">
    <Cell ss:MergeAcross="7" ss:StyleID="Title">
     <Data ss:Type="String">Bank of Abyssinia - Staff Performance Directory</Data>
    </Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="7" ss:StyleID="Subtitle">
     <Data ss:Type="String">Branch: ${branchName} | Period: ${report.period.toUpperCase()} (${formatDate(report.from)} - ${formatDate(report.to)})</Data>
    </Cell>
   </Row>
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <!-- Header -->
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Full Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Position</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Score %</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status Band</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Submitted</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Expected</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Compliance %</Data></Cell>
   </Row>

   ${report.byStaff.map((s) => {
     const compliance = s.entriesExpected > 0 ? Math.round((s.entriesSubmitted / s.entriesExpected) * 100) : 100;
     const statusStyle = s.status === 'on_target' ? 'OnTarget' : s.status === 'needs_attention' ? 'NeedsAttention' : 'BelowTarget';
     const statusLabel = s.status === 'on_target' ? 'On Target' : s.status === 'needs_attention' ? 'Needs Attention' : 'Below Target';
     return `
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">${s.employeeId}</Data></Cell>
    <Cell><Data ss:Type="String">${s.fullName}</Data></Cell>
    <Cell><Data ss:Type="String">${s.position}</Data></Cell>
    <Cell ss:StyleID="Percent"><Data ss:Type="String">${s.overallPercent !== null ? `${s.overallPercent}%` : 'N/A'}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${statusLabel}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${s.entriesSubmitted}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${s.entriesExpected}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="String">${compliance}%</Data></Cell>
   </Row>`;
   }).join('')}
  </Table>
 </Worksheet>

 <!-- Sheet 2: KPI Breakdown -->
 <Worksheet ss:Name="KPI Performance">
  <Table ss:DefaultColumnWidth="130">
   <Column ss:Width="200"/>
   <Column ss:Width="80"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>

   <Row ss:Height="28">
    <Cell ss:MergeAcross="6" ss:StyleID="Title">
     <Data ss:Type="String">Key Performance Indicators Breakdown</Data>
    </Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="6" ss:StyleID="Subtitle">
     <Data ss:Type="String">Branch: ${branchName} | Coverage: ${formatDate(report.from)} - ${formatDate(report.to)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Indicator Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Value Type</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Assigned Staff</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Recorded Entries</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Average Score %</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
   </Row>

   ${report.byKpi.map((k) => {
     const statusStyle = k.status === 'on_target' ? 'OnTarget' : k.status === 'needs_attention' ? 'NeedsAttention' : 'BelowTarget';
     const statusLabel = k.status === 'on_target' ? 'On Target' : k.status === 'needs_attention' ? 'Needs Attention' : 'Below Target';
     return `
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">${k.kpiName}</Data></Cell>
    <Cell><Data ss:Type="String">${k.unit}</Data></Cell>
    <Cell><Data ss:Type="String">${k.valueType}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${k.assignedStaff}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${k.entries}</Data></Cell>
    <Cell ss:StyleID="Percent"><Data ss:Type="String">${k.averagePercent !== null ? `${k.averagePercent}%` : 'N/A'}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${statusLabel}</Data></Cell>
   </Row>`;
   }).join('')}
  </Table>
 </Worksheet>

 <!-- Sheet 3: Executive Summary -->
 <Worksheet ss:Name="Executive Summary">
  <Table ss:DefaultColumnWidth="180">
   <Column ss:Width="220"/>
   <Column ss:Width="200"/>

   <Row ss:Height="28">
    <Cell ss:MergeAcross="1" ss:StyleID="Title">
     <Data ss:Type="String">Executive Branch Performance Summary</Data>
    </Cell>
   </Row>
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Branch Name:</Data></Cell><Cell ss:StyleID="MetaValue"><Data ss:Type="String">${branchName}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Evaluation Cycle:</Data></Cell><Cell ss:StyleID="MetaValue"><Data ss:Type="String">${report.period.toUpperCase()}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Period Coverage:</Data></Cell><Cell ss:StyleID="MetaValue"><Data ss:Type="String">${formatDate(report.from)} - ${formatDate(report.to)}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Generated At:</Data></Cell><Cell ss:StyleID="MetaValue"><Data ss:Type="String">${new Date(report.generatedAt).toLocaleString()}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Calculation Status:</Data></Cell><Cell ss:StyleID="MetaValue"><Data ss:Type="String">${report.calculationBasis}</Data></Cell></Row>
   <Row ss:Height="12"><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Total Staff Roster:</Data></Cell><Cell ss:StyleID="Number"><Data ss:Type="Number">${report.byStaff.length}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Branch Average Score:</Data></Cell><Cell ss:StyleID="Percent"><Data ss:Type="String">${avgScore}%</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">On Target Attainment:</Data></Cell><Cell ss:StyleID="Percent"><Data ss:Type="String">${report.byStaff.length > 0 ? ((onTargetCount / report.byStaff.length) * 100).toFixed(1) : 0}%</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Staff On Target:</Data></Cell><Cell ss:StyleID="Number"><Data ss:Type="Number">${onTargetCount}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Staff Needs Attention:</Data></Cell><Cell ss:StyleID="Number"><Data ss:Type="Number">${needsAttentionCount}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Staff Below Target:</Data></Cell><Cell ss:StyleID="Number"><Data ss:Type="Number">${belowTargetCount}</Data></Cell></Row>
   <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Active Indicators Tracked:</Data></Cell><Cell ss:StyleID="Number"><Data ss:Type="Number">${report.byKpi.length}</Data></Cell></Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const filename = `BOA_Performance_Report_${report.period}_${report.from}_${report.to}.xls`;
  downloadFile(xml, filename, 'application/vnd.ms-excel;charset=utf-8');
}
