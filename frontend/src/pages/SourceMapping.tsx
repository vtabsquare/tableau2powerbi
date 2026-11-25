import { useEffect, useMemo, useState } from 'react';
import {
  Link2,
  Database,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  Sparkles,
  Info,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Folder,
  FolderOpen,
  Eye,
  Code2,
  Trash2,
  X,
  FileSpreadsheet,
  Plug,
} from 'lucide-react';
import { MigrationProject, SourceMapping as SourceMappingType } from '../types/project';
import { saveSourceMappings } from '../services/api';

const connectors = ['CSV','Text','Excel','Folder','JSON','XML','Parquet','SQL Server','Oracle','PostgreSQL','MySQL','Snowflake','Databricks','BigQuery','Azure SQL','OData','Web API','SharePoint Folder','OneLake/Fabric Lakehouse','Manual source placeholder'];

function isExtractLike(m: SourceMappingType) {
  return `${m.original_connection_type} ${m.detected_source_path} ${m.target_file_path} ${m.datasource} ${m.mapping_status}`.toLowerCase().includes('.tde') || `${m.original_connection_type} ${m.detected_source_path} ${m.target_file_path} ${m.datasource} ${m.mapping_status}`.toLowerCase().includes('.hyper') || `${m.mapping_status}`.toLowerCase().includes('extract');
}

function getConnectorTag(connector: string) {
  const c = (connector || '').toLowerCase();
  if (c === 'csv' || c === 'text') return { code: 'CS', cls: 'green' };
  if (c === 'excel') return { code: 'X', cls: 'green' };
  if (c === 'json' || c === 'xml' || c === 'parquet') return { code: 'JS', cls: 'indigo' };
  if (c.includes('manual')) return { code: 'M', cls: 'amber' };
  return { code: 'DB', cls: 'blue' };
}

export default function SourceMapping({
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
  const [mappings, setMappings] = useState<SourceMappingType[]>(project.source_mappings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectorFilter, setConnectorFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailSourceId, setDetailSourceId] = useState<string | null>(null);

  useEffect(() => {
    setMappings(project.source_mappings);
    setSelectedIds([]);
  }, [project.project_id, project.source_mappings]);

  function update(sourceId: string, key: keyof SourceMappingType, value: string) {
    setMappings(mappings.map(m => m.source_id === sourceId ? { ...m, [key]: value } : m));
  }
  function removeSource(sourceId: string) {
    setMappings(mappings.filter(m => m.source_id !== sourceId));
    setSelectedIds(prev => prev.filter(id => id !== sourceId));
    if (detailSourceId === sourceId) setDetailSourceId(null);
  }
  function removeSelected() {
    if (!selectedIds.length) return;
    setMappings(mappings.filter(m => !selectedIds.includes(m.source_id)));
    setSelectedIds([]);
  }

  async function save() {
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

  const businessSources = useMemo(() => {
    const nonExtracts = mappings.filter(m => !isExtractLike(m));
    return nonExtracts.length > 0 ? nonExtracts : mappings;
  }, [mappings]);

  const connectorCounts = useMemo(() => {
    const map: Record<string, number> = {};
    businessSources.forEach(m => {
      const c = m.target_connector || 'Other';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map);
  }, [businessSources]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return businessSources.filter(m => {
      if (connectorFilter !== 'All' && m.target_connector !== connectorFilter) return false;
      if (!q) return true;
      return `${m.datasource} ${m.table_name || ''} ${m.target_file_path || ''} ${m.detected_source_path || ''} ${m.target_connector || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [businessSources, connectorFilter, searchQuery]);

  const detectedCount = businessSources.length;
  const mappedCount = businessSources.filter(m => Boolean(m.target_file_path || m.server_name || m.sql_query)).length;
  const issuesCount = businessSources.filter(m => m.target_connector === 'Manual source placeholder' || (!m.target_file_path && !m.server_name && !m.sql_query)).length;

  const allSelected = filtered.length > 0 && filtered.every(m => selectedIds.includes(m.source_id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(m => m.source_id));
    }
  }

  function toggleSelect(sourceId: string) {
    setSelectedIds(prev => prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]);
  }

  function getTitle(m: SourceMappingType) {
    return `${m.datasource}${m.table_name ? ` - ${m.table_name}` : (m.detected_source_path ? ` - ${m.detected_source_path.split(/[\\/]/).pop()}` : '')}`;
  }

  const detailSource = useMemo(
    () => mappings.find(m => m.source_id === detailSourceId) || null,
    [mappings, detailSourceId]
  );

  return (
    <div className="page">
      <div className="smShell">
        {/* TOP HEADER + KPIs + APPLY BUTTON */}
        <div className="smHeaderRow">
          <div className="smHeaderLeft">
            <div className="smHeaderIcon">
              <Link2 size={21} />
            </div>
            <div>
              <h2>Source Mapping & Connection Details</h2>
              <p>Configure connection, file paths, and mapping for all detected tables ({businessSources.length} Tables).</p>
            </div>
          </div>

          <div className="smKpiPills">
            <div className="smKpiPill purple">
              <span className="smKpiIcon purple"><Database size={16} /></span>
              <div>
                <b>{businessSources.length}</b>
                <span>Total Tables</span>
              </div>
            </div>
            <div className="smKpiPill green">
              <span className="smKpiIcon green"><CheckCircle2 size={16} /></span>
              <div>
                <b>{detectedCount}</b>
                <span>Detected</span>
              </div>
            </div>
            <div className="smKpiPill blue">
              <span className="smKpiIcon blue"><FileCheck2 size={16} /></span>
              <div>
                <b>{mappedCount}</b>
                <span>Mapped</span>
              </div>
            </div>
            <div className="smKpiPill amber">
              <span className="smKpiIcon amber"><AlertTriangle size={16} /></span>
              <div>
                <b>{issuesCount}</b>
                <span>Issues</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="smApplyBtn"
            onClick={save}
            disabled={busy}
          >
            <Sparkles size={16} />
            <span>{busy ? 'Saving & regenerating...' : 'Apply & Regenerate M'}</span>
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {/* INFO BANNER */}
        <div className="smInfoBanner">
          <span className="smInfoIconCircle"><Info size={14} /></span>
          <span>
            <b>Business Sources:</b> All detected tables from your Tableau model are listed below. Configure file paths, connectors, or remove unnecessary tables before applying.
          </span>
        </div>

        {/* TOOLBAR: VIEW TOGGLE + SEARCH + CONNECTOR CHIPS + BULK ACTIONS */}
        <div className="smToolbar">
          <div className="smToolbarLeft">
            <div className="smViewToggle">
              <button
                type="button"
                className={`smViewBtn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid size={15} />
                <span>Card View</span>
              </button>
              <button
                type="button"
                className={`smViewBtn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <TableIcon size={15} />
                <span>Table View</span>
              </button>
            </div>

            <div className="smSearchWrap">
              <Search size={15} className="smSearchIcon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search table (e.g., Sales, Customers...)"
              />
            </div>

            <div className="smFilterChips">
              <button
                type="button"
                className={`smChipBtn ${connectorFilter === 'All' ? 'active' : ''}`}
                onClick={() => setConnectorFilter('All')}
              >
                All ({businessSources.length})
              </button>
              {connectorCounts.map(([conn, count]) => (
                <button
                  key={conn}
                  type="button"
                  className={`smChipBtn ${connectorFilter === conn ? 'active' : ''}`}
                  onClick={() => setConnectorFilter(conn)}
                >
                  <FileSpreadsheet size={13} />
                  <span>{conn} ({count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="smToolbarRight">
            <label className="smSelectAllLabel">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <span>Select All</span>
            </label>
            <button
              type="button"
              className="smBulkBtn"
              disabled={!selectedIds.length}
              onClick={removeSelected}
              title="Remove selected tables"
            >
              <Trash2 size={14} />
              <span>{selectedIds.length ? `Remove Selected (${selectedIds.length})` : 'Bulk Actions'}</span>
            </button>
          </div>
        </div>

        {/* EMPTY STATE */}
        {!filtered.length && (
          <div className="empty">No source tables match your current search or filter.</div>
        )}

        {/* CARD VIEW (4-COLUMN COMPACT GRID) */}
        {filtered.length > 0 && viewMode === 'card' && (
          <div className="smCardGrid">
            {filtered.map((m) => {
              const tag = getConnectorTag(m.target_connector);
              const isSelected = selectedIds.includes(m.source_id);
              const isDb = ['SQL Server','Oracle','PostgreSQL','MySQL','Snowflake','Databricks','BigQuery','Azure SQL'].includes(m.target_connector);
              return (
                <div className={`smCard ${isSelected ? 'selected' : ''}`} key={m.source_id}>
                  <div className="smCardHead">
                    <div className="smCardHeadLeft">
                      <span className="smCardIcon"><TableIcon size={16} /></span>
                      <div className="smCardTitleWrap">
                        <h3 title={getTitle(m)}>{getTitle(m)}</h3>
                        <span>Original: {m.original_connection_type}</span>
                      </div>
                    </div>
                    <div className="smCardHeadRight">
                      <span className="smDetectedBadge">{m.mapping_status || 'Detected'}</span>
                      <input
                        type="checkbox"
                        className="smCardCheckbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(m.source_id)}
                        title="Select table"
                      />
                    </div>
                  </div>

                  <div className="smConnectorBlock">
                    <span className="smMiniLabel">Target Connector</span>
                    <div className="smSelectRow">
                      <span className={`smConnTag ${tag.cls}`}>{tag.code}</span>
                      <select
                        value={m.target_connector}
                        onChange={e => update(m.source_id, 'target_connector', e.target.value)}
                      >
                        {connectors.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="smCompactFields">
                    {isDb ? (
                      <>
                        <div className="smCompactRow">
                          <span className="smCompactKey"><Database size={13} /> Server</span>
                          <input
                            value={m.server_name || ''}
                            onChange={e => update(m.source_id, 'server_name', e.target.value)}
                            placeholder="Server / host"
                          />
                        </div>
                        <div className="smCompactRow">
                          <span className="smCompactKey"><Folder size={13} /> Database</span>
                          <input
                            value={m.database_name || ''}
                            onChange={e => update(m.source_id, 'database_name', e.target.value)}
                            placeholder="Database"
                          />
                        </div>
                        <div className="smCompactRow">
                          <span className="smCompactKey"><TableIcon size={13} /> Table</span>
                          <input
                            value={m.table_name || ''}
                            onChange={e => update(m.source_id, 'table_name', e.target.value)}
                            placeholder="Schema / Table"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="smCompactRow">
                          <span className="smCompactKey"><Folder size={13} /> File Path</span>
                          <input
                            value={m.target_file_path || ''}
                            onChange={e => update(m.source_id, 'target_file_path', e.target.value)}
                            placeholder="data/source.csv"
                          />
                        </div>
                        <div className="smCompactRow">
                          <span className="smCompactKey"><FolderOpen size={13} /> Detected Path</span>
                          <input
                            value={m.detected_source_path || ''}
                            onChange={e => update(m.source_id, 'detected_source_path', e.target.value)}
                          />
                        </div>
                        <div className="smCompactRow">
                          <span className="smCompactKey"><Database size={13} /> Schema / Table</span>
                          <input
                            value={m.table_name || ''}
                            onChange={e => update(m.source_id, 'table_name', e.target.value)}
                            placeholder="Table name"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="smCardFooter">
                    <div className="smPqPath" title={m.powerbi_path_parameter || 'Will be generated on Apply'}>
                      <Code2 size={13} className="smPqIcon" />
                      <span>
                        <b>Power Query Path:</b> {m.powerbi_path_parameter || 'Pending Apply'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="smEyeBtn"
                      onClick={() => setDetailSourceId(m.source_id)}
                      title="Inspect full connection, SQL & details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {filtered.length > 0 && viewMode === 'table' && (
          <div className="soTableWrap">
            <table className="soInventoryTable">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th>Source / Table</th>
                  <th>Target Connector</th>
                  <th>File Path / Server</th>
                  <th>Table</th>
                  <th>Power Query Parameter</th>
                  <th>Status</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.source_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.source_id)}
                        onChange={() => toggleSelect(m.source_id)}
                      />
                    </td>
                    <td>
                      <b className="soTableName">{getTitle(m)}</b>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Original: {m.original_connection_type}</div>
                    </td>
                    <td>
                      <select
                        className="smTableInput"
                        value={m.target_connector}
                        onChange={e => update(m.source_id, 'target_connector', e.target.value)}
                      >
                        {connectors.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        className="smTableInput"
                        value={m.target_file_path || m.server_name || ''}
                        onChange={e => update(m.source_id, m.target_file_path !== undefined ? 'target_file_path' : 'server_name', e.target.value)}
                        placeholder="Path or server"
                      />
                    </td>
                    <td>
                      <input
                        className="smTableInput"
                        value={m.table_name || ''}
                        onChange={e => update(m.source_id, 'table_name', e.target.value)}
                      />
                    </td>
                    <td style={{ fontSize: 11.5, color: '#4338ca', fontWeight: 600 }}>
                      {m.powerbi_path_parameter || 'Pending Apply'}
                    </td>
                    <td>
                      <span className="smDetectedBadge">{m.mapping_status || 'Detected'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="smEyeBtn" onClick={() => setDetailSourceId(m.source_id)} title="Details & SQL">
                          <Eye size={14} />
                        </button>
                        <button type="button" className="smEyeBtn danger" onClick={() => removeSource(m.source_id)} title="Remove table">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULL DETAILS / SQL / ADVANCED EDIT MODAL */}
      {detailSource && (
        <div className="migrationModalBackdrop" onClick={() => setDetailSourceId(null)}>
          <div className="smDetailModal" onClick={e => e.stopPropagation()}>
            <div className="smModalHeader">
              <div className="smCardHeadLeft">
                <span className="smCardIcon"><Plug size={18} /></span>
                <div>
                  <h3>{getTitle(detailSource)}</h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Original: {detailSource.original_connection_type}</span>
                </div>
              </div>
              <button type="button" className="smModalClose" onClick={() => setDetailSourceId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="smModalBody">
              <label className="tdeFieldLabel">
                <span className="tdeLabelTitle">Target Connector</span>
                <select value={detailSource.target_connector} onChange={e => update(detailSource.source_id, 'target_connector', e.target.value)}>
                  {connectors.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>

              <div className="tdeFormGrid2">
                <label className="tdeFieldLabel">
                  <span className="tdeLabelTitle">File Path</span>
                  <input value={detailSource.target_file_path || ''} onChange={e => update(detailSource.source_id, 'target_file_path', e.target.value)} />
                </label>
                <label className="tdeFieldLabel">
                  <span className="tdeLabelTitle">Detected Source Path</span>
                  <input value={detailSource.detected_source_path || ''} onChange={e => update(detailSource.source_id, 'detected_source_path', e.target.value)} />
                </label>
                <label className="tdeFieldLabel">
                  <span className="tdeLabelTitle">Server</span>
                  <input value={detailSource.server_name || ''} onChange={e => update(detailSource.source_id, 'server_name', e.target.value)} />
                </label>
                <label className="tdeFieldLabel">
                  <span className="tdeLabelTitle">Database</span>
                  <input value={detailSource.database_name || ''} onChange={e => update(detailSource.source_id, 'database_name', e.target.value)} />
                </label>
                <label className="tdeFieldLabel">
                  <span className="tdeLabelTitle">Schema</span>
                  <input value={detailSource.schema_name || ''} onChange={e => update(detailSource.source_id, 'schema_name', e.target.value)} />
                </label>
                <label className="tdeFieldLabel">
                  <span className="tdeLabelTitle">Table</span>
                  <input value={detailSource.table_name || ''} onChange={e => update(detailSource.source_id, 'table_name', e.target.value)} />
                </label>
              </div>

              <label className="tdeFieldLabel">
                <span className="tdeLabelTitle">SQL Query</span>
                <textarea value={detailSource.sql_query || ''} onChange={e => update(detailSource.source_id, 'sql_query', e.target.value)} />
              </label>

              {['CSV','Text','Excel','JSON','XML','Parquet'].includes(detailSource.target_connector) && (
                <div className="note" style={{ marginTop: 4 }}>
                  <strong>Power Query path parameter:</strong> {detailSource.powerbi_path_parameter || 'Will be generated on Apply'}<br/>
                  <strong>Resolved path:</strong> {detailSource.resolved_powerbi_path || 'Not resolved'}<br/>
                  <strong>Path mode:</strong> {detailSource.path_mode || 'Unresolved'}
                </div>
              )}
              {detailSource.credential_notes && <p className="hint" style={{ margin: 0 }}>{detailSource.credential_notes}</p>}
            </div>

            <div className="smModalFooter">
              <button
                type="button"
                className="tdeRemoveBtn"
                onClick={() => removeSource(detailSource.source_id)}
              >
                <Trash2 size={14} /> Remove Table
              </button>
              <button type="button" className="primary" style={{ width: 'auto' }} onClick={() => setDetailSourceId(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
