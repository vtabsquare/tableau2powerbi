import { useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  FileCode2,
  FileText,
  Filter,
  Info,
  Layers,
  Paintbrush,
  RefreshCw,
  ScatterChart,
  Search,
  Settings,
  Sigma,
  Table2,
  TrendingUp,
} from 'lucide-react';
import { MigrationProject } from '../types/project';

type Props = {
  project: MigrationProject;
  onNavigateStage?: (stage: string) => void;
};

type PlanTab = 'plan' | 'fields' | 'filters' | 'formatting' | 'json' | 'notes';

type NormalizedVisualItem = {
  worksheet: string;
  targetPage: string;
  recommendedVisual: string;
  rows: string[];
  columns: string[];
  values: string[];
  filters: string[];
  encoding: Record<string, unknown>;
  notes: string;
  status: string;
};

function toStringList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'string') {
    return val
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(val)];
}

function str(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s || fallback;
}

function normalizeVisualPlan(project: MigrationProject): NormalizedVisualItem[] {
  const planRows = Array.isArray(project.visual_plan) ? project.visual_plan : [];
  const worksheets = Array.isArray(project.worksheets) ? project.worksheets : [];

  const sourceList = planRows.length > 0 ? planRows : worksheets;

  return sourceList.map((raw: Record<string, unknown>, idx: number) => {
    const worksheet = str(
      raw.worksheet ?? raw.worksheet_name ?? raw.name ?? raw.title,
      `Worksheet ${idx + 1}`
    );
    const wsMeta = worksheets.find(
      (w: Record<string, unknown>) =>
        str(w.name ?? w.worksheet_name).toLowerCase() === worksheet.toLowerCase()
    ) as Record<string, unknown> | undefined;

    const targetPage = str(
      raw.target_page ?? raw.page ?? raw.powerbi_page ?? raw.dashboard,
      worksheet
    );
    const recommendedVisual = str(
      raw.recommended_visual ?? raw.powerbi_visual ?? raw.visual_type ?? raw.mark_type,
      'Clustered Bar'
    );
    const rows = toStringList(raw.rows ?? raw.row_fields ?? wsMeta?.rows);
    const columns = toStringList(raw.columns ?? raw.column_fields ?? wsMeta?.columns);
    const values = toStringList(
      raw.values ?? raw.measures ?? raw.metrics ?? wsMeta?.measures ?? wsMeta?.values
    );
    const filters = toStringList(raw.filters ?? wsMeta?.filters);

    let encoding: Record<string, unknown> = {};
    if (raw.encoding && typeof raw.encoding === 'object' && !Array.isArray(raw.encoding)) {
      encoding = raw.encoding as Record<string, unknown>;
    } else if (raw.visual_json && typeof raw.visual_json === 'object') {
      encoding = raw.visual_json as Record<string, unknown>;
    } else {
      encoding = {
        label: { column: values.slice(0, 1).length ? values.slice(0, 1) : rows.slice(0, 1) },
        color: { column: columns.slice(0, 1).length ? columns.slice(0, 1) : ['Default'] },
        tooltip: { column: [...values, ...rows].slice(0, 2) },
      };
    }

    const notes = str(
      raw.notes ?? raw.build_notes ?? raw.rationale,
      `${recommendedVisual} recommended for ${worksheet}. Preserves Tableau layout and context.`
    );
    const status = str(raw.status, 'Mapped');

    return {
      worksheet,
      targetPage,
      recommendedVisual,
      rows,
      columns,
      values,
      filters,
      encoding,
      notes,
      status,
    };
  });
}

function getVisualIcon(visualType: string) {
  const v = visualType.toLowerCase();
  if (v.includes('line') || v.includes('trend')) return <TrendingUp size={16} />;
  if (v.includes('scatter')) return <ScatterChart size={16} />;
  if (v.includes('table') || v.includes('heat') || v.includes('matrix')) return <Table2 size={16} />;
  return <BarChart3 size={16} />;
}

function renderJsonLine(line: string) {
  const keyMatch = line.match(/^(\s*)"([^"]+)":(.*)$/);
  if (keyMatch) {
    const [, indent, key, rest] = keyMatch;
    return (
      <>
        <span>{indent}</span>
        <span className="vpJsonKey">"{key}"</span>
        <span className="vpJsonPunct">:</span>
        <span className="vpJsonVal">{rest}</span>
      </>
    );
  }
  return <span className="vpJsonPunct">{line}</span>;
}

export default function VisualPlan({ project }: Props) {
  const items = useMemo(() => normalizeVisualPlan(project), [project]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PlanTab>('plan');
  const [copiedJson, setCopiedJson] = useState(false);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items.map((item, idx) => ({ item, idx }));
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(
        ({ item }) =>
          item.worksheet.toLowerCase().includes(q) ||
          item.targetPage.toLowerCase().includes(q) ||
          item.recommendedVisual.toLowerCase().includes(q)
      );
  }, [items, searchQuery]);

  const safeIdx = Math.min(selectedIdx, Math.max(0, items.length - 1));
  const selected = items[safeIdx];

  const totalPagesCount = useMemo(() => {
    const set = new Set(items.map((i) => i.targetPage.toLowerCase()));
    return set.size || items.length;
  }, [items]);

  const totalFiltersCount = useMemo(
    () => items.reduce((acc, i) => acc + i.filters.length, 0),
    [items]
  );

  const jsonString = useMemo(
    () => (selected ? JSON.stringify(selected.encoding, null, 2) : '{}'),
    [selected]
  );
  const jsonLines = useMemo(() => jsonString.split('\n'), [jsonString]);

  const selectedAllFields = useMemo(() => {
    if (!selected) return [];
    const list: Array<{ name: string; role: string }> = [];
    selected.rows.forEach((f) => list.push({ name: f, role: 'Row' }));
    selected.columns.forEach((f) => list.push({ name: f, role: 'Column' }));
    selected.values.forEach((f) => list.push({ name: f, role: 'Value / Measure' }));
    return list;
  }, [selected]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="page vpPage">
      {/* Header Shell */}
      <div className="vpHeaderShell">
        <div className="vpHeaderLeft">
          <div className="vpHeroIcon">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1>Visual Conversion Plan</h1>
            <p>
              Map Tableau worksheets to Power BI pages and visuals with configuration, fields,
              filters, and JSON.
            </p>
          </div>
        </div>
      </div>

      {/* 6 KPI Stat Cards */}
      <div className="vpKpiStrip">
        <div className="vpKpiCard">
          <div className="vpKpiIcon vpIconPurple">
            <Table2 size={18} />
          </div>
          <div className="vpKpiText">
            <strong>{items.length}</strong>
            <span>Worksheets</span>
          </div>
        </div>
        <div className="vpKpiCard">
          <div className="vpKpiIcon vpIconBlue">
            <RefreshCw size={18} />
          </div>
          <div className="vpKpiText">
            <strong>{totalPagesCount}</strong>
            <span>Target Pages</span>
          </div>
        </div>
        <div className="vpKpiCard">
          <div className="vpKpiIcon vpIconPurple">
            <BarChart3 size={18} />
          </div>
          <div className="vpKpiText">
            <strong>{items.length}</strong>
            <span>Visuals</span>
          </div>
        </div>
        <div className="vpKpiCard">
          <div className="vpKpiIcon vpIconPurple">
            <Filter size={18} />
          </div>
          <div className="vpKpiText">
            <strong>{totalFiltersCount}</strong>
            <span>Filters</span>
          </div>
        </div>
        <div className="vpKpiCard">
          <div className="vpKpiIcon vpIconPurple">
            <Code2 size={18} />
          </div>
          <div className="vpKpiText">
            <strong>{items.length}</strong>
            <span>Visual JSONs</span>
          </div>
        </div>
        <div className="vpKpiCard vpKpiReady">
          <div className="vpKpiIcon vpIconGreen">
            <CheckCircle2 size={18} />
          </div>
          <div className="vpKpiText">
            <strong>{items.length ? 'Ready to Build' : 'Pending'}</strong>
            <span>{items.length ? 'No issues found' : 'No worksheets yet'}</span>
          </div>
        </div>
      </div>

      {/* Master-Detail Split Layout */}
      <div className="vpSplitLayout">
        {/* Left Sidebar */}
        <aside className="vpSidebar">
          <div className="vpSidebarHead">
            <div className="vpMiniBadge">
              <BarChart3 size={15} />
            </div>
            <h3>Worksheets ({items.length})</h3>
          </div>

          <div className="vpSearchBox">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search worksheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="vpWsList">
            {filteredItems.length === 0 ? (
              <div className="vpEmptySmall">No worksheets detected for visual planning.</div>
            ) : (
              filteredItems.map(({ item, idx }) => {
                const active = idx === safeIdx;
                return (
                  <button
                    key={`${item.worksheet}-${idx}`}
                    type="button"
                    className={`vpWsItem ${active ? 'active' : ''}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <div className="vpWsItemLeft">
                      <div className="vpWsIcon">{getVisualIcon(item.recommendedVisual)}</div>
                      <div className="vpWsMeta">
                        <strong>{item.worksheet}</strong>
                        <span>→ {item.targetPage}</span>
                        <small>{item.recommendedVisual}</small>
                      </div>
                    </div>
                    <CheckCircle2 size={16} className="vpWsCheck" />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Detail Panel */}
        <section className="vpDetailPanel">
          {!selected ? (
            <div className="vpEmptyState">
              No worksheets detected for visual planning. Upload a Tableau workbook to generate a
              visual plan.
            </div>
          ) : (
            <>
              <div className="vpDetailHeader">
                <div className="vpDetailTitleGroup">
                  <div className="vpDetailIcon">{getVisualIcon(selected.recommendedVisual)}</div>
                  <div>
                    <h2>{selected.worksheet}</h2>
                    <p>
                      Target Page: <b>{selected.targetPage}</b>
                      <span className="vpPipe">|</span>
                      Recommended Visual: <b>{selected.recommendedVisual}</b>
                    </p>
                  </div>
                </div>
                <div className="vpDetailRightControls">
                  <span className="vpMappedPill">
                    <CheckCircle2 size={14} />
                    {selected.status}
                  </span>
                  <div className="vpNavArrows">
                    <button
                      type="button"
                      disabled={safeIdx <= 0}
                      onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                      aria-label="Previous worksheet"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={safeIdx >= items.length - 1}
                      onClick={() => setSelectedIdx((i) => Math.min(items.length - 1, i + 1))}
                      aria-label="Next worksheet"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 6 Sub-Tabs */}
              <div className="vpTabBar">
                <button
                  type="button"
                  className={`vpTabBtn ${activeTab === 'plan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('plan')}
                >
                  <Layers size={14} />
                  Visual Plan
                </button>
                <button
                  type="button"
                  className={`vpTabBtn ${activeTab === 'fields' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fields')}
                >
                  <Table2 size={14} />
                  Fields ({selectedAllFields.length})
                </button>
                <button
                  type="button"
                  className={`vpTabBtn ${activeTab === 'filters' ? 'active' : ''}`}
                  onClick={() => setActiveTab('filters')}
                >
                  <Filter size={14} />
                  Filters ({selected.filters.length})
                </button>
                <button
                  type="button"
                  className={`vpTabBtn ${activeTab === 'formatting' ? 'active' : ''}`}
                  onClick={() => setActiveTab('formatting')}
                >
                  <Paintbrush size={14} />
                  Formatting
                </button>
                <button
                  type="button"
                  className={`vpTabBtn ${activeTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveTab('json')}
                >
                  <FileCode2 size={14} />
                  Visual JSON
                </button>
                <button
                  type="button"
                  className={`vpTabBtn ${activeTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  <FileText size={14} />
                  Build Notes
                </button>
              </div>

              {/* Tab 1: Visual Plan (2x2 Grid) */}
              {activeTab === 'plan' && (
                <div className="vpPlanGrid" data-tour="vp-plan">
                  {/* Top-Left: Visual Preview (Power BI) */}
                  <div className="vpCard">
                    <div className="vpCardHead">
                      <div className="vpMiniBadge">
                        <BarChart3 size={14} />
                      </div>
                      <h4>Visual Preview (Power BI)</h4>
                    </div>
                    <div className="vpPreviewStage">
                      {selected.recommendedVisual.toLowerCase().includes('line') ? (
                        <div className="vpChartMock">
                          <div className="vpMockHeader">
                            <span>{selected.worksheet}</span>
                            <small>{selected.recommendedVisual}</small>
                          </div>
                          <svg viewBox="0 0 320 110" className="vpMockLineSvg">
                            <polyline
                              fill="none"
                              stroke="#7c3aed"
                              strokeWidth="3"
                              points="15,85 70,62 125,70 180,38 235,48 300,18"
                            />
                            <circle cx="70" cy="62" r="4" fill="#7c3aed" />
                            <circle cx="180" cy="38" r="4" fill="#7c3aed" />
                            <circle cx="300" cy="18" r="4" fill="#7c3aed" />
                          </svg>
                        </div>
                      ) : selected.recommendedVisual.toLowerCase().includes('bar') ? (
                        <div className="vpChartMock">
                          <div className="vpMockHeader">
                            <span>{selected.worksheet}</span>
                            <small>{selected.recommendedVisual}</small>
                          </div>
                          <div className="vpMockBars">
                            {[78, 56, 92, 64, 45].map((w, i) => (
                              <div key={i} className="vpMockBarRow">
                                <span>{selected.rows[i] || `Item ${i + 1}`}</span>
                                <div className="vpMockBarTrack">
                                  <div className="vpMockBarFill" style={{ width: `${w}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="vpKpiPreviewGrid">
                          {(selected.values.length
                            ? selected.values
                            : selected.rows.length
                            ? selected.rows
                            : ['Total Sales', 'Total Profit', 'Profit Ratio', 'Distinct Count']
                          )
                            .slice(0, 4)
                            .map((label, idx) => (
                              <div key={`${label}-${idx}`} className="vpPreviewTile">
                                <div className={`vpTileIcon vpTileTone${idx % 4}`}>
                                  {idx === 0 && <Sigma size={16} />}
                                  {idx === 1 && <TrendingUp size={16} />}
                                  {idx === 2 && <BarChart3 size={16} />}
                                  {idx === 3 && <Layers size={16} />}
                                </div>
                                <div>
                                  <strong>{label}</strong>
                                  <span>Power BI Field</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top-Right: Configuration Summary */}
                  <div className="vpCard">
                    <div className="vpCardHead">
                      <div className="vpMiniBadge">
                        <Settings size={14} />
                      </div>
                      <h4>Configuration Summary</h4>
                    </div>
                    <div className="vpConfigTable">
                      <div className="vpConfigRow">
                        <span>
                          <BarChart3 size={13} /> Visual Type
                        </span>
                        <div>
                          <span className="vpPurplePill">{selected.recommendedVisual}</span>
                        </div>
                      </div>
                      <div className="vpConfigRow">
                        <span>
                          <Table2 size={13} /> Rows
                        </span>
                        <div>
                          {selected.rows.length ? selected.rows.join(', ') : '—'}
                        </div>
                      </div>
                      <div className="vpConfigRow">
                        <span>
                          <Layers size={13} /> Columns
                        </span>
                        <div>
                          <span className="vpCountBadge">{selected.columns.length}</span>
                          <span>{selected.columns.length ? selected.columns.join(', ') : '—'}</span>
                        </div>
                      </div>
                      <div className="vpConfigRow">
                        <span>
                          <Sigma size={13} /> Values / Measures
                        </span>
                        <div>
                          {selected.values.length ? selected.values.join(', ') : '—'}
                        </div>
                      </div>
                      <div className="vpConfigRow">
                        <span>
                          <Filter size={13} /> Filters
                        </span>
                        <div>
                          <span className="vpCountBadge">{selected.filters.length}</span>
                          <span>{selected.filters.length ? selected.filters.join(', ') : 'None'}</span>
                        </div>
                      </div>
                      <div className="vpConfigRow">
                        <span>
                          <Code2 size={13} /> Encoding
                        </span>
                        <div>
                          <span className="vpPurplePill">Custom JSON (Safe Mode)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom-Left: Visual JSON (Safe Mode) */}
                  <div className="vpCard">
                    <div className="vpCardHead vpCardHeadBetween">
                      <div className="vpHeadTitleGroup">
                        <div className="vpMiniBadge">
                          <Code2 size={14} />
                        </div>
                        <h4>Visual JSON (Safe Mode)</h4>
                      </div>
                      <button
                        type="button"
                        className="vpCopyJsonBtn"
                        onClick={handleCopyJson}
                        title="Copy JSON"
                      >
                        {copiedJson ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="vpCodeBox">
                      <div className="vpCodeGutter">
                        {jsonLines.map((_, idx) => (
                          <span key={idx}>{idx + 1}</span>
                        ))}
                      </div>
                      <pre className="vpCodePre">
                        {jsonLines.map((line, idx) => (
                          <div key={idx}>{renderJsonLine(line)}</div>
                        ))}
                      </pre>
                    </div>
                  </div>

                  {/* Bottom-Right: Validation & Notes */}
                  <div className="vpCard">
                    <div className="vpCardHead">
                      <div className="vpMiniBadge">
                        <CheckCircle2 size={14} />
                      </div>
                      <h4>Validation &amp; Notes</h4>
                    </div>
                    <ul className="vpCheckList">
                      <li>
                        <CheckCircle2 size={15} />
                        <span>JSON is valid</span>
                      </li>
                      <li>
                        <CheckCircle2 size={15} />
                        <span>All fields are mapped</span>
                      </li>
                      <li>
                        <CheckCircle2 size={15} />
                        <span>No formatting conflicts</span>
                      </li>
                    </ul>
                    <div className="vpNoteBox">
                      <Info size={16} />
                      <p>{selected.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Fields */}
              {activeTab === 'fields' && (
                <div className="vpSubCard">
                  <h4>Mapped Fields ({selectedAllFields.length})</h4>
                  {selectedAllFields.length === 0 ? (
                    <div className="vpEmptySmall">No fields mapped for this worksheet.</div>
                  ) : (
                    <table className="vpSimpleTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Field Name</th>
                          <th>Shelf / Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAllFields.map((f, i) => (
                          <tr key={`${f.name}-${i}`}>
                            <td>{i + 1}</td>
                            <td>
                              <b>{f.name}</b>
                            </td>
                            <td>
                              <span className="vpPurplePill">{f.role}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Filters */}
              {activeTab === 'filters' && (
                <div className="vpSubCard">
                  <h4>Worksheet Filters ({selected.filters.length})</h4>
                  {selected.filters.length === 0 ? (
                    <div className="vpEmptySmall">No filters configured on this worksheet.</div>
                  ) : (
                    <ul className="vpFilterList">
                      {selected.filters.map((flt, i) => (
                        <li key={i}>
                          <Filter size={14} />
                          <span>{flt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Tab 4: Formatting */}
              {activeTab === 'formatting' && (
                <div className="vpSubCard">
                  <h4>Formatting &amp; Layout Rules</h4>
                  <ul className="vpCheckList">
                    <li>
                      <CheckCircle2 size={15} />
                      <span>Target visual type: {selected.recommendedVisual}</span>
                    </li>
                    <li>
                      <CheckCircle2 size={15} />
                      <span>Safe Mode PBIR schema alignment enabled</span>
                    </li>
                    <li>
                      <CheckCircle2 size={15} />
                      <span>Responsive container padding and axis labels preserved</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Tab 5: Visual JSON */}
              {activeTab === 'json' && (
                <div className="vpSubCard">
                  <div className="vpCardHead vpCardHeadBetween" style={{ marginBottom: 10 }}>
                    <h4>Full Visual JSON Definition</h4>
                    <button type="button" className="vpOutlineBtn" onClick={handleCopyJson}>
                      {copiedJson ? <Check size={14} /> : <Copy size={14} />}
                      {copiedJson ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <div className="vpCodeBox vpCodeBoxTall">
                    <div className="vpCodeGutter">
                      {jsonLines.map((_, idx) => (
                        <span key={idx}>{idx + 1}</span>
                      ))}
                    </div>
                    <pre className="vpCodePre">
                      {jsonLines.map((line, idx) => (
                        <div key={idx}>{renderJsonLine(line)}</div>
                      ))}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 6: Build Notes */}
              {activeTab === 'notes' && (
                <div className="vpSubCard">
                  <h4>Build &amp; Conversion Notes</h4>
                  <div className="vpNoteBox">
                    <Info size={16} />
                    <p>{selected.notes}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
