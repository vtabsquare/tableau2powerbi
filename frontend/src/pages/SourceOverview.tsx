import { useMemo, useState } from 'react';
import {
  Database,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Table2,
  Plug,
} from 'lucide-react';
import { Badge, Card, Metric } from '../components/Cards';
import DataTable from '../components/DataTable';
import { MigrationProject } from '../types/project';

function connectorCounts(project: MigrationProject) {
  const counts: Record<string, number> = {};
  for (const s of project.source_mappings || []) counts[s.target_connector || 'Unknown'] = (counts[s.target_connector || 'Unknown'] || 0) + 1;
  return Object.entries(counts).map(([connector, count]) => ({ connector, count }));
}

function extractRows(project: MigrationProject): Record<string, unknown>[] {
  return (project.source_mappings || [])
    .filter(s => `${s.original_connection_type} ${s.detected_source_path} ${s.target_file_path} ${s.mapping_status}`.toLowerCase().includes('extract') || `${s.detected_source_path} ${s.target_file_path}`.toLowerCase().includes('.tde') || `${s.detected_source_path} ${s.target_file_path}`.toLowerCase().includes('.hyper'))
    .map(s => ({
      source: s.datasource,
      extract_or_tde: s.detected_source_path || s.target_file_path,
      status: s.mapping_status,
      production_decision: s.mapping_status?.toLowerCase().includes('tde') ? 'Ignore for production; use original source instead' : 'Review extract vs original source',
      credential_notes: s.credential_notes,
    }));
}

function renderConnectorBadge(connector: string) {
  const c = (connector || '').toLowerCase();
  if (c.includes('excel') || c.includes('csv') || c.includes('text')) {
    return (
      <span className="soConnCell">
        <span className="soConnIcon green"><FileSpreadsheet size={14} /></span>
        <b>{connector}</b>
      </span>
    );
  }
  if (c.includes('json') || c.includes('xml') || c.includes('parquet')) {
    return (
      <span className="soConnCell">
        <span className="soConnIcon indigo"><FileText size={14} /></span>
        <b>{connector}</b>
      </span>
    );
  }
  if (c.includes('manual')) {
    return (
      <span className="soConnCell">
        <span className="soConnIcon amber"><Plug size={14} /></span>
        <b>{connector}</b>
      </span>
    );
  }
  return (
    <span className="soConnCell">
      <span className="soConnIcon blue"><Database size={14} /></span>
      <b>{connector || 'Unknown'}</b>
    </span>
  );
}

export default function SourceOverview({ project }: {project: MigrationProject}) {
  const allMappings = project.source_mappings || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [connectorFilter, setConnectorFilter] = useState('All Connectors');

  const manual = allMappings.filter(s => s.target_connector === 'Manual source placeholder').length;
  const local = allMappings.filter(s => ['CSV','Text','Excel','JSON','XML','Parquet'].includes(s.target_connector)).length;
  const tde = allMappings.filter(s => `${s.detected_source_path} ${s.target_file_path} ${s.mapping_status}`.toLowerCase().includes('.tde') || `${s.mapping_status}`.toLowerCase().includes('tde')).length;

  const connectorsList = useMemo(() => {
    const set = new Set<string>();
    allMappings.forEach(s => { if (s.target_connector) set.add(s.target_connector); });
    return ['All Connectors', ...Array.from(set)];
  }, [allMappings]);

  const filteredMappings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMappings.filter(s => {
      if (connectorFilter !== 'All Connectors' && s.target_connector !== connectorFilter) return false;
      if (!q) return true;
      return `${s.datasource} ${s.table_name || ''} ${s.original_connection_type || ''} ${s.target_connector || ''} ${s.detected_source_path || ''} ${s.target_file_path || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [allMappings, searchQuery, connectorFilter]);

  return <div className="page">
    <Card title="Source Overview & Migration Decision" right={<Badge tone={manual ? 'warn' : 'good'}>{manual ? `${manual} source(s) need review` : 'All sources mapped'}</Badge>}>
      <div className="metricsGrid">
        <Metric label="Detected source mappings" value={allMappings.length}/>
        <Metric label="Local readable files" value={local}/>
        <Metric label="Legacy TDE / extracts" value={tde}/>
        <Metric label="Manual source placeholders" value={manual}/>
      </div>
      <div className="note">
        This page is read-only. Use <b>Source Mapping</b> to edit connection details and <b>TDE Source Recovery</b> when a .tde is present. Tableau .tde files are treated as legacy validation baselines, not Power BI production sources.
      </div>
    </Card>
    <div className="grid2">
      <Card title="Connector distribution"><DataTable rows={connectorCounts(project)} empty="No connector decisions yet"/></Card>
      <Card title="Extract/TDE production decision"><DataTable rows={extractRows(project)} empty="No extract or TDE source detected"/></Card>
    </div>

    <div className="soInventoryShell" data-tour="so-all-tables">
      <div className="soInventoryHeader">
        <div className="soTitleGroup">
          <span className="soTitleIcon"><Table2 size={18} /></span>
          <h3>All Source Tables ({filteredMappings.length})</h3>
        </div>
        <div className="soHeaderFilters">
          <div className="tdeSearchWrap">
            <Search size={14} className="tdeSearchIcon" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search source or table..."
            />
          </div>
          <select
            className="tdeFilterSelect"
            value={connectorFilter}
            onChange={e => setConnectorFilter(e.target.value)}
          >
            {connectorsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="soTableWrap">
        <table className="soInventoryTable">
          <thead>
            <tr>
              <th style={{ width: 42 }}>#</th>
              <th>Source</th>
              <th>Table</th>
              <th>Original Type</th>
              <th>Target Connector</th>
              <th>Status</th>
              <th>Detected Path</th>
              <th>Target Path</th>
              <th>Import Mode</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredMappings.map((s, idx) => {
              const statusText = s.mapping_status || 'Detected';
              const isWarn = statusText.toLowerCase().includes('review') || statusText.toLowerCase().includes('missing') || statusText.toLowerCase().includes('tde') || s.target_connector === 'Manual source placeholder';
              return (
                <tr key={s.source_id || `${s.datasource}-${idx}`}>
                  <td className="soNumCell">{idx + 1}</td>
                  <td>
                    <span className="soSourceCell">
                      <Database size={14} className="soDbIcon" />
                      <b>{s.datasource}</b>
                    </span>
                  </td>
                  <td><b className="soTableName">{s.table_name || '—'}</b></td>
                  <td><span className="soTypePill">{s.original_connection_type || 'unknown'}</span></td>
                  <td>{renderConnectorBadge(s.target_connector)}</td>
                  <td>
                    <span className={`soStatusPill ${isWarn ? 'warn' : 'good'}`}>
                      {isWarn ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      <span>{statusText}</span>
                    </span>
                  </td>
                  <td className="soPathCell" title={s.detected_source_path || ''}>{s.detected_source_path || '—'}</td>
                  <td className="soPathCell" title={s.target_file_path || ''}>{s.target_file_path || '—'}</td>
                  <td><span className="soImportPill">{s.import_or_directquery || 'Import'}</span></td>
                  <td className="soNotesCell" title={s.credential_notes || ''}>{s.credential_notes || '—'}</td>
                </tr>
              );
            })}
            {!filteredMappings.length && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  No sources detected matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
