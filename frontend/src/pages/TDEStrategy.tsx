import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plug,
  Folder,
  FolderOpen,
  Crosshair,
  Server,
  Database,
  Layers,
  Table2,
  Code2,
  Info,
  ListFilter,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge, Card, Metric } from '../components/Cards';
import DataTable from '../components/DataTable';
import { MigrationProject, SourceMapping } from '../types/project';
import { saveSourceMappings } from '../services/api';

const connectors = ['CSV','Text','Excel','Folder','JSON','XML','Parquet','SQL Server','Oracle','PostgreSQL','MySQL','Snowflake','Databricks','BigQuery','Azure SQL','OData','Web API','SharePoint Folder','OneLake/Fabric Lakehouse','Manual source placeholder'];
const sections = ['Set original source details', 'Validate recovered source columns', 'TDE scenario and decisions', 'Recovered build logic', 'Extract filter classification', 'Manual review and checkpoints'];

function firstArray(project: MigrationProject, path: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  (project.tde_analysis || []).forEach((row: any) => {
    const val = path.split('.').reduce((acc, key) => acc?.[key], row);
    if (Array.isArray(val)) result.push(...val);
  });
  return result;
}

function isTdeOrExtract(m: SourceMapping) {
  return `${m.original_connection_type} ${m.detected_source_path} ${m.target_file_path} ${m.datasource} ${m.mapping_status}`.toLowerCase().includes('.tde') || `${m.original_connection_type} ${m.detected_source_path} ${m.target_file_path} ${m.datasource} ${m.mapping_status}`.toLowerCase().includes('.hyper') || `${m.mapping_status}`.toLowerCase().includes('legacy tde');
}

function sourceColumnValidationRows(project: MigrationProject) {
  return (project.tde_analysis || []).flatMap((r: any) => (r.source_column_validation || []).map((v: any) => ({ tde_file: r.tde_file, ...v })));
}

function asRows(project: MigrationProject, name: string, sourceRows: Record<string, unknown>[], filterRows: Record<string, unknown>[], tdeRows: Record<string, unknown>[], tdeMappings: SourceMapping[], validationRows: Record<string, unknown>[]) {
  switch (name) {
    case 'Validate recovered source columns':
      return <>
        <div className="note">This validates columns pulled from recovered/original source details against Tableau metadata and calculated-field dependencies. If preview is unavailable, set file/server/table details and save.</div>
        <DataTable rows={validationRows} empty="No column validation rows yet. Save source details or upload readable source files."/>
      </>;
    case 'TDE scenario and decisions':
      return <div className="stackedTables">
        <h3>Detected TDE files</h3><DataTable rows={tdeRows} empty="No .tde files found"/>
        <h3>Scenario classification</h3><DataTable rows={(project.tde_analysis || []).map((r: any) => ({ tde_file: r.tde_file, scenario: r.scenario, priority: r.priority, decision: r.decision, recommended_usage: r.recommended_usage, preferred_architecture: r.preferred_architecture })) as Record<string, unknown>[]} empty="No TDE strategy available"/>
        <h3>TDE/extract mappings kept out of production</h3><DataTable rows={tdeMappings.map(m => ({ source: m.datasource, detected_path: m.detected_source_path, target_path: m.target_file_path, status: m.mapping_status, production_decision: 'Ignore as production source; validation/fallback only' })) as Record<string, unknown>[]} empty="No TDE/extract mappings"/>
      </div>;
    case 'Recovered build logic':
      return <div className="stackedTables">
        <h3>Recovered original/upstream sources</h3><DataTable rows={sourceRows} empty="No original source was recovered yet"/>
        <h3>Recovered TDE build logic</h3><DataTable rows={(project.tde_analysis || []).map((r: any) => ({ tde_file: r.tde_file, recovered_logic: r.recovered_logic, recovered_logic_detail: r.recovered_logic_detail })) as Record<string, unknown>[]} empty="No TDE build logic recovered"/>
      </div>;
    case 'Extract filter classification':
      return <DataTable rows={filterRows} empty="No TDE/extract filters detected"/>;
    case 'Manual review and checkpoints':
      return <DataTable rows={(project.tde_analysis || []).flatMap((r: any) => [
        ...(r.manual_review_required || []).map((x: string) => ({ tde_file: r.tde_file, item: x, category: 'manual review' })),
        ...(r.validation_checkpoints || []).map((x: string) => ({ tde_file: r.tde_file, item: x, category: 'validation checkpoint' })),
        ...(r.omit_rules || []).map((x: string) => ({ tde_file: r.tde_file, item: x, category: 'must not do' })),
      ]) as Record<string, unknown>[]} empty="No TDE manual review items"/>;
    default:
      return null;
  }
}

export default function TDEStrategy({
  project,
  setProject,
  onSavingChange,
  onSaved,
}: {
  project: MigrationProject;
  setProject: (p: MigrationProject) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaved?: () => void;
}) {
  const [mappings, setMappings] = useState<SourceMapping[]>(project.source_mappings || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [section, setSection] = useState(sections[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectorFilter, setConnectorFilter] = useState('All Tables');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [bulkFolderPath, setBulkFolderPath] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [browseSecurityNote, setBrowseSecurityNote] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 8;

  useEffect(() => setMappings(project.source_mappings || []), [project.project_id, project.source_mappings]);

  const detected = (project.tde_analysis || []).length;
  const filterRows = (project.tde_analysis || []).flatMap((r: any) => (r.extract_filter_classification || []).map((f: any) => ({ tde_file: r.tde_file, ...f })));
  const sourceRows = (project.tde_analysis || []).flatMap((r: any) => (r.recovered_sources || []).map((s: any) => ({ tde_file: r.tde_file, ...s })));
  const tdeRows = firstArray(project, 'tde_files');
  const validationRows = sourceColumnValidationRows(project) as Record<string, unknown>[];
  const tdeMappings = mappings.filter(isTdeOrExtract);
  const originalMappings = mappings.filter(m => !isTdeOrExtract(m));
  const editableSources = useMemo(() => originalMappings, [mappings]);

  const availableConnectors = useMemo(() => {
    const set = new Set<string>();
    editableSources.forEach(m => { if (m.target_connector) set.add(m.target_connector); });
    return ['All Tables', ...Array.from(set)];
  }, [editableSources]);

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return editableSources.filter(m => {
      if (connectorFilter !== 'All Tables' && m.target_connector !== connectorFilter) return false;
      if (!q) return true;
      const title = `${m.datasource} ${m.table_name || ''} ${m.target_file_path || ''} ${m.detected_source_path || ''}`.toLowerCase();
      return title.includes(q);
    });
  }, [editableSources, searchQuery, connectorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSources.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedSources = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSources.slice(start, start + PAGE_SIZE);
  }, [filteredSources, safePage]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, connectorFilter, project.project_id]);

  useEffect(() => {
    if (!filteredSources.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredSources.some(m => m.source_id === selectedId)) {
      setSelectedId(filteredSources[0].source_id);
    }
  }, [filteredSources, selectedId]);

  const selectedSource = useMemo(
    () => filteredSources.find(m => m.source_id === selectedId) || filteredSources[0] || null,
    [filteredSources, selectedId]
  );

  function getDisplayTitle(m: SourceMapping) {
    return `${m.datasource}${m.table_name ? ` – ${m.table_name}` : (m.detected_source_path ? ` – ${m.detected_source_path.split(/[\\/]/).pop()}` : '')}`;
  }

  function hasQuotesInPath(value?: string) {
    return /["']/.test(value || '');
  }

  const hasAnyQuotedPath = mappings.some(m => hasQuotesInPath(m.target_file_path));

  function applyBulkFolderPath(overrideFolder?: string, fileMap?: Map<string, string>) {
    const raw = (overrideFolder ?? bulkFolderPath).trim();
    if (!raw && !fileMap?.size) return;
    if (hasQuotesInPath(raw)) {
      setError('Quotes (" or \') are not allowed in Bulk Folder Path.');
      return;
    }
    const cleanBase = raw.replace(/[\\/]+$/, '');
    const sep = cleanBase.includes('\\') && !cleanBase.includes('/') ? '\\' : '/';
    let updatedCount = 0;

    setMappings(prev =>
      prev.map(m => {
        const currentPath = m.target_file_path || m.detected_source_path || '';
        const isFileSource =
          Boolean(currentPath) ||
          ['CSV', 'Text', 'Excel', 'Folder', 'JSON', 'XML', 'Parquet'].includes(m.target_connector);
        if (!isFileSource) return m;

        const fileName =
          currentPath.split(/[\\/]/).pop() ||
          `${m.table_name || m.datasource || 'source'}.${m.target_connector.toLowerCase() === 'excel' ? 'xlsx' : 'csv'}`;

        const matchedRel = fileMap?.get(fileName.toLowerCase());
        const nextPath = cleanBase
          ? `${cleanBase}${sep}${fileName}`
          : matchedRel || currentPath;

        if (nextPath && nextPath !== m.target_file_path) {
          updatedCount += 1;
          return { ...m, target_file_path: nextPath };
        }
        return m;
      })
    );
    setError(undefined);
    setBulkStatus(
      updatedCount > 0
        ? `Updated ${updatedCount} table path${updatedCount > 1 ? 's' : ''}`
        : 'All matching table paths already up to date'
    );
    setTimeout(() => setBulkStatus(null), 3500);
  }

  function handleBrowseFolder(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const fileMap = new Map<string, string>();
    let detectedFolder = '';

    for (const f of files) {
      fileMap.set(f.name.toLowerCase(), (f as any).webkitRelativePath || f.name);
      if (!detectedFolder && (f as any).webkitRelativePath) {
        const parts = String((f as any).webkitRelativePath).split('/');
        if (parts.length > 1) {
          detectedFolder = parts.slice(0, -1).join('/');
        }
      }
    }

    const nextFolder = detectedFolder || bulkFolderPath;
    if (detectedFolder) {
      setBulkFolderPath(detectedFolder);
    }
    setBrowseSecurityNote(
      `Your full local directory path is kept private by your browser for security reasons, so only "${detectedFolder || 'the selected folder'}" is shown. The generated PBIP package will still work, or you can paste your full local path from File Explorer (without quotes) and click Apply to All Tables.`
    );
    applyBulkFolderPath(nextFolder, fileMap);
    if (folderInputRef.current) folderInputRef.current.value = '';
  }

  function update(sourceId: string, key: keyof SourceMapping, value: string) {
    setMappings(mappings.map(m => m.source_id === sourceId ? { ...m, [key]: value } : m));
  }
  function removeSource(sourceId: string) {
    setMappings(mappings.filter(m => m.source_id !== sourceId));
  }
  async function save() {
    if (hasAnyQuotedPath) {
      setError('Quotes (" or \') are not allowed in Power BI Readable File Path. Please remove quotes before saving.');
      return;
    }
    setBusy(true);
    onSavingChange?.(true);
    setError(undefined);
    try {
      const updated = await saveSourceMappings(project.project_id, mappings);
      setProject(updated);
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onSavingChange?.(false);
    }
  }

  return <div className="page tdePage">
    <Card title="TDE Source Recovery & Validation" right={<Badge tone={detected ? 'warn' : 'good'}>{detected ? `${detected} TDE strategy item(s)` : 'No TDE detected'}</Badge>}>
      <div className="tdeHeroGrid">
        <div className="tdeRuleBox"><b>Production rule:</b> if a Tableau .tde is used, the application should understand how the TDE was built, recover the upstream source logic, ignore the .tde as the Power BI production source, and use the original sources for the rebuild. The .tde stays as validation baseline or temporary static fallback only.</div>
        <div className="metricsGrid compactMetrics">
          <Metric label="TDE files" value={tdeRows.length}/>
          <Metric label="Recovered sources" value={sourceRows.length}/>
          <Metric label="Editable original sources" value={editableSources.length}/>
          <Metric label="Column validations" value={validationRows.length}/>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
    </Card>

    <Card title="TDE Workbench Section" right={<select className="detailSelect" value={section} onChange={e => setSection(e.target.value)}>{sections.map(s => <option key={s}>{s}</option>)}</select>}>
      {section !== 'Set original source details' && <div className="summaryDetailPanel">{asRows(project, section, sourceRows as Record<string, unknown>[], filterRows as Record<string, unknown>[], tdeRows, tdeMappings, validationRows)}</div>}
      {section === 'Set original source details' && <div>
        <div className="note">Enter or correct the actual source system details that created the TDE. You can also remove unused or unnecessary tables before saving. After saving, the backend regenerates previews, datatype profiles, M queries, semantic model metadata, TDE column validation, and validation issues.</div>
        <div className="actions tdeActions tdeTopActionBar">
          <button className="primary" data-tour="tde-save-btn" onClick={save} disabled={busy || hasAnyQuotedPath}>
            {busy ? 'Saving & validating...' : 'Save Source Details & Validate Columns'}
          </button>

          <div className="tdeBulkPathBar">
            <span className="tdeBulkLabel">
              <Folder size={14} />
              Bulk Folder Path
            </span>
            <input
              type="text"
              className={`tdeBulkInput ${hasQuotesInPath(bulkFolderPath) ? 'pathInputBlocked' : ''}`}
              value={bulkFolderPath}
              onChange={e => setBulkFolderPath(e.target.value)}
              placeholder="e.g. Data or C:\Data\Sales (no quotes)"
            />
            <input
              ref={folderInputRef}
              type="file"
              style={{ display: 'none' }}
              multiple
              {...({ webkitdirectory: '', directory: '' } as any)}
              onChange={e => handleBrowseFolder(e.target.files)}
            />
            <button
              type="button"
              className="tdeBrowseBtn"
              onClick={() => folderInputRef.current?.click()}
              title="Browse a local folder to auto-fill paths"
            >
              <FolderOpen size={14} />
              Browse Folder
            </button>
            <button
              type="button"
              className="tdeApplyBulkBtn"
              disabled={!bulkFolderPath.trim() || hasQuotesInPath(bulkFolderPath)}
              onClick={() => applyBulkFolderPath()}
            >
              Apply to All Tables
            </button>
            {bulkStatus && <span className="tdeBulkSuccess">{bulkStatus}</span>}
          </div>

          {hasAnyQuotedPath && (
            <span className="pathBlockerHint">Remove quotes (&quot; or &apos;) from file path before saving.</span>
          )}
        </div>
        {browseSecurityNote && (
          <div className="tdeSecurityNotice" role="status">
            <ShieldCheck size={17} />
            <span>{browseSecurityNote}</span>
            <button
              type="button"
              className="tdeNoticeClose"
              onClick={() => setBrowseSecurityNote(null)}
              aria-label="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {!editableSources.length && <div className="empty">No original source mapping recovered yet. Add source files or provide TWB/TDS/TWBX/TDSX metadata, then re-upload or use manual source placeholder details.</div>}
        {editableSources.length > 0 && (
          <div className="tdeSplitLayout">
            {/* LEFT MASTER TABLE LIST */}
            <div className="tdeMasterPanel" data-tour="tde-detected-tables">
              <div className="tdeMasterHeader">
                <div className="tdeMasterTitleGroup">
                  <span className="tdePanelIcon"><ListFilter size={17} /></span>
                  <h3>Detected Tables ({filteredSources.length})</h3>
                </div>
                <div className="tdeMasterFilters">
                  <div className="tdeSearchWrap">
                    <Search size={14} className="tdeSearchIcon" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search table name..."
                    />
                  </div>
                  <select
                    className="tdeFilterSelect"
                    value={connectorFilter}
                    onChange={e => setConnectorFilter(e.target.value)}
                  >
                    {availableConnectors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="tdeTableWrap">
                <table className="tdeMasterTable">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}>#</th>
                      <th>Table Name</th>
                      <th>Source Path</th>
                      <th>Status</th>
                      <th style={{ width: 24 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSources.map((m, idx) => {
                      const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                      const isActive = selectedSource?.source_id === m.source_id;
                      const isConfigured = Boolean(m.target_file_path || m.server_name || m.sql_query);
                      return (
                        <tr
                          key={m.source_id}
                          className={isActive ? 'activeRow' : ''}
                          onClick={() => setSelectedId(m.source_id)}
                        >
                          <td className="tdeNumCell">{rowNum}</td>
                          <td className="tdeNameCell" title={getDisplayTitle(m)}>
                            <b>{getDisplayTitle(m)}</b>
                          </td>
                          <td className="tdePathCell" title={m.target_file_path || m.detected_source_path || ''}>
                            {m.target_file_path || m.detected_source_path || m.server_name || '—'}
                          </td>
                          <td>
                            <span className={`tdeStatusBadge ${isConfigured ? 'configured' : 'pending'}`}>
                              {isConfigured ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                              <span>{isConfigured ? 'Configured' : 'Needs Path'}</span>
                            </span>
                          </td>
                          <td className="tdeArrowCell">
                            {isActive && <ChevronRight size={16} />}
                          </td>
                        </tr>
                      );
                    })}
                    {!pagedSources.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          No tables match "{searchQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="tdePagination">
                <span className="tdePageSummary">
                  Showing {filteredSources.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} – {Math.min(safePage * PAGE_SIZE, filteredSources.length)} of {filteredSources.length} tables
                </span>
                <div className="tdePageControls">
                  <button
                    type="button"
                    className="tdePageBtn"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                    <button
                      key={pNum}
                      type="button"
                      className={`tdePageBtn ${pNum === safePage ? 'active' : ''}`}
                      onClick={() => setPage(pNum)}
                    >
                      {pNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="tdePageBtn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    title="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT DETAIL EDITOR */}
            {selectedSource && (
              <div className="tdeDetailPanel">
                <div className="tdeDetailHeader">
                  <div className="tdeDetailTitleGroup">
                    <span className="tdePanelIcon"><Table2 size={18} /></span>
                    <div>
                      <h3>{getDisplayTitle(selectedSource)}</h3>
                      <span className="tdeDetailSub">
                        Recovered from: <b>{String(selectedSource.parameter_values?.source || selectedSource.original_connection_type || '')}</b>
                      </span>
                    </div>
                  </div>
                  <div className="tdeDetailActions">
                    <span className="tdeConnectorPill">{selectedSource.target_connector}</span>
                    <button
                      type="button"
                      className="tdeRemoveBtn"
                      title="Remove this unused or unnecessary table from the migration model"
                      onClick={() => removeSource(selectedSource.source_id)}
                    >
                      <Trash2 size={14} />
                      <span>Remove Table</span>
                    </button>
                  </div>
                </div>

                <div className="tdeEditorForm">
                  <label className="tdeFieldLabel">
                    <span className="tdeLabelTitle"><Plug size={14} /> Power BI Target Connector</span>
                    <select
                      value={selectedSource.target_connector}
                      onChange={e => update(selectedSource.source_id, 'target_connector', e.target.value)}
                    >
                      {connectors.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>

                  <div className="tdeFormGrid2">
                    <label className="tdeFieldLabel" data-tour="tde-path-input">
                      <span className="tdeLabelTitle"><Folder size={14} /> Power BI Readable File Path</span>
                      <input
                        className={hasQuotesInPath(selectedSource.target_file_path) ? 'pathInputBlocked' : ''}
                        value={selectedSource.target_file_path || ''}
                        onChange={e => update(selectedSource.source_id, 'target_file_path', e.target.value)}
                        placeholder="data/orders_2026.csv or C:\Data\orders.csv"
                      />
                      {hasQuotesInPath(selectedSource.target_file_path) && (
                        <span className="pathBlockerHint">
                          Quotes (&quot; or &apos;) are not allowed in file paths. Enter the path without quotes.
                        </span>
                      )}
                    </label>
                    <label className="tdeFieldLabel">
                      <span className="tdeLabelTitle"><Crosshair size={14} /> Detected Source Path</span>
                      <input
                        value={selectedSource.detected_source_path || ''}
                        onChange={e => update(selectedSource.source_id, 'detected_source_path', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="tdeFormGrid2">
                    <label className="tdeFieldLabel">
                      <span className="tdeLabelTitle"><Server size={14} /> Server / Host</span>
                      <input
                        value={selectedSource.server_name || ''}
                        onChange={e => update(selectedSource.source_id, 'server_name', e.target.value)}
                        placeholder="Enter server or host"
                      />
                    </label>
                    <label className="tdeFieldLabel">
                      <span className="tdeLabelTitle"><Database size={14} /> Database</span>
                      <input
                        value={selectedSource.database_name || ''}
                        onChange={e => update(selectedSource.source_id, 'database_name', e.target.value)}
                        placeholder="Enter database name"
                      />
                    </label>
                    <label className="tdeFieldLabel">
                      <span className="tdeLabelTitle"><Layers size={14} /> Schema</span>
                      <input
                        value={selectedSource.schema_name || ''}
                        onChange={e => update(selectedSource.source_id, 'schema_name', e.target.value)}
                        placeholder="Enter schema (optional)"
                      />
                    </label>
                    <label className="tdeFieldLabel">
                      <span className="tdeLabelTitle"><Table2 size={14} /> Table</span>
                      <input
                        value={selectedSource.table_name || ''}
                        onChange={e => update(selectedSource.source_id, 'table_name', e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="tdeFieldLabel">
                    <span className="tdeLabelTitle"><Code2 size={14} /> Custom SQL / Native Query / Staging View Definition</span>
                    <textarea
                      value={selectedSource.sql_query || ''}
                      onChange={e => update(selectedSource.source_id, 'sql_query', e.target.value)}
                      placeholder="Paste source SQL if this TDE was built from custom SQL or a staged view"
                    />
                  </label>

                  {selectedSource.credential_notes && (
                    <div className="tdeInfoNote">
                      <span className="tdeInfoIconCircle"><Info size={14} /></span>
                      <span>{selectedSource.credential_notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>}
    </Card>
  </div>;
}
