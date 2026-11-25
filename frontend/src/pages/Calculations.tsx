import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Info,
  Link2,
  BarChart3,
  ArrowRight,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Layers,
  Table2,
} from 'lucide-react';
import { Calculation, MigrationProject } from '../types/project';

type CalcTab = 'compare' | 'details' | 'dependencies' | 'impact' | 'warnings';

function getShortType(c: Calculation) {
  const cls = `${c.classification || ''} ${c.target_object_type || ''}`.toLowerCase();
  if (cls.includes('measure') || cls.includes('aggregat')) return 'Aggregation';
  if (cls.includes('table')) return 'Table Calc';
  return 'Row-level';
}

export default function Calculations({ project }: { project: MigrationProject }) {
  const calcs = project.calculations || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalcTab>('compare');
  const [page, setPage] = useState(1);
  const [copiedSide, setCopiedSide] = useState<'left' | 'right' | null>(null);
  const PAGE_SIZE = 14;

  const calcKey = (c: Calculation, idx?: number) => `${c.datasource || 'wb'}::${c.name}${idx !== undefined ? `::${idx}` : ''}`;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calcs.filter(c => {
      const shortType = getShortType(c);
      if (typeFilter !== 'All' && shortType !== typeFilter) return false;
      if (!q) return true;
      return `${c.name} ${c.datasource || ''} ${c.classification || ''} ${c.formula || ''} ${c.generated_expression || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [calcs, searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedCalcs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, project.project_id]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !filtered.some(c => calcKey(c) === selectedKey)) {
      setSelectedKey(calcKey(filtered[0]));
    }
  }, [filtered, selectedKey]);

  const selected = useMemo(
    () => filtered.find(c => calcKey(c) === selectedKey) || filtered[0] || null,
    [filtered, selectedKey]
  );

  function copyCode(text: string, side: 'left' | 'right') {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 1500);
  }

  if (!calcs.length) {
    return (
      <div className="page">
        <div className="ptEmptyShell">
          <div className="note">No calculated fields were detected in this workbook.</div>
        </div>
      </div>
    );
  }

  const selWarnings = selected ? [...(selected.warnings || []), ...(selected.manual_review_notes || [])] : [];
  const selShortType = selected ? getShortType(selected) : 'Row-level';
  const selConverted = Boolean(selected?.generated_expression && selected.confidence_score >= 0.6);

  return (
    <div className="page">
      <div className="calcSplitLayout">
        {/* LEFT SIDEBAR: CALCULATIONS LIST */}
        <aside className="calcMasterPanel">
          <div className="calcMasterHeader">
            <div className="calcMasterTitle">
              <span className="calcHeaderBadge"><Calculator size={17} /></span>
              <h3>Calculations ({calcs.length})</h3>
            </div>
          </div>

          <div className="calcSearchRow">
            <div className="ptSearchWrap" style={{ flex: 1 }}>
              <Search size={14} className="ptSearchIcon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search calculation (e.g., Pass Fail, Grade Band...)"
              />
            </div>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`calcFilterBtn ${typeFilter !== 'All' ? 'active' : ''}`}
                onClick={() => setShowFilterMenu(s => !s)}
                title="Filter by calculation type"
              >
                <Filter size={15} />
              </button>
              {showFilterMenu && (
                <div className="calcFilterPopover">
                  {['All', 'Row-level', 'Aggregation', 'Table Calc'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={typeFilter === opt ? 'active' : ''}
                      onClick={() => { setTypeFilter(opt); setShowFilterMenu(false); }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="calcTableWrap">
            <table className="calcMasterTable">
              <thead>
                <tr>
                  <th>Calculation Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {pagedCalcs.map((c, idx) => {
                  const key = calcKey(c);
                  const isActive = selected && calcKey(selected) === key;
                  const shortType = getShortType(c);
                  const isAgg = shortType === 'Aggregation';
                  const isGood = c.confidence_score >= 0.8;
                  const hasWarn = (c.warnings?.length || 0) + (c.manual_review_notes?.length || 0) > 0;
                  return (
                    <tr
                      key={calcKey(c, idx)}
                      className={isActive ? 'activeRow' : ''}
                      onClick={() => setSelectedKey(key)}
                    >
                      <td>
                        <div className="calcNameCell">
                          <span className="calcFnGlyph">{isAgg ? 'Σ' : 'fx'}</span>
                          <b title={c.name}>{c.name}</b>
                        </div>
                      </td>
                      <td>
                        <span className={`calcTypePill ${isAgg ? 'purple' : 'blue'}`}>
                          {shortType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="calcConfCell">
                          <span className={`calcConfPill ${isGood ? 'good' : 'warn'}`}>
                            {c.confidence_score.toFixed(2)}
                          </span>
                          {hasWarn && <AlertTriangle size={14} className="calcWarnTri" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!pagedCalcs.length && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      No calculations match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="calcPagination">
            <div className="tdePageControls">
              <button
                type="button"
                className="tdePageBtn"
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  className={`tdePageBtn ${n === safePage ? 'active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="tdePageBtn"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <span className="tdePageSummary">
              {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          </div>
        </aside>

        {/* RIGHT DETAIL PANEL */}
        {selected && (
          <div className="calcDetailPanel">
            <div className="calcDetailHeader">
              <div className="calcDetailTitleGroup">
                <span className="calcFxBadge">{selShortType === 'Aggregation' ? 'Σ' : 'fx'}</span>
                <div>
                  <h2>{selected.name}</h2>
                  <span className="calcDetailSub">
                    Source: <b>{selected.datasource || 'Workbook'}</b>
                    {'  |  '}
                    Type: <b>{selected.classification}</b>
                  </span>
                </div>
              </div>
              <span className={`ptStatusPill ${selConverted ? 'good' : 'warn'}`}>
                {selConverted ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{selConverted ? 'Converted' : 'Review Needed'}</span>
              </span>
            </div>

            <div className="calcTabsRow">
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'compare' ? 'active' : ''}`}
                onClick={() => setActiveTab('compare')}
              >
                <Code2 size={15} />
                <span>Formula Comparison</span>
              </button>
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <Info size={15} />
                <span>Details</span>
              </button>
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'dependencies' ? 'active' : ''}`}
                onClick={() => setActiveTab('dependencies')}
              >
                <Link2 size={15} />
                <span>Dependencies</span>
              </button>
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'impact' ? 'active' : ''}`}
                onClick={() => setActiveTab('impact')}
              >
                <BarChart3 size={15} />
                <span>Impact</span>
              </button>
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'warnings' ? 'active' : ''}`}
                onClick={() => setActiveTab('warnings')}
              >
                <AlertTriangle size={15} />
                <span>Warnings ({selWarnings.length})</span>
              </button>
            </div>

            {/* TAB 1: FORMULA COMPARISON */}
            {activeTab === 'compare' && (
              <>
                <div className="calcCompareRow">
                  <div className="calcCodeCard">
                    <div className="calcCodeHead">
                      <span className="calcBrandDot tableau">✦</span>
                      <b>Original Tableau Formula</b>
                    </div>
                    <div className="calcCodeBox">
                      <pre>{selected.formula || '// Empty formula'}</pre>
                      <button
                        type="button"
                        className="calcCopyBtn"
                        onClick={() => copyCode(selected.formula || '', 'left')}
                        title="Copy Tableau formula"
                      >
                        {copiedSide === 'left' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="calcCompareArrow">
                    <ArrowRight size={18} />
                  </div>

                  <div className="calcCodeCard">
                    <div className="calcCodeHead">
                      <span className="calcBrandDot pbi"><BarChart3 size={13} /></span>
                      <b>Generated DAX / Review Expression</b>
                    </div>
                    <div className="calcCodeBox">
                      <pre>{selected.generated_expression || '// Manual review required'}</pre>
                      <button
                        type="button"
                        className="calcCopyBtn"
                        onClick={() => copyCode(selected.generated_expression || '', 'right')}
                        title="Copy DAX expression"
                      >
                        {copiedSide === 'right' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="calcDetailsBox">
                  <h4>Conversion Details</h4>
                  <div className="calcDetailsGrid">
                    <div className="calcMetaRow">
                      <span className="calcMetaKey"><Table2 size={14} /> Target</span>
                      <span className="calcMetaVal">{selected.target_object_type}</span>
                    </div>
                    <div className="calcMetaRow">
                      <span className="calcMetaKey"><Link2 size={14} /> Dependencies</span>
                      <span className="calcMetaVal">{selected.dependencies.length ? selected.dependencies.join(', ') : 'None'}</span>
                    </div>
                    <div className="calcMetaRow">
                      <span className="calcMetaKey"><BarChart3 size={14} /> Confidence</span>
                      <span className={`calcConfPill ${selected.confidence_score >= 0.8 ? 'good' : 'warn'}`}>
                        {selected.confidence_score.toFixed(2)} ({Math.round(selected.confidence_score * 100)}%)
                      </span>
                    </div>
                    <div className="calcMetaRow">
                      <span className="calcMetaKey"><Layers size={14} /> Classification</span>
                      <span className="calcMetaVal">{selected.classification}</span>
                    </div>
                  </div>
                </div>

                {selWarnings.length === 0 && selConverted ? (
                  <div className="calcStatusBanner good">
                    <CheckCircle2 size={17} />
                    <span><b>Calculation converted successfully.</b> No warnings detected.</span>
                  </div>
                ) : (
                  <div className="calcStatusBanner warn">
                    <AlertTriangle size={17} />
                    <div>
                      <b>Review notes / warnings:</b>
                      <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                        {selWarnings.length ? selWarnings.map((w, i) => <li key={i}>{w}</li>) : <li>Manual DAX verification recommended.</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: DETAILS */}
            {activeTab === 'details' && (
              <div className="ptSourceGrid">
                <div><span>Calculation Name</span><b>{selected.name}</b></div>
                <div><span>Datasource</span><b>{selected.datasource || 'Workbook'}</b></div>
                <div><span>Target Object Type</span><b>{selected.target_object_type}</b></div>
                <div><span>Return Type</span><b>{selected.return_type || 'Auto'}</b></div>
                <div><span>Classification</span><b>{selected.classification}</b></div>
                <div><span>Confidence Score</span><b>{Math.round(selected.confidence_score * 100)}%</b></div>
              </div>
            )}

            {/* TAB 3: DEPENDENCIES */}
            {activeTab === 'dependencies' && (
              <div className="calcChipSection">
                <h4>Upstream Field Dependencies ({selected.dependencies.length})</h4>
                {selected.dependencies.length ? (
                  <div className="relColsChips">
                    {selected.dependencies.map((d, i) => (
                      <span className="relColTag" key={`${d}-${i}`}><Link2 size={12} /> {d}</span>
                    ))}
                  </div>
                ) : (
                  <div className="note" style={{ marginTop: 0 }}>No upstream field dependencies detected.</div>
                )}
              </div>
            )}

            {/* TAB 4: IMPACT */}
            {activeTab === 'impact' && (
              <div className="calcChipSection">
                <h4>Used In Worksheets / Visuals ({selected.used_in.length})</h4>
                {selected.used_in.length ? (
                  <div className="relColsChips">
                    {selected.used_in.map((u, i) => (
                      <span className="relColTag measure" key={`${u}-${i}`}><BarChart3 size={12} /> {u}</span>
                    ))}
                  </div>
                ) : (
                  <div className="note" style={{ marginTop: 0 }}>Not directly referenced in any worksheet or visual.</div>
                )}
              </div>
            )}

            {/* TAB 5: WARNINGS */}
            {activeTab === 'warnings' && (
              <div className="calcChipSection">
                <h4>Warnings & Manual Review Notes ({selWarnings.length})</h4>
                {selWarnings.length ? (
                  selWarnings.map((w, i) => <div className="warn" key={i}>{w}</div>)
                ) : (
                  <div className="calcStatusBanner good">
                    <CheckCircle2 size={17} />
                    <span>No warnings or manual review notes for <b>{selected.name}</b>.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
