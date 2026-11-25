import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import { MigrationProject } from '../types/project';
import { deleteProject } from '../services/api';
import {
  Trash2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  BookOpen,
  LayoutGrid,
  FileSpreadsheet,
  GitBranch,
  Calculator,
  FileCode2,
  BarChart3,
  FileText,
  Code2,
  Info,
  Filter,
  Sliders,
  Link2,
  Table2,
  ShieldCheck,
} from 'lucide-react';

const DETAIL_OPTIONS = [
  'TDE strategy',
  'Dashboard inventory',
  'Worksheet and visual inventory',
  'Data source inventory',
  'Calculated logic inventory',
  'File inventory',
  'All summary metrics'
];

function pick(summary: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) if (summary[k] !== undefined) return summary[k];
  return 0;
}

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function cleanJson(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
}

export default function Summary({ project, onDeleted }: { project: MigrationProject; onDeleted?: () => void }) {
  const [detail, setDetail] = useState(DETAIL_OPTIONS[0]);
  const [deleting, setDeleting] = useState(false);
  const tone = project.health_status === 'Ready' ? 'good' : project.health_status === 'Blocked' ? 'bad' : 'warn';
  const summary = project.summary || {};

  async function handleDelete() {
    if (window.confirm(`Permanently delete project "${project.project_name}" and all its workspace data from the server?`)) {
      setDeleting(true);
      try {
        await deleteProject(project.project_id);
        onDeleted?.();
      } catch (err) {
        alert("Failed to delete project: " + (err as Error).message);
      } finally {
        setDeleting(false);
      }
    }
  }

  const workbookName = String(pick(summary, 'workbook_name', 'Workbook name') || project.project_name);
  const dashboardsCount = pick(summary, 'dashboards', 'Dashboards');
  const worksheetsCount = pick(summary, 'worksheets', 'Worksheets');
  const storiesCount = pick(summary, 'stories', 'Stories');
  const visualsCount = project.visual_plan?.length || 0;
  const dataSourcesCount = pick(summary, 'data_sources', 'Data sources');
  const sourceMappingsCount = project.source_mappings?.length || 0;
  const relationshipsCount = pick(summary, 'relationships', 'Relationships');
  const joinsCount = pick(summary, 'joins', 'Joins');
  const calcFieldsCount = project.calculations?.length || 0;
  const parametersCount = pick(summary, 'parameters', 'Parameters');
  const filtersCount = pick(summary, 'filters', 'Filters');
  const unsupportedCount = pick(summary, 'unsupported_objects', 'Unsupported objects');
  const extractFilesCount = pick(summary, 'extract_files', 'Extract files');
  const tdeItemsCount = project.tde_analysis?.length || 0;

  const tdeScenario = String(pick(summary, 'tde_strategy_scenario', 'TDE strategy scenario') || (project.tde_analysis?.[0] as any)?.scenario_classification || 'No legacy TDE detected');
  const tdeRule = String(pick(summary, 'tde_source_of_truth_rule', 'TDE source-of-truth rule') || (project.tde_analysis?.length ? 'TDE is validation/fallback only' : 'N/A'));

  const kpis = [
    { label: 'Workbook', value: workbookName, icon: <BookOpen size={18} />, color: 'purple' },
    { label: 'Dashboards', value: dashboardsCount, icon: <LayoutGrid size={18} />, color: 'blue' },
    { label: 'Worksheets', value: worksheetsCount, icon: <FileSpreadsheet size={18} />, color: 'purple' },
    { label: 'Data Sources', value: dataSourcesCount, icon: <Database size={18} />, color: 'cyan' },
    { label: 'Source Mappings', value: sourceMappingsCount, icon: <GitBranch size={18} />, color: 'purple' },
    { label: 'Calculated Fields', value: calcFieldsCount, icon: <Calculator size={18} />, color: 'blue' },
    { label: 'TDE / Extract Files', value: extractFilesCount, icon: <FileCode2 size={18} />, color: 'purple' },
  ];

  const visualRows = project.visual_plan.map((v: any) => ({
    worksheet: v.worksheet,
    tableau_marks_type: v.tableau_marks_type,
    recommended_powerbi_visual: v.recommended_powerbi_visual,
    fields_used: cleanJson(v.fields_used || []),
    manual_review_notes: cleanJson(v.manual_review_notes || [])
  }));

  const worksheetRows = project.worksheets.map((w: any) => ({
    worksheet: w.name,
    marks_type: w.marks_type,
    rows_shelf: cleanJson(w.rows || []),
    columns_shelf: cleanJson(w.columns || []),
    filters: cleanJson(w.filters || []),
    encodings: cleanJson(w.encodings || {}),
    fields_used: cleanJson(w.fields_used || [])
  }));

  const calcRows = project.calculations.map(c => ({
    name: c.name,
    datasource: c.datasource,
    classification: c.classification,
    target: c.target_object_type,
    confidence: c.confidence_score,
    formula: c.formula,
    generated_expression: c.generated_expression,
    dependencies: cleanJson(c.dependencies),
    used_in: cleanJson(c.used_in),
    warnings: cleanJson(c.warnings),
    manual_review_notes: cleanJson(c.manual_review_notes)
  }));

  const datasourceRows = project.datasources.map((ds: any) => ({
    name: ds.name,
    source_kind: ds.source_kind,
    extract_or_live: ds.extract_or_live,
    connections: ds.connections?.length || 0,
    fields: ds.fields?.length || 0,
    relations: ds.relations?.length || 0,
    filters: ds.filters?.length || 0,
    aliases: ds.aliases?.length || 0
  }));

  const tdeRows = (project.tde_analysis || []).map((r: any) => ({
    tde_file: r.tde_file,
    tde_role: r.tde_role,
    is_source_of_truth: r.is_source_of_truth,
    scenario: r.scenario,
    scenario_classification: r.scenario_classification,
    decision: r.decision,
    preferred_architecture: r.preferred_architecture,
    temporary_fallback: r.temporary_fallback,
    validation_pattern: r.validation_pattern
  }));

  const healthColumns = useMemo(() => [
    { key: 'dashboards', label: 'Dashboards', icon: <LayoutGrid size={14} /> },
    { key: 'worksheets', label: 'Worksheets', icon: <FileSpreadsheet size={14} /> },
    { key: 'stories', label: 'Stories', icon: <BookOpen size={14} /> },
    { key: 'visuals', label: 'Visuals', icon: <BarChart3 size={14} /> },
    { key: 'data_sources', label: 'Data Sources', icon: <Database size={14} /> },
    { key: 'source_mappings', label: 'Source Mappings', icon: <GitBranch size={14} /> },
    { key: 'relationships', label: 'Relationships', icon: <Link2 size={14} /> },
    { key: 'joins', label: 'Joins', icon: <Table2 size={14} /> },
    { key: 'calculated_fields', label: 'Calculated Fields', icon: <Calculator size={14} /> },
    { key: 'parameters', label: 'Parameters', icon: <Sliders size={14} /> },
    { key: 'filters', label: 'Filters', icon: <Filter size={14} /> },
    { key: 'unsupported', label: 'Unsupported', icon: <AlertTriangle size={14} /> },
    { key: 'scenario', label: 'Scenario', icon: <Info size={14} /> },
    { key: 'rule', label: 'Rule', icon: <ShieldCheck size={14} /> },
    { key: 'tde_items', label: 'TDE Items', icon: <FileCode2 size={14} /> },
    { key: 'export_mode', label: 'Export Mode', icon: <ShieldCheck size={14} /> },
  ], []);

  const healthRows = useMemo(() => [
    {
      area: 'Report structure',
      icon: <LayoutGrid size={15} />,
      color: 'blue',
      values: { dashboards: dashboardsCount, worksheets: worksheetsCount, stories: storiesCount, visuals: visualsCount },
    },
    {
      area: 'Data model',
      icon: <Layers size={15} />,
      color: 'purple',
      values: { data_sources: dataSourcesCount, source_mappings: sourceMappingsCount, relationships: relationshipsCount, joins: joinsCount },
    },
    {
      area: 'Logic',
      icon: <Code2 size={15} />,
      color: 'indigo',
      values: { calculated_fields: calcFieldsCount, parameters: parametersCount, filters: filtersCount, unsupported: unsupportedCount },
    },
    {
      area: 'TDE strategy',
      icon: <Database size={15} />,
      color: 'purple',
      values: { scenario: tdeScenario, rule: tdeRule, tde_items: tdeItemsCount, export_mode: 'Safe Openable Mode' },
    },
  ], [
    dashboardsCount, worksheetsCount, storiesCount, visualsCount,
    dataSourcesCount, sourceMappingsCount, relationshipsCount, joinsCount,
    calcFieldsCount, parametersCount, filtersCount, unsupportedCount,
    tdeScenario, tdeRule, tdeItemsCount
  ]);

  function renderHealthIcon() {
    if (tone === 'good') return <CheckCircle2 size={16} />;
    if (tone === 'bad') return <XCircle size={16} />;
    return <AlertTriangle size={16} />;
  }

  function detailBody() {
    switch (detail) {
      case 'TDE strategy':
        return (
          <>
            <div className="s360RuleCallout">
              <div className="s360RuleIconCircle">
                <Info size={16} />
              </div>
              <div>
                <b>TDE rule:</b> The application ignores <code>.tde</code> as a production Power BI source when Tableau metadata or original source details are available. It uses the <code>.tde</code> as validation baseline or temporary fallback only. Use the dedicated <b>TDE Source Recovery</b> page to set original source details and validate source columns.
              </div>
            </div>
            <DataTable rows={tdeRows as Record<string, unknown>[]} empty="No legacy .tde extracts detected" />
          </>
        );
      case 'Dashboard inventory':
        return <DataTable rows={project.dashboards as Record<string, unknown>[]} empty="No dashboards detected" />;
      case 'Worksheet and visual inventory':
        return (
          <div className="stackedTables">
            <h3>Worksheet shelves and encodings</h3>
            <DataTable rows={worksheetRows as Record<string, unknown>[]} empty="No worksheets detected" />
            <h3>Power BI visual recommendations</h3>
            <DataTable rows={visualRows as Record<string, unknown>[]} empty="No visual plan detected" />
          </div>
        );
      case 'Data source inventory':
        return <DataTable rows={datasourceRows as Record<string, unknown>[]} empty="No data sources detected" />;
      case 'Calculated logic inventory':
        return <DataTable rows={calcRows as Record<string, unknown>[]} empty="No calculations detected" />;
      case 'File inventory':
        return (
          <DataTable
            rows={project.inventory.map(i => ({
              folder_path: i.folder_path,
              file_name: i.file_name,
              extension: i.extension,
              role: i.role,
              status: i.parsed_status,
              size_bytes: i.size_bytes,
              warnings: cleanJson(i.warnings),
              errors: cleanJson(i.errors)
            })) as Record<string, unknown>[]}
            empty="No files inventoried"
          />
        );
      default:
        return <DataTable rows={Object.entries(summary).map(([metric, value]) => ({ metric: formatLabel(metric), value }))} empty="No summary metrics" />;
    }
  }

  return (
    <div className="page summaryPage">
      {/* 1. TOP SUMMARY HERO CARD */}
      <div className="s360Shell">
        <div className="s360TopHeader">
          <div className="s360TitleGroup">
            <div className="s360TitleIcon">
              <Layers size={21} />
            </div>
            <h2>Tableau 360 Summary</h2>
          </div>

          <div className="s360HeaderActions">
            <button
              type="button"
              className="s360DeleteBtn"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={14} />
              <span>{deleting ? 'Deleting...' : 'Delete Project'}</span>
            </button>
            <span className={`s360HealthPill ${tone}`}>
              {renderHealthIcon()}
              <span>{project.health_status}</span>
            </span>
          </div>
        </div>

        <div className="s360SnapshotRow">
          <div className="s360SnapshotLeft">
            <div className="s360SnapshotIcon">
              <Database size={22} />
            </div>
            <div className="s360SnapshotText">
              <span className="s360Eyebrow">EXECUTIVE MIGRATION SNAPSHOT</span>
              <h1>{workbookName}</h1>
              <p>
                The 360 view is intentionally compact. Use the dropdown below to inspect dashboards, worksheets, data sources, calculations, visual plans, TDE strategy, and full file inventory without scrolling through one long page.
              </p>
            </div>
          </div>

          <div className={`s360StatusCard ${tone}`}>
            <div className="s360StatusCardTop">
              <span className={`s360StatusIcon ${tone}`}>{renderHealthIcon()}</span>
              <b>{project.health_status}</b>
            </div>
            <span className="s360StatusLine">{tdeScenario}</span>
            <span className="s360StatusLine">{tdeRule}</span>
          </div>
        </div>

        <div className="s360KpiStrip">
          {kpis.map(k => (
            <div className={`s360KpiItem ${k.color}`} key={k.label}>
              <div className={`s360KpiIcon ${k.color}`}>{k.icon}</div>
              <div className="s360KpiText">
                <span>{k.label}</span>
                <b title={String(k.value)}>{String(k.value)}</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. COMPACT MIGRATION HEALTH BY AREA */}
      <div className="s360Shell">
        <div className="s360SectionHeader">
          <div className="s360TitleGroup">
            <div className="s360TitleIcon">
              <BarChart3 size={20} />
            </div>
            <h2>Compact Migration Health by Area</h2>
          </div>
        </div>

        <div className="s360TableWrap">
          <table className="s360HealthTable">
            <thead>
              <tr>
                <th className="s360AreaCol">Area</th>
                {healthColumns.map(col => (
                  <th key={col.key}>
                    <div className="s360ThInner">
                      {col.icon}
                      <span>{col.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {healthRows.map(row => (
                <tr key={row.area}>
                  <td className="s360AreaCell">
                    <span className={`s360AreaBadge ${row.color}`}>{row.icon}</span>
                    <b>{row.area}</b>
                  </td>
                  {healthColumns.map(col => {
                    const val = (row.values as Record<string, unknown>)[col.key];
                    if (val === undefined) {
                      return <td key={col.key} className="s360DashCell">-</td>;
                    }
                    if (col.key === 'scenario') {
                      return (
                        <td key={col.key}>
                          <span className="s360CellPill amber">{String(val)}</span>
                        </td>
                      );
                    }
                    if (col.key === 'rule') {
                      return (
                        <td key={col.key}>
                          <span className="s360CellPill slate">{String(val)}</span>
                        </td>
                      );
                    }
                    if (col.key === 'export_mode') {
                      return (
                        <td key={col.key}>
                          <span className="s360CellPill green">{String(val)}</span>
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="s360NumCell">
                        {String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. REVIEW DETAILS */}
      <div className="s360Shell">
        <div className="s360SectionHeader">
          <div className="s360TitleGroup">
            <div className="s360TitleIcon">
              <FileText size={20} />
            </div>
            <h2>Review Details</h2>
          </div>

          <select className="detailSelect s360DetailSelect" value={detail} onChange={e => setDetail(e.target.value)}>
            {DETAIL_OPTIONS.map(x => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>

        <div className="summaryDetailPanel">{detailBody()}</div>
      </div>
    </div>
  );
}
