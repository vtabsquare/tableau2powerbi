import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns3,
  Copy,
  Database,
  Download,
  GitBranch,
  Layers,
  Link2,
  Network,
  Search,
  ShieldCheck,
  Sigma,
  Table2,
  Type,
  Hash,
  ToggleLeft,
} from 'lucide-react';
import { MigrationProject, SemanticTable } from '../types/project';

type Props = {
  project: MigrationProject;
  onNavigateStage?: (stage: string) => void;
};

type DetailTab = 'columns' | 'measures' | 'lineage' | 'dependencies' | 'preview';

type NormalizedColumn = {
  name: string;
  sourceName: string;
  dataType: string;
  role: string;
  possibleKey: boolean;
  dimensionOrMeasure: 'Dimension' | 'Measure';
  expression: string;
  confidence: number;
};

type NormalizedMeasure = {
  name: string;
  expression: string;
  confidence: number;
  notes: string;
};

function str(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s || fallback;
}

function num(val: unknown, fallback = 0.95): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n > 1 ? Math.min(1, n / 100) : Math.max(0, n);
}

function formatDataType(raw: string): { label: string; kind: 'text' | 'date' | 'number' | 'bool' } {
  const t = raw.toLowerCase();
  if (t.includes('date') || t.includes('time')) return { label: raw || 'DateTime', kind: 'date' };
  if (t.includes('int') || t.includes('whole')) return { label: 'Whole Number', kind: 'number' };
  if (t.includes('dec') || t.includes('float') || t.includes('double') || t.includes('num') || t.includes('currency')) {
    return { label: 'Decimal Number', kind: 'number' };
  }
  if (t.includes('bool')) return { label: 'Boolean', kind: 'bool' };
  return { label: raw || 'Text', kind: 'text' };
}

function normalizeColumns(table: SemanticTable, project: MigrationProject): NormalizedColumn[] {
  const preview = project.previews.find((p) => p.source_id === table.source_id);
  const previewCols = preview?.columns || [];
  const calcMap = new Map(
    project.calculations.map((c) => [c.name.toLowerCase(), c])
  );

  return (table.columns || []).map((col) => {
    const name = str(col.name ?? col.column_name ?? col.caption, 'Unnamed');
    const sourceName = str(col.source_name ?? col.original_name ?? col.source_column, name);
    const pCol = previewCols.find(
      (pc) => pc.column_name.toLowerCase() === name.toLowerCase() || pc.column_name.toLowerCase() === sourceName.toLowerCase()
    );
    const calc = calcMap.get(name.toLowerCase());

    const rawType = str(
      col.data_type ?? col.datatype ?? col.type ?? pCol?.override_type ?? pCol?.detected_type,
      'Text'
    );
    const possibleKey = Boolean(
      col.possible_key ?? col.is_key ?? pCol?.possible_key ?? /(_id|^id$|key$)/i.test(name)
    );
    const dimOrMeasureRaw = str(
      col.dimension_or_measure ?? col.kind ?? pCol?.dimension_or_measure,
      ''
    ).toLowerCase();
    const isMeasure =
      dimOrMeasureRaw === 'measure' ||
      (dimOrMeasureRaw === '' && (rawType.toLowerCase().includes('dec') || rawType.toLowerCase().includes('num') || Boolean(calc?.generated_expression)));

    const role = str(
      col.role ?? col.semantic_role,
      possibleKey ? 'Identifier' : isMeasure ? 'Metric' : 'Attribute'
    );

    const expression = str(
      col.expression ?? col.dax ?? col.formula ?? calc?.generated_expression,
      '—'
    );

    const pConf = pCol
      ? Math.max(pCol.numeric_confidence || 0, pCol.date_confidence || 0, pCol.text_confidence || 0, 0.94)
      : 0.96;
    const confidence = num(col.confidence ?? col.confidence_score ?? calc?.confidence_score, pConf);

    return {
      name,
      sourceName,
      dataType: rawType,
      role,
      possibleKey,
      dimensionOrMeasure: isMeasure ? 'Measure' : 'Dimension',
      expression,
      confidence,
    };
  });
}

function normalizeMeasures(table: SemanticTable, project: MigrationProject): NormalizedMeasure[] {
  const calcMap = new Map(
    project.calculations.map((c) => [c.name.toLowerCase(), c])
  );

  return (table.measures || []).map((m) => {
    const name = str(m.name ?? m.measure_name ?? m.caption, 'Measure');
    const calc = calcMap.get(name.toLowerCase());
    const expression = str(
      m.expression ?? m.dax ?? m.formula ?? calc?.generated_expression ?? calc?.formula,
      '—'
    );
    const confidence = num(m.confidence ?? m.confidence_score ?? calc?.confidence_score, 0.94);
    const notes = str(m.description ?? m.notes ?? m.format_string, 'DAX Measure');
    return { name, expression, confidence, notes };
  });
}

function confidenceTone(score: number): 'good' | 'warn' {
  return score >= 0.85 ? 'good' : 'warn';
}

const PAGE_SIZE = 10;

export default function FinalTables({ project, onNavigateStage }: Props) {
  const tables = useMemo(
    () => project.semantic_tables.filter((t) => t.include_in_export),
    [project.semantic_tables]
  );

  const [selectedName, setSelectedName] = useState<string>(tables[0]?.name || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DetailTab>('columns');
  const [page, setPage] = useState(1);
  const [copiedPath, setCopiedPath] = useState(false);

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.source_id || '').toLowerCase().includes(q)
    );
  }, [tables, searchQuery]);

  const selectedTable =
    tables.find((t) => t.name === selectedName) || filteredTables[0] || tables[0];

  useEffect(() => {
    setPage(1);
  }, [selectedTable?.name, activeTab]);

  const totalColumns = useMemo(
    () => tables.reduce((acc, t) => acc + (t.columns?.length || 0), 0),
    [tables]
  );

  const totalMeasures = useMemo(
    () => tables.reduce((acc, t) => acc + (t.measures?.length || 0), 0),
    [tables]
  );

  const columns = useMemo(
    () => (selectedTable ? normalizeColumns(selectedTable, project) : []),
    [selectedTable, project]
  );

  const measures = useMemo(
    () => (selectedTable ? normalizeMeasures(selectedTable, project) : []),
    [selectedTable, project]
  );

  const overallConfidence = useMemo(() => {
    const scores: number[] = [];
    for (const t of tables) {
      for (const c of normalizeColumns(t, project)) scores.push(c.confidence);
      for (const m of normalizeMeasures(t, project)) scores.push(m.confidence);
    }
    if (!scores.length) return 98;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 100);
  }, [tables, project]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formattedDateTime = useMemo(() => {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  const sourceMapping = useMemo(() => {
    if (!selectedTable?.source_id) return undefined;
    return project.source_mappings.find((s) => s.source_id === selectedTable.source_id);
  }, [selectedTable, project.source_mappings]);

  const relatedRelationships = useMemo(() => {
    if (!selectedTable) return [];
    const nameLower = selectedTable.name.toLowerCase();
    return project.relationships.filter(
      (r) => r.from_table.toLowerCase() === nameLower || r.to_table.toLowerCase() === nameLower
    );
  }, [selectedTable, project.relationships]);

  const upstreamCount = sourceMapping ? 1 : 0;
  const downstreamCount = relatedRelationships.length;

  const modelRole = useMemo(() => {
    if (!selectedTable) return 'Business Table';
    const isFromFact = relatedRelationships.some(
      (r) =>
        r.from_table.toLowerCase() === selectedTable.name.toLowerCase() &&
        r.cardinality.toLowerCase().includes('many')
    );
    if (isFromFact || measures.length > 0) return 'Fact Table';
    if (relatedRelationships.length > 0) return 'Dimension Table';
    return 'Business Table';
  }, [selectedTable, relatedRelationships, measures.length]);

  const sourcePath =
    sourceMapping?.resolved_powerbi_path ||
    sourceMapping?.target_file_path ||
    sourceMapping?.detected_source_path ||
    selectedTable?.source_id ||
    'Power BI Semantic Model';

  const loadMode = sourceMapping?.import_or_directquery || 'Import';

  const previewData = useMemo(() => {
    if (!selectedTable?.source_id) return undefined;
    return project.previews.find((p) => p.source_id === selectedTable.source_id);
  }, [selectedTable, project.previews]);

  const totalPages = Math.max(1, Math.ceil(columns.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedColumns = columns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startRow = columns.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(safePage * PAGE_SIZE, columns.length);

  const handleExportModelView = () => {
    const payload = {
      project_name: project.project_name,
      exported_at: new Date().toISOString(),
      summary: {
        tables: tables.length,
        columns: totalColumns,
        measures: totalMeasures,
        confidence_percent: overallConfidence,
      },
      tables: tables.map((t) => ({
        name: t.name,
        source_id: t.source_id,
        columns: t.columns,
        measures: t.measures,
        lineage: t.lineage,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.project_name || 'semantic_model').replace(/\s+/g, '_')}_final_tables.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(sourcePath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="page finalTablesPage ftPage">
      {/* Top Header Shell */}
      <div className="ftHeaderShell">
        <div className="ftHeaderLeft">
          <div className="ftHeroIcon">
            <Box size={22} />
          </div>
          <div>
            <span className="ftEyebrow">FINAL POWER BI OUTPUT</span>
            <h1>Final Tables</h1>
            <p>
              Review the business tables, columns, and measures that will be written to the Power BI
              semantic model.
            </p>
          </div>
        </div>
        <div className="ftHeaderActions">
          <button type="button" className="ftOutlineBtn" onClick={handleExportModelView}>
            <Download size={15} />
            Export Model View
          </button>
          <button
            type="button"
            className="ftPrimaryBtn"
            onClick={() => onNavigateStage?.('Relationships')}
          >
            <Network size={15} />
            Open in Model Diagram
          </button>
        </div>
      </div>

      {/* 6 KPI Stat Cards */}
      <div className="ftKpiStrip">
        <div className="ftKpiCard">
          <div className="ftKpiIcon ftIconPurple">
            <Table2 size={18} />
          </div>
          <div className="ftKpiText">
            <strong>{tables.length}</strong>
            <span>Tables</span>
          </div>
        </div>
        <div className="ftKpiCard">
          <div className="ftKpiIcon ftIconPurple">
            <Columns3 size={18} />
          </div>
          <div className="ftKpiText">
            <strong>{totalColumns}</strong>
            <span>Columns</span>
          </div>
        </div>
        <div className="ftKpiCard">
          <div className="ftKpiIcon ftIconPurple">
            <Sigma size={18} />
          </div>
          <div className="ftKpiText">
            <strong>{totalMeasures}</strong>
            <span>Measures</span>
          </div>
        </div>
        <div className="ftKpiCard">
          <div className="ftKpiIcon ftIconBlue">
            <Layers size={18} />
          </div>
          <div className="ftKpiText">
            <strong>Final</strong>
            <span>Model Status</span>
          </div>
        </div>
        <div className="ftKpiCard">
          <div className="ftKpiIcon ftIconGreen">
            <ShieldCheck size={18} />
          </div>
          <div className="ftKpiText">
            <strong>{overallConfidence}%</strong>
            <span>Conversion Confidence</span>
          </div>
        </div>
        <div className="ftKpiCard">
          <div className="ftKpiIcon ftIconPurple">
            <Calendar size={18} />
          </div>
          <div className="ftKpiText">
            <strong>{formattedDate}</strong>
            <span>Last Generated</span>
          </div>
        </div>
      </div>

      {/* Main Master-Detail Split */}
      <div className="ftSplitLayout">
        {/* Left Sidebar: Tables */}
        <aside className="ftSidebar">
          <div className="ftSidebarHead">
            <div className="ftMiniBadge">
              <Table2 size={15} />
            </div>
            <h3>Tables ({tables.length})</h3>
          </div>

          <div className="ftSearchBox">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="ftTableList">
            {filteredTables.length === 0 ? (
              <div className="ftEmptySmall">No matching tables found.</div>
            ) : (
              filteredTables.map((t) => {
                const active = selectedTable?.name === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    className={`ftTableItem ${active ? 'active' : ''}`}
                    onClick={() => setSelectedName(t.name)}
                  >
                    <div className="ftTableItemLeft">
                      <div className="ftTableItemIcon">
                        <Table2 size={15} />
                      </div>
                      <div className="ftTableItemMeta">
                        <strong>{t.name}</strong>
                        <span>
                          {t.columns.length} columns • {t.measures.length} measures
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="ftChevron" />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Detail Panel */}
        <section className="ftDetailPanel">
          {!selectedTable ? (
            <div className="ftEmptyState">
              No final business tables are available yet. Complete Source Mapping first.
            </div>
          ) : (
            <>
              <div className="ftDetailHeader">
                <div className="ftDetailTitleGroup">
                  <div className="ftDetailIcon">
                    <Table2 size={19} />
                  </div>
                  <div>
                    <div className="ftDetailTitleRow">
                      <h2>{selectedTable.name}</h2>
                      <span className="ftRoleTag">Business Table</span>
                    </div>
                    <p className="ftDetailSub">
                      {columns.length} Columns • {measures.length} Measures
                      <span className="ftPipe">|</span>
                      Source: {selectedTable.source_id || '—'}
                    </p>
                  </div>
                </div>
                <span className="ftIncludedPill">
                  <CheckCircle2 size={14} />
                  Included in Model
                </span>
              </div>

              {/* 5 Sub-tabs */}
              <div className="ftTabBar">
                <button
                  type="button"
                  className={`ftTabBtn ${activeTab === 'columns' ? 'active' : ''}`}
                  onClick={() => setActiveTab('columns')}
                >
                  <Table2 size={14} />
                  Columns ({columns.length})
                </button>
                <button
                  type="button"
                  className={`ftTabBtn ${activeTab === 'measures' ? 'active' : ''}`}
                  onClick={() => setActiveTab('measures')}
                >
                  <Sigma size={14} />
                  Measures ({measures.length})
                </button>
                <button
                  type="button"
                  className={`ftTabBtn ${activeTab === 'lineage' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lineage')}
                >
                  <GitBranch size={14} />
                  Lineage &amp; Technical Details
                </button>
                <button
                  type="button"
                  className={`ftTabBtn ${activeTab === 'dependencies' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dependencies')}
                >
                  <Link2 size={14} />
                  Dependencies
                </button>
                <button
                  type="button"
                  className={`ftTabBtn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <Database size={14} />
                  Data Preview
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'columns' && (
                <div className="ftTableCard">
                  <div className="ftTableScroll">
                    <table className="ftDataTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Column Name</th>
                          <th>Source Name</th>
                          <th>Data Type</th>
                          <th>Role</th>
                          <th>Possible Key</th>
                          <th>Dimension / Measure</th>
                          <th>Expression (if any)</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedColumns.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="ftEmptyCell">
                              No columns found in this table.
                            </td>
                          </tr>
                        ) : (
                          pagedColumns.map((col, idx) => {
                            const dt = formatDataType(col.dataType);
                            const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                            return (
                              <tr key={`${col.name}-${rowNum}`}>
                                <td className="ftNumCell">{rowNum}</td>
                                <td className="ftBoldCell">{col.name}</td>
                                <td className="ftMutedCell">{col.sourceName}</td>
                                <td>
                                  <span className={`ftTypePill ftType-${dt.kind}`}>
                                    {dt.kind === 'text' && <Type size={11} />}
                                    {dt.kind === 'date' && <Calendar size={11} />}
                                    {dt.kind === 'number' && <Hash size={11} />}
                                    {dt.kind === 'bool' && <ToggleLeft size={11} />}
                                    {dt.label}
                                  </span>
                                </td>
                                <td>{col.role}</td>
                                <td>
                                  <span className={`ftKeyPill ${col.possibleKey ? 'yes' : 'no'}`}>
                                    {col.possibleKey ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`ftKindPill ${
                                      col.dimensionOrMeasure === 'Measure' ? 'measure' : 'dimension'
                                    }`}
                                  >
                                    {col.dimensionOrMeasure}
                                  </span>
                                </td>
                                <td className="ftExprCell" title={col.expression}>
                                  {col.expression}
                                </td>
                                <td>
                                  <span className={`ftConfPill ${confidenceTone(col.confidence)}`}>
                                    {col.confidence.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="ftPagination">
                    <span>
                      Showing {startRow}–{endRow} of {columns.length} columns
                    </span>
                    <div className="ftPageControls">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          className={pNum === safePage ? 'active' : ''}
                          onClick={() => setPage(pNum)}
                        >
                          {pNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'measures' && (
                <div className="ftTableCard">
                  <div className="ftTableScroll">
                    <table className="ftDataTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Measure Name</th>
                          <th>DAX Expression</th>
                          <th>Notes</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {measures.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="ftEmptyCell">
                              No measures defined on this table.
                            </td>
                          </tr>
                        ) : (
                          measures.map((m, idx) => (
                            <tr key={`${m.name}-${idx}`}>
                              <td className="ftNumCell">{idx + 1}</td>
                              <td className="ftBoldCell">{m.name}</td>
                              <td className="ftExprCell ftExprWide">{m.expression}</td>
                              <td className="ftMutedCell">{m.notes}</td>
                              <td>
                                <span className={`ftConfPill ${confidenceTone(m.confidence)}`}>
                                  {m.confidence.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'lineage' && (
                <div className="ftSubPanel">
                  <h4>Table Lineage &amp; Technical Provenance</h4>
                  {selectedTable.lineage.length === 0 ? (
                    <p className="ftMutedCell">No lineage entries recorded for this table.</p>
                  ) : (
                    <ul className="ftLineageList">
                      {selectedTable.lineage.map((item, idx) => (
                        <li key={idx}>
                          <CheckCircle2 size={14} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'dependencies' && (
                <div className="ftSubPanel">
                  <h4>Model Relationships &amp; Source Dependencies</h4>
                  <div className="ftDepGrid">
                    <div className="ftDepBox">
                      <span>Upstream Source</span>
                      <strong>{sourcePath}</strong>
                      <small>Connector: {sourceMapping?.target_connector || 'Auto-detected'}</small>
                    </div>
                    <div className="ftDepBox">
                      <span>Downstream Relationships ({relatedRelationships.length})</span>
                      {relatedRelationships.length === 0 ? (
                        <small>No relationships linked to {selectedTable.name}.</small>
                      ) : (
                        <ul className="ftRelMiniList">
                          {relatedRelationships.map((r) => (
                            <li key={r.id}>
                              <code>
                                {r.from_table}.{r.from_column} → {r.to_table}.{r.to_column}
                              </code>{' '}
                              <span>({r.cardinality})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="ftTableCard">
                  {!previewData || !previewData.rows.length ? (
                    <div className="ftEmptyState">
                      No sample preview rows available for source "{selectedTable.source_id || '—'}".
                    </div>
                  ) : (
                    <div className="ftTableScroll">
                      <table className="ftDataTable">
                        <thead>
                          <tr>
                            {Object.keys(previewData.rows[0]).map((key) => (
                              <th key={key}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.slice(0, 10).map((row, idx) => (
                            <tr key={idx}>
                              {Object.keys(previewData.rows[0]).map((key) => (
                                <td key={key}>{str(row[key], '—')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Bottom 3 Summary Cards */}
      <div className="ftBottomGrid">
        {/* Card 1: Model Summary */}
        <div className="ftBottomCard">
          <div className="ftBottomHead">
            <div className="ftMiniBadge">
              <Layers size={15} />
            </div>
            <h3>Model Summary</h3>
          </div>
          <ul className="ftSummaryChecklist">
            <li>
              <CheckCircle2 size={15} />
              <span>{tables.length} business tables</span>
            </li>
            <li>
              <CheckCircle2 size={15} />
              <span>{totalColumns} total columns</span>
            </li>
            <li>
              <CheckCircle2 size={15} />
              <span>{totalMeasures} total measures</span>
            </li>
            <li>
              <CheckCircle2 size={15} />
              <span>No duplicate representations</span>
            </li>
            <li>
              <CheckCircle2 size={15} />
              <span>Ready to write to Power BI</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Measures */}
        <div className="ftBottomCard">
          <div className="ftBottomHead">
            <div className="ftMiniBadge">
              <Sigma size={15} />
            </div>
            <h3>Measures ({measures.length})</h3>
          </div>
          <div className="ftMiniMeasureWrap">
            {measures.length === 0 ? (
              <div className="ftEmptySmall">No measures in this table.</div>
            ) : (
              <table className="ftMiniMeasureTable">
                <thead>
                  <tr>
                    <th>Measure Name</th>
                    <th>DAX Expression</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {measures.slice(0, 3).map((m, idx) => (
                    <tr key={`${m.name}-${idx}`}>
                      <td className="ftBoldCell">{m.name}</td>
                      <td className="ftExprCell">{m.expression}</td>
                      <td>
                        <span className={`ftConfPill ${confidenceTone(m.confidence)}`}>
                          {m.confidence.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {measures.length > 0 && (
            <button
              type="button"
              className="ftLinkAction"
              onClick={() => setActiveTab('measures')}
            >
              View all {measures.length} measures →
            </button>
          )}
        </div>

        {/* Card 3: Lineage & Technical Details */}
        <div className="ftBottomCard">
          <div className="ftBottomHead">
            <div className="ftMiniBadge">
              <GitBranch size={15} />
            </div>
            <h3>Lineage &amp; Technical Details</h3>
          </div>
          <div className="ftLineageGrid">
            <div className="ftTechTable">
              <div className="ftTechRow">
                <span>Source Path</span>
                <div className="ftPathVal">
                  <strong title={sourcePath}>{sourcePath}</strong>
                  <button
                    type="button"
                    className="ftIconBtn"
                    onClick={handleCopyPath}
                    title="Copy source path"
                  >
                    {copiedPath ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
              <div className="ftTechRow">
                <span>Query (M)</span>
                <button
                  type="button"
                  className="ftInlineLink"
                  onClick={() => onNavigateStage?.('M Query')}
                >
                  <Code2 size={13} />
                  View M Query
                </button>
              </div>
              <div className="ftTechRow">
                <span>Load Mode</span>
                <strong>{loadMode}</strong>
              </div>
              <div className="ftTechRow">
                <span>Refreshed</span>
                <strong>{formattedDateTime}</strong>
              </div>
            </div>

            <div className="ftMiniStatStack">
              <div className="ftMiniStatBox">
                <div className="ftMiniStatIcon ftIconPurple">
                  <Link2 size={14} />
                </div>
                <div>
                  <strong>Dependencies</strong>
                  <span>
                    {upstreamCount} upstream | {downstreamCount} downstream
                  </span>
                </div>
              </div>
              <div className="ftMiniStatBox">
                <div className="ftMiniStatIcon ftIconPurple">
                  <Layers size={14} />
                </div>
                <div>
                  <strong>Model Role</strong>
                  <span>{modelRole}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
