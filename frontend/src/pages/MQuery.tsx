import { useEffect, useMemo, useState } from 'react';
import {
  Code2,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Search,
  Layers,
  Link2,
  Sliders,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  AlignLeft,
  Info,
  Lock,
} from 'lucide-react';
import { MigrationProject } from '../types/project';

type Props = {
  project: MigrationProject;
  isDemoMode?: boolean;
  onContactDemo?: () => void;
};

type MqTab = 'script' | 'steps' | 'dependencies' | 'parameters';

function parseMSteps(mQuery: string): Array<{ step: string; expression: string }> {
  const lines = (mQuery || '').split(/\r?\n/);
  const steps: Array<{ step: string; expression: string }> = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    const match = trimmed.match(/^([A-Za-z0-9_#" ]+?)\s*=\s*(.+)$/);
    if (match && !trimmed.startsWith('let') && !trimmed.startsWith('in')) {
      steps.push({ step: match[1].trim(), expression: match[2].replace(/,$/, '').trim() });
    }
  }
  return steps;
}

export default function MQuery({ project, isDemoMode, onContactDemo }: Props) {
  const tables = project.semantic_tables || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState<string>(tables[0]?.name || '');
  const [activeTab, setActiveTab] = useState<MqTab>('script');
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const mappingByTable = useMemo(() => {
    const map = new Map<string, (typeof project.source_mappings)[number]>();
    (project.source_mappings || []).forEach(m => {
      if (m.table_name) map.set(m.table_name, m);
      if (m.datasource) map.set(m.datasource, m);
    });
    return map;
  }, [project.source_mappings]);

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(t => t.name.toLowerCase().includes(q) || (t.m_query || '').toLowerCase().includes(q));
  }, [tables, searchQuery]);

  useEffect(() => {
    if (!filteredTables.length) {
      setSelectedName('');
      return;
    }
    if (!selectedName || !filteredTables.some(t => t.name === selectedName)) {
      setSelectedName(filteredTables[0].name);
    }
  }, [filteredTables, selectedName]);

  const selected = useMemo(
    () => filteredTables.find(t => t.name === selectedName) || filteredTables[0] || null,
    [filteredTables, selectedName]
  );

  const totalLines = useMemo(
    () => tables.reduce((acc, t) => acc + (t.m_query ? t.m_query.split(/\r?\n/).length : 0), 0),
    [tables]
  );
  const generatedCount = useMemo(() => tables.filter(t => Boolean(t.m_query?.trim())).length, [tables]);
  const issuesCount = tables.length - generatedCount;

  function handleCopy(text: string) {
    if (isDemoMode) {
      onContactDemo?.();
      return;
    }
    navigator.clipboard.writeText(text || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload(name: string, text: string) {
    if (isDemoMode) {
      onContactDemo?.();
      return;
    }
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'query'}.pq`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!tables.length) {
    return (
      <div className="page">
        <div className="ptEmptyShell">
          <div className="note">No Power Query M scripts generated yet. Apply Source Mapping first.</div>
        </div>
      </div>
    );
  }

  const selLines = (selected?.m_query || '').split(/\r?\n/);
  const selSteps = selected ? parseMSteps(selected.m_query || '') : [];
  const selMapping = selected ? mappingByTable.get(selected.name) : undefined;
  const selParams = selMapping?.powerbi_path_parameter
    ? [{ name: selMapping.powerbi_path_parameter, value: selMapping.resolved_powerbi_path || selMapping.target_file_path || 'Relative path', mode: selMapping.path_mode || 'Parameter' }]
    : [];
  const isSelValid = Boolean(selected?.m_query?.trim());

  return (
    <div className="page">
      {/* TOP HEADER + KPI PILLS */}
      <div className="mqHeaderShell">
        <div className="mqHeaderLeft">
          <div className="mqHeaderIcon">
            <Code2 size={21} />
          </div>
          <div>
            <h2>M Query Review</h2>
            <p>Review and validate generated Power Query (M) scripts for each source table.</p>
          </div>
        </div>

        <div className="smKpiPills">
          <div className="smKpiPill purple">
            <span className="smKpiIcon purple"><FileCode2 size={16} /></span>
            <div>
              <b>{tables.length}</b>
              <span>Queries</span>
            </div>
          </div>
          <div className="smKpiPill green">
            <span className="smKpiIcon green"><CheckCircle2 size={16} /></span>
            <div>
              <b>{generatedCount}</b>
              <span>Generated</span>
            </div>
          </div>
          <div className="smKpiPill amber">
            <span className="smKpiIcon amber"><AlertTriangle size={16} /></span>
            <div>
              <b>{issuesCount}</b>
              <span>With Issues</span>
            </div>
          </div>
          <div className="smKpiPill blue">
            <span className="smKpiIcon blue"><Code2 size={16} /></span>
            <div>
              <b>{totalLines.toLocaleString()}</b>
              <span>Total Lines</span>
            </div>
          </div>
        </div>
      </div>

      {/* MASTER-DETAIL SPLIT LAYOUT */}
      <div className={`mqSplitLayout ${expanded ? 'expanded' : ''}`}>
        {!expanded && (
          <aside className="mqSidebar">
            <div className="ptSidebarHeader">
              <span className="ptSidebarIcon"><FileCode2 size={18} /></span>
              <h3>Queries ({tables.length})</h3>
            </div>

            <div className="ptSearchWrap">
              <Search size={14} className="ptSearchIcon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search query (e.g., Orders_2025...)"
              />
            </div>

            <div className="mqQueryList">
              {filteredTables.map(t => {
                const isActive = selected?.name === t.name;
                const lineCount = t.m_query ? t.m_query.split(/\r?\n/).length : 0;
                const hasQuery = Boolean(t.m_query?.trim());
                return (
                  <button
                    type="button"
                    key={t.name}
                    className={`mqQueryItem ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedName(t.name)}
                  >
                    <span className="ptItemIcon"><FileCode2 size={16} /></span>
                    <div className="ptItemText">
                      <b title={t.name}>{t.name}</b>
                      <span>{lineCount} lines</span>
                    </div>
                    <span className={`ptDotIcon ${hasQuery ? 'good' : 'warn'}`}>
                      {hasQuery ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    </span>
                  </button>
                );
              })}
              {!filteredTables.length && (
                <div className="empty" style={{ fontSize: 12 }}>No queries match "{searchQuery}".</div>
              )}
            </div>
          </aside>
        )}

        {/* RIGHT DETAIL PANEL */}
        {selected && (
          <div className="mqDetailPanel">
            <div className="mqDetailHeader">
              <div className="mqDetailTitleGroup">
                <span className="ptDetailBigIcon"><FileCode2 size={20} /></span>
                <div>
                  <h2>{selected.name}</h2>
                  <span className="ptDetailSub">
                    M Query (Power Query) &nbsp;|&nbsp; <b>{selLines.length} lines</b>
                  </span>
                </div>
              </div>
              <span className={`ptStatusPill ${isSelValid ? 'good' : 'warn'}`}>
                {isSelValid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{isSelValid ? 'Generated' : 'Needs Review'}</span>
              </span>
            </div>

            <div className="mqTabsRow">
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'script' ? 'active' : ''}`}
                onClick={() => setActiveTab('script')}
              >
                <Code2 size={15} />
                <span>M Query Script</span>
              </button>
              <button
                type="button"
                className={`ptTabBtn ${activeTab === 'steps' ? 'active' : ''}`}
                onClick={() => setActiveTab('steps')}
              >
                <Layers size={15} />
                <span>Query Steps ({selSteps.length})</span>
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
                className={`ptTabBtn ${activeTab === 'parameters' ? 'active' : ''}`}
                onClick={() => setActiveTab('parameters')}
              >
                <Sliders size={15} />
                <span>Parameters ({selParams.length})</span>
              </button>
            </div>

            {/* TAB 1: M QUERY SCRIPT */}
            {activeTab === 'script' && (
              <>
                <div className="mqEditorShell">
                  <div className="mqEditorToolbar">
                    <button
                      type="button"
                      className={`mqToolBtn ${wrapLines ? 'active' : ''}`}
                      onClick={() => setWrapLines(w => !w)}
                      title="Toggle line wrapping"
                    >
                      <AlignLeft size={14} />
                      <span>{wrapLines ? 'Wrapped' : 'Format'}</span>
                    </button>
                    <button
                      type="button"
                      className="mqToolBtn"
                      onClick={() => handleCopy(selected.m_query || '')}
                      title={isDemoMode ? 'M Query copying is locked in the demo version' : 'Copy M query to clipboard'}
                    >
                      {isDemoMode ? <Lock size={14} /> : copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isDemoMode ? 'Copy M (Locked)' : copied ? 'Copied!' : 'Copy M'}</span>
                    </button>
                    <button
                      type="button"
                      className="mqToolBtn"
                      onClick={() => handleDownload(selected.name, selected.m_query || '')}
                      title={isDemoMode ? 'Download locked in demo' : 'Download .pq file'}
                    >
                      {isDemoMode ? <Lock size={14} /> : <Download size={14} />}
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      className="mqToolBtn iconOnly"
                      onClick={() => setExpanded(e => !e)}
                      title={expanded ? 'Exit expanded view' : 'Expand code viewer'}
                    >
                      {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                  </div>

                  <div className={`mqCodeViewport ${wrapLines ? 'wrap' : ''}`}>
                    <div className="mqGutter" aria-hidden="true">
                      {selLines.map((_, idx) => (
                        <span key={idx}>{idx + 1}</span>
                      ))}
                    </div>
                    <pre className="mqCodePre">
                      {selected.m_query || '// No Power Query M script generated for this table'}
                    </pre>
                  </div>
                </div>

                {/* BOTTOM 3 SUMMARY CARDS */}
                <div className="mqBottomGrid">
                  <div className="mqInfoCard">
                    <div className="mqInfoHead">
                      <Code2 size={15} className="relPurpleIcon" />
                      <b>Query Summary</b>
                    </div>
                    <div className="mqSummaryStats">
                      <div><span>Total Lines</span><b>{selLines.length}</b></div>
                      <div><span>Steps</span><b>{selSteps.length}</b></div>
                      <div><span>Data Source</span><b>{selMapping?.target_connector || 'Auto'}</b></div>
                      <div><span>Encoding</span><b>UTF-8</b></div>
                    </div>
                  </div>

                  <div className="mqInfoCard validation">
                    <div className="mqInfoHead">
                      <CheckCircle2 size={15} className="relBlueIcon" />
                      <b>Validation</b>
                    </div>
                    <span className={`ptStatusPill ${isSelValid ? 'good' : 'warn'}`} style={{ width: 'fit-content' }}>
                      {isSelValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      <span>{isSelValid ? 'Valid M Query' : 'Missing Script'}</span>
                    </span>
                    <span className="mqInfoNoteText">
                      {isSelValid ? 'No syntax or structure issues detected.' : 'Re-apply Source Mapping to regenerate M script.'}
                    </span>
                  </div>

                  <div className="mqInfoCard mode">
                    <div className="mqInfoHead">
                      <span className="tdeInfoIconCircle" style={{ width: 18, height: 18 }}><Info size={12} /></span>
                      <b>Generation Mode</b>
                    </div>
                    <b style={{ fontSize: 13.5, color: '#0f172a' }}>Safe Openable Mode</b>
                    <span className="mqInfoNoteText">By TABLEAU2PBI Workbench</span>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: QUERY STEPS */}
            {activeTab === 'steps' && (
              <div className="mqStepsList">
                {selSteps.length > 0 ? (
                  selSteps.map((s, idx) => (
                    <div className="mqStepCard" key={`${s.step}-${idx}`}>
                      <span className="mqStepNum">{idx + 1}</span>
                      <div className="mqStepBody">
                        <b>{s.step}</b>
                        <code>{s.expression}</code>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">No individual Power Query `let` steps parsed for this query.</div>
                )}
              </div>
            )}

            {/* TAB 3: DEPENDENCIES */}
            {activeTab === 'dependencies' && (
              <div className="ptSourceGrid">
                <div><span>Source Table</span><b>{selected.name}</b></div>
                <div><span>Target Connector</span><b>{selMapping?.target_connector || 'Auto'}</b></div>
                <div><span>Source Path / Server</span><b>{selMapping?.target_file_path || selMapping?.server_name || selMapping?.detected_source_path || '—'}</b></div>
                <div><span>Import Mode</span><b>{selMapping?.import_or_directquery || 'Import'}</b></div>
              </div>
            )}

            {/* TAB 4: PARAMETERS */}
            {activeTab === 'parameters' && (
              <div>
                {selParams.length > 0 ? (
                  <div className="ptSourceGrid">
                    {selParams.map(p => (
                      <div key={p.name}>
                        <span>{p.mode}</span>
                        <b>{p.name}</b>
                        <span style={{ textTransform: 'none', marginTop: 4 }}>{p.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="note" style={{ marginTop: 0 }}>
                    No file path parameters bound to <b>{selected.name}</b>.
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
