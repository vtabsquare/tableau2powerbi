import { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Search,
  Table2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Settings,
  Info,
  Calendar,
  Hash,
  Type,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import { MigrationProject } from '../types/project';

type DetailTab = 'profile' | 'preview' | 'types' | 'warnings' | 'source';

function getTypeBadge(typeStr: string) {
  const t = (typeStr || 'text').toLowerCase();
  if (t.includes('date') || t.includes('time')) {
    return (
      <span className="ptTypePill green">
        <Calendar size={12} />
        <span>{typeStr}</span>
      </span>
    );
  }
  if (t.includes('int') || t.includes('whole') || t.includes('decimal') || t.includes('double') || t.includes('float') || t.includes('number')) {
    return (
      <span className="ptTypePill blue">
        <Hash size={12} />
        <span>{typeStr}</span>
      </span>
    );
  }
  return (
    <span className="ptTypePill purple">
      <Type size={12} />
      <span>{typeStr || 'Text'}</span>
    </span>
  );
}

export default function PreviewTypes({ project }: { project: MigrationProject }) {
  const previews = project.previews || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(previews[0]?.source_id || null);
  const [activeTab, setActiveTab] = useState<DetailTab>('profile');
  const [rowsLimit, setRowsLimit] = useState(5);
  const [previewPage, setPreviewPage] = useState(1);

  const mappingById = useMemo(() => {
    const map = new Map<string, (typeof project.source_mappings)[number]>();
    (project.source_mappings || []).forEach(m => map.set(m.source_id, m));
    return map;
  }, [project.source_mappings]);

  function getTableTitle(sourceId: string) {
    const m = mappingById.get(sourceId);
    if (!m) return sourceId;
    return `${m.datasource}${m.table_name ? ` - ${m.table_name}` : ''}`;
  }

  const filteredPreviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return previews;
    return previews.filter(p => {
      const m = mappingById.get(p.source_id);
      return `${getTableTitle(p.source_id)} ${m?.target_file_path || ''} ${m?.detected_source_path || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [previews, searchQuery, mappingById]);

  useEffect(() => {
    if (!filteredPreviews.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredPreviews.some(p => p.source_id === selectedId)) {
      setSelectedId(filteredPreviews[0].source_id);
    }
  }, [filteredPreviews, selectedId]);

  useEffect(() => {
    setPreviewPage(1);
  }, [selectedId, rowsLimit]);

  const selectedPreview = useMemo(
    () => filteredPreviews.find(p => p.source_id === selectedId) || filteredPreviews[0] || null,
    [filteredPreviews, selectedId]
  );

  const selectedMapping = selectedPreview ? mappingById.get(selectedPreview.source_id) : undefined;

  if (!previews.length) {
    return (
      <div className="page">
        <div className="ptEmptyShell">
          <div className="note">No data previews or column profiles are available yet. Apply Source Mapping or upload source data files.</div>
        </div>
      </div>
    );
  }

  const totalPreviewRows = selectedPreview?.rows?.length || 0;
  const totalPreviewPages = Math.max(1, Math.ceil(totalPreviewRows / rowsLimit));
  const safePreviewPage = Math.min(previewPage, totalPreviewPages);
  const pagedPreviewRows = selectedPreview
    ? selectedPreview.rows.slice((safePreviewPage - 1) * rowsLimit, safePreviewPage * rowsLimit)
    : [];
  const previewCols = selectedPreview?.rows?.[0] ? Object.keys(selectedPreview.rows[0]) : [];

  const columnWarnings = (selectedPreview?.columns || []).flatMap(c =>
    (c.warnings || []).map(w => ({ column: c.column_name, warning: w }))
  );
  const allWarningsCount = (selectedPreview?.warnings?.length || 0) + columnWarnings.length;

  function renderDataPreviewBlock() {
    if (!selectedPreview) return null;
    return (
      <div className="ptSubCard">
        <div className="ptSubCardHeader">
          <div className="ptSubTitleGroup">
            <span className="ptMiniIcon"><Table2 size={16} /></span>
            <h3>Data Preview (First {totalPreviewRows} Rows)</h3>
          </div>
          <div className="ptRowsSelectWrap">
            <span>Rows to preview</span>
            <select value={rowsLimit} onChange={e => setRowsLimit(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>

        {pagedPreviewRows.length > 0 ? (
          <>
            <div className="ptTableWrap">
              <table className="ptTable">
                <thead>
                  <tr>
                    {previewCols.map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedPreviewRows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {previewCols.map(col => (
                        <td key={col}>{row[col] !== null && row[col] !== undefined && row[col] !== '' ? String(row[col]) : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPreviewPages > 1 && (
              <div className="ptPaginationRow">
                <span className="tdePageSummary">
                  Showing {(safePreviewPage - 1) * rowsLimit + 1} – {Math.min(safePreviewPage * rowsLimit, totalPreviewRows)} of {totalPreviewRows} rows
                </span>
                <div className="tdePageControls">
                  <button
                    type="button"
                    className="tdePageBtn"
                    disabled={safePreviewPage <= 1}
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPreviewPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`tdePageBtn ${n === safePreviewPage ? 'active' : ''}`}
                      onClick={() => setPreviewPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="tdePageBtn"
                    disabled={safePreviewPage >= totalPreviewPages}
                    onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty">No sample rows available for this table.</div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="ptSplitLayout">
        {/* LEFT SIDEBAR: SOURCE TABLES */}
        <aside className="ptSidebar">
          <div className="ptSidebarHeader">
            <span className="ptSidebarIcon"><Database size={18} /></span>
            <h3>Source Tables ({previews.length})</h3>
          </div>

          <div className="ptSearchWrap">
            <Search size={14} className="ptSearchIcon" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search table (e.g., Enterprise Sales)"
            />
          </div>

          <div className="ptTableList">
            {filteredPreviews.map(p => {
              const isActive = selectedPreview?.source_id === p.source_id;
              const hasWarn = !p.available || (p.warnings && p.warnings.length > 0);
              return (
                <button
                  type="button"
                  key={p.source_id}
                  className={`ptTableItem ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedId(p.source_id)}
                >
                  <span className="ptItemIcon"><Table2 size={16} /></span>
                  <div className="ptItemText">
                    <b title={getTableTitle(p.source_id)}>{getTableTitle(p.source_id)}</b>
                    <span>{p.columns.length} columns • {p.rows.length} sample rows</span>
                  </div>
                  <div className="ptItemRight">
                    <span className={`ptDotIcon ${hasWarn ? 'warn' : 'good'}`}>
                      {hasWarn ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                    </span>
                    <ChevronRight size={15} className="ptChevron" />
                  </div>
                </button>
              );
            })}
            {!filteredPreviews.length && (
              <div className="empty" style={{ fontSize: 12 }}>No tables match "{searchQuery}".</div>
            )}
          </div>
        </aside>

        {/* RIGHT DETAIL AREA */}
        {selectedPreview && (
          <div className="ptDetailMain">
            <div className="ptDetailHeaderCard">
              <div className="ptDetailTopRow">
                <div className="ptDetailTitleGroup">
                  <span className="ptDetailBigIcon"><Table2 size={20} /></span>
                  <div>
                    <h2>{getTableTitle(selectedPreview.source_id)}</h2>
                    <span className="ptDetailSub">
                      Source: <b>{selectedMapping?.target_file_path || selectedMapping?.detected_source_path || selectedMapping?.server_name || 'Metadata'}</b>
                      {'  |  '}
                      Connector: <b>{selectedMapping?.target_connector || 'Unknown'}</b>
                    </span>
                  </div>
                </div>
                <span className={`ptStatusPill ${selectedPreview.available ? 'good' : 'warn'}`}>
                  {selectedPreview.available ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <span>{selectedMapping?.mapping_status || (selectedPreview.available ? 'Detected' : 'Metadata Only')}</span>
                </span>
              </div>

              <div className="ptTabsRow">
                <button
                  type="button"
                  className={`ptTabBtn ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <BarChart3 size={15} />
                  <span>Column Profile</span>
                </button>
                <button
                  type="button"
                  className={`ptTabBtn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <Table2 size={15} />
                  <span>Data Preview</span>
                </button>
                <button
                  type="button"
                  className={`ptTabBtn ${activeTab === 'types' ? 'active' : ''}`}
                  onClick={() => setActiveTab('types')}
                >
                  <Settings size={15} />
                  <span>Data Types</span>
                </button>
                <button
                  type="button"
                  className={`ptTabBtn ${activeTab === 'warnings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('warnings')}
                >
                  <AlertTriangle size={15} />
                  <span>Quality & Warnings ({allWarningsCount})</span>
                </button>
                <button
                  type="button"
                  className={`ptTabBtn ${activeTab === 'source' ? 'active' : ''}`}
                  onClick={() => setActiveTab('source')}
                >
                  <Info size={15} />
                  <span>Source Details</span>
                </button>
              </div>
            </div>

            {/* TAB 1: COLUMN PROFILE + DATA PREVIEW */}
            {activeTab === 'profile' && (
              <>
                <div className="ptSubCard">
                  <div className="ptSubCardHeader">
                    <div className="ptSubTitleGroup">
                      <span className="ptMiniIcon"><BarChart3 size={16} /></span>
                      <h3>Column Profile ({selectedPreview.columns.length})</h3>
                    </div>
                  </div>

                  {selectedPreview.columns.length > 0 ? (
                    <div className="ptTableWrap">
                      <table className="ptTable">
                        <thead>
                          <tr>
                            <th style={{ width: 38 }}>#</th>
                            <th>Column Name</th>
                            <th>Inferred Type</th>
                            <th>Nulls</th>
                            <th>Distinct</th>
                            <th>Confidence</th>
                            <th>Possible Key</th>
                            <th>Dimension / Measure</th>
                            <th>Warnings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPreview.columns.map((c, idx) => {
                            const maxConf = Math.round(
                              Math.max(c.numeric_confidence || 0, c.date_confidence || 0, c.text_confidence || 0, 1) * 100
                            );
                            const confPct = Math.min(100, Math.max(0, maxConf > 100 ? Math.round(maxConf / 100) : maxConf));
                            const sampleLen = Math.max(1, selectedPreview.rows.length || 1);
                            const nullPct = Math.round(((c.null_count || 0) / sampleLen) * 100);
                            const isMeasure = (c.dimension_or_measure || '').toLowerCase().includes('measure');
                            return (
                              <tr key={c.column_name}>
                                <td className="ptNumCell">{idx + 1}</td>
                                <td><b className="ptColName">{c.column_name}</b></td>
                                <td>{getTypeBadge(c.override_type || c.detected_type)}</td>
                                <td>{c.null_count} ({nullPct}%)</td>
                                <td>{c.distinct_count_estimate}</td>
                                <td>
                                  <div className="ptConfWrap">
                                    <div className="ptConfTrack">
                                      <div className="ptConfFill" style={{ width: `${confPct}%` }} />
                                    </div>
                                    <span>{confPct}%</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`ptKeyPill ${c.possible_key ? 'yes' : 'no'}`}>
                                    {c.possible_key ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`ptRolePill ${isMeasure ? 'measure' : 'dimension'}`}>
                                    {c.dimension_or_measure || 'Dimension'}
                                  </span>
                                </td>
                                <td className="ptWarnCell">
                                  {c.warnings?.length ? c.warnings.join('; ') : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">No column profile available for this table.</div>
                  )}
                </div>

                {renderDataPreviewBlock()}
              </>
            )}

            {/* TAB 2: DATA PREVIEW */}
            {activeTab === 'preview' && renderDataPreviewBlock()}

            {/* TAB 3: DATA TYPES */}
            {activeTab === 'types' && (
              <div className="ptSubCard">
                <div className="ptSubCardHeader">
                  <div className="ptSubTitleGroup">
                    <span className="ptMiniIcon"><Settings size={16} /></span>
                    <h3>Detected vs Override Data Types ({selectedPreview.columns.length})</h3>
                  </div>
                </div>
                <DataTable
                  rows={selectedPreview.columns.map(c => ({
                    column_name: c.column_name,
                    detected_type: c.detected_type,
                    override_type: c.override_type || '—',
                    dimension_or_measure: c.dimension_or_measure,
                    possible_key: c.possible_key ? 'Yes' : 'No',
                  }))}
                  empty="No data types available"
                />
              </div>
            )}

            {/* TAB 4: QUALITY & WARNINGS */}
            {activeTab === 'warnings' && (
              <div className="ptSubCard">
                <div className="ptSubCardHeader">
                  <div className="ptSubTitleGroup">
                    <span className="ptMiniIcon"><AlertTriangle size={16} /></span>
                    <h3>Quality & Warnings ({allWarningsCount})</h3>
                  </div>
                </div>
                {selectedPreview.warnings.map((w, i) => (
                  <div className="warn" key={`tw-${i}`}>{w}</div>
                ))}
                {columnWarnings.length > 0 && (
                  <DataTable rows={columnWarnings} />
                )}
                {allWarningsCount === 0 && (
                  <div className="note" style={{ marginTop: 0 }}>
                    No data quality issues or warnings detected for <b>{getTableTitle(selectedPreview.source_id)}</b>.
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: SOURCE DETAILS */}
            {activeTab === 'source' && (
              <div className="ptSubCard">
                <div className="ptSubCardHeader">
                  <div className="ptSubTitleGroup">
                    <span className="ptMiniIcon"><Info size={16} /></span>
                    <h3>Source Details</h3>
                  </div>
                </div>
                <div className="ptSourceGrid">
                  <div><span>Datasource</span><b>{selectedMapping?.datasource || '—'}</b></div>
                  <div><span>Table Name</span><b>{selectedMapping?.table_name || '—'}</b></div>
                  <div><span>Target Connector</span><b>{selectedMapping?.target_connector || '—'}</b></div>
                  <div><span>Original Connection</span><b>{selectedMapping?.original_connection_type || '—'}</b></div>
                  <div><span>Detected Path</span><b>{selectedMapping?.detected_source_path || '—'}</b></div>
                  <div><span>Target File Path</span><b>{selectedMapping?.target_file_path || '—'}</b></div>
                  <div><span>Power Query Parameter</span><b>{selectedMapping?.powerbi_path_parameter || 'Pending Apply'}</b></div>
                  <div><span>Import Mode</span><b>{selectedMapping?.import_or_directquery || 'Import'}</b></div>
                </div>
                {selectedMapping?.credential_notes && (
                  <div className="note" style={{ marginTop: 12 }}>{selectedMapping.credential_notes}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
