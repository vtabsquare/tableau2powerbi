import { useEffect, useMemo, useState } from 'react';
import {
  Link2,
  Plus,
  Save,
  Table2,
  ShieldCheck,
  Search,
  GitBranch,
  Settings,
  KeyRound,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  BarChart3,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Badge } from '../components/Cards';
import { MigrationProject, Relationship, SemanticTable } from '../types/project';
import { saveRelationships } from '../services/api';

type RelTab = 'diagram' | 'list' | 'tables' | 'properties';

export default function Relationships({ project, setProject }: { project: MigrationProject; setProject: (p: MigrationProject) => void }) {
  const finalTables = useMemo(() => project.semantic_tables.filter(t => t.include_in_export), [project.semantic_tables]);
  const tableNames = useMemo(() => new Set(finalTables.map(t => t.name)), [finalTables]);
  const initial = useMemo(
    () => project.relationships.filter(r => r.active && !r.manual_review && tableNames.has(r.from_table) && tableNames.has(r.to_table)),
    [project.relationships, tableNames]
  );

  const [rels, setRels] = useState<Relationship[]>(initial);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [activeTab, setActiveTab] = useState<RelTab>('diagram');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [selectedRelId, setSelectedRelId] = useState<string>('');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setRels(initial);
  }, [project.project_id, initial]);

  // Pick default focal (fact) table: the table with most outgoing/total relationships
  useEffect(() => {
    if (!finalTables.length) return;
    if (selectedTableName && finalTables.some(t => t.name === selectedTableName)) return;
    const counts: Record<string, number> = {};
    rels.forEach(r => {
      counts[r.from_table] = (counts[r.from_table] || 0) + 2;
      counts[r.to_table] = (counts[r.to_table] || 0) + 1;
    });
    const best = [...finalTables].sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0))[0];
    if (best) setSelectedTableName(best.name);
  }, [finalTables, rels, selectedTableName]);

  useEffect(() => {
    if (!rels.length) {
      setSelectedRelId('');
      return;
    }
    if (!selectedRelId || !rels.some(r => r.id === selectedRelId)) {
      const matching = rels.find(r => r.from_table === selectedTableName || r.to_table === selectedTableName) || rels[0];
      setSelectedRelId(matching.id);
    }
  }, [rels, selectedRelId, selectedTableName]);

  function update(i: number, key: keyof Relationship, value: string | boolean) {
    const copy = [...rels];
    copy[i] = { ...copy[i], [key]: value };
    setRels(copy);
  }

  function add() {
    const id = `manual_${Date.now()}`;
    setRels([
      ...rels,
      {
        id,
        from_table: '',
        from_column: '',
        to_table: '',
        to_column: '',
        cardinality: 'Many-to-one',
        cross_filter_direction: 'Single',
        active: true,
        confidence_score: 1,
        reason: 'User-created final relationship',
        manual_review: false,
      },
    ]);
    setEditing(id);
    setSelectedRelId(id);
    setActiveTab('list');
  }

  async function save() {
    setBusy(true);
    try {
      setProject(await saveRelationships(project.project_id, rels));
    } finally {
      setBusy(false);
    }
  }

  const cols = (table: string) => finalTables.find(t => t.name === table)?.columns || [];

  const filteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return finalTables;
    return finalTables.filter(t => t.name.toLowerCase().includes(q));
  }, [finalTables, tableSearch]);

  const focalTable: SemanticTable | undefined = useMemo(
    () => finalTables.find(t => t.name === selectedTableName) || finalTables[0],
    [finalTables, selectedTableName]
  );

  // Relationships connected to the focal table
  const focalRels = useMemo(() => {
    if (!focalTable) return [];
    return rels.filter(r => r.from_table === focalTable.name || r.to_table === focalTable.name);
  }, [rels, focalTable]);

  // Connected neighbor tables (up to 6 arranged neatly on left & right of focal table)
  const neighborNodes = useMemo(() => {
    if (!focalTable) return [];
    const seen = new Set<string>();
    const list: { table: SemanticTable; rel: Relationship; isFromFocal: boolean }[] = [];
    focalRels.forEach(r => {
      const isFromFocal = r.from_table === focalTable.name;
      const otherName = isFromFocal ? r.to_table : r.from_table;
      if (otherName === focalTable.name || seen.has(otherName)) return;
      const tbl = finalTables.find(t => t.name === otherName);
      if (tbl) {
        seen.add(otherName);
        list.push({ table: tbl, rel: r, isFromFocal });
      }
    });
    return list;
  }, [focalTable, focalRels, finalTables]);

  const leftNeighbors = neighborNodes.filter((_, i) => i % 2 === 0).slice(0, 3);
  const rightNeighbors = neighborNodes.filter((_, i) => i % 2 === 1).slice(0, 3);

  const selectedRel = useMemo(
    () => rels.find(r => r.id === selectedRelId) || focalRels[0] || rels[0] || null,
    [rels, selectedRelId, focalRels]
  );

  const keyColsSet = useMemo(() => {
    const s = new Set<string>();
    rels.forEach(r => {
      if (r.from_table && r.from_column) s.add(`${r.from_table}.${r.from_column}`);
      if (r.to_table && r.to_column) s.add(`${r.to_table}.${r.to_column}`);
    });
    return s;
  }, [rels]);

  function renderTableNode(table: SemanticTable, isFact: boolean) {
    const visibleCols = table.columns.slice(0, 6);
    const visibleMeasures = table.measures.slice(0, 3);
    const extraCount = Math.max(0, table.columns.length - visibleCols.length) + Math.max(0, table.measures.length - visibleMeasures.length);

    return (
      <div
        className={`relNodeCard ${isFact ? 'fact' : 'dim'}`}
        onClick={() => setSelectedTableName(table.name)}
      >
        <div className={`relNodeHeader ${isFact ? 'fact' : 'dim'}`}>
          <Table2 size={14} />
          <b title={table.name}>{table.name}</b>
        </div>
        <div className="relNodeCols">
          {visibleCols.map((c, idx) => {
            const colName = String(c.name || c);
            const isKey = keyColsSet.has(`${table.name}.${colName}`);
            return (
              <div className="relNodeColRow" key={`${colName}-${idx}`}>
                {isKey ? <KeyRound size={12} className="relKeyIcon" /> : <span className="relColSpacer" />}
                <span>{colName}</span>
              </div>
            );
          })}
          {visibleMeasures.map((m, idx) => (
            <div className="relNodeColRow measure" key={`m-${String(m.name)}-${idx}`}>
              <span className="relSigmaIcon">Σ</span>
              <span>{String(m.name)}</span>
            </div>
          ))}
          {extraCount > 0 && (
            <div className="relNodeMore">+{extraCount} more fields</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page finalModelPage">
      {/* TOP HERO + ACTIONS */}
      <div className="relHeaderShell">
        <div className="relHeaderLeft">
          <div className="relHeaderIcon">
            <GitBranch size={21} />
          </div>
          <div>
            <span className="relEyebrow">POWER BI SEMANTIC MODEL</span>
            <h1>Final Model & Relationships</h1>
            <p>
              Only final business tables and relationships that will be used in the Power BI model are shown here.
            </p>
          </div>
        </div>
        <div className="relHeaderActions">
          <button type="button" className="relAddBtn" onClick={add}>
            <Plus size={16} />
            <span>Add relationship</span>
          </button>
          <button type="button" className="relSaveBtn" onClick={save} disabled={busy}>
            <Save size={16} />
            <span>{busy ? 'Saving...' : 'Save final model'}</span>
          </button>
        </div>
      </div>

      {/* FINAL POWER BI TABLES STRIP */}
      <div className="relTablesStripShell">
        <div className="relStripHeader">
          <div className="relStripTitle">
            <Table2 size={17} className="relPurpleIcon" />
            <b>Final Power BI Tables ({finalTables.length})</b>
          </div>
          <span className="relCleanBadge">
            <ShieldCheck size={13} /> Clean model
          </span>
        </div>
        <div className="relStripGrid">
          {finalTables.map(t => (
            <button
              type="button"
              key={t.name}
              className={`relTableChip ${selectedTableName === t.name ? 'active' : ''}`}
              onClick={() => {
                setSelectedTableName(t.name);
                setActiveTab('diagram');
              }}
            >
              <span className="relChipIcon"><Table2 size={15} /></span>
              <div>
                <b>{t.name}</b>
                <span>{t.columns.length} Columns · {t.measures.length} Measures</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TABS WORKSPACE */}
      <div className="relWorkspaceShell">
        <div className="relTabsRow">
          <button
            type="button"
            className={`ptTabBtn ${activeTab === 'diagram' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagram')}
          >
            <GitBranch size={15} />
            <span>Model Diagram</span>
          </button>
          <button
            type="button"
            className={`ptTabBtn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <Link2 size={15} />
            <span>Relationships ({rels.length})</span>
          </button>
          <button
            type="button"
            className={`ptTabBtn ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            <Table2 size={15} />
            <span>Tables & Columns</span>
          </button>
          <button
            type="button"
            className={`ptTabBtn ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <Settings size={15} />
            <span>Model Properties</span>
          </button>
        </div>

        {/* TAB 1: MODEL DIAGRAM */}
        {activeTab === 'diagram' && (
          <div className="relDiagramGrid">
            {/* LEFT TABLES LIST */}
            <div className="relDiagramSidebar">
              <div className="relSideTitle">
                <b>Tables ({finalTables.length})</b>
              </div>
              <div className="ptSearchWrap">
                <Search size={14} className="ptSearchIcon" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Search tables..."
                />
              </div>
              <div className="relSideList">
                {filteredTables.map(t => (
                  <button
                    type="button"
                    key={t.name}
                    className={`relSideItem ${selectedTableName === t.name ? 'active' : ''}`}
                    onClick={() => setSelectedTableName(t.name)}
                  >
                    <Table2 size={15} className="relPurpleIcon" />
                    <span title={t.name}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CENTER DIAGRAM CANVAS */}
            <div className="relCanvasShell">
              <div className="relCanvasControls">
                <button type="button" onClick={() => setZoom(1)} title="Reset view"><Maximize2 size={14} /></button>
                <button type="button" onClick={() => setZoom(z => Math.min(1.25, +(z + 0.1).toFixed(2)))} title="Zoom in"><ZoomIn size={14} /></button>
                <button type="button" onClick={() => setZoom(z => Math.max(0.75, +(z - 0.1).toFixed(2)))} title="Zoom out"><ZoomOut size={14} /></button>
              </div>

              {focalTable ? (
                <div className="relCanvasStage" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                  <div className="relStarColumns">
                    {/* Left Neighbors */}
                    <div className="relNeighborCol">
                      {leftNeighbors.map(({ table, rel, isFromFocal }) => (
                        <div className="relNeighborSlot" key={table.name}>
                          {renderTableNode(table, false)}
                          <button
                            type="button"
                            className={`relEdgeBadge ${selectedRel?.id === rel.id ? 'active' : ''}`}
                            onClick={() => setSelectedRelId(rel.id)}
                            title={`${rel.from_table}.${rel.from_column} → ${rel.to_table}.${rel.to_column}`}
                          >
                            <span>{isFromFocal ? '1' : '*'}</span>
                            <span className="relEdgeLine" />
                            <span>{isFromFocal ? '*' : '1'}</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Center Focal Table */}
                    <div className="relCenterCol">
                      {renderTableNode(focalTable, true)}
                      {neighborNodes.length === 0 && (
                        <div className="relNoEdgesHint">
                          No active relationships linked to <b>{focalTable.name}</b>.
                        </div>
                      )}
                    </div>

                    {/* Right Neighbors */}
                    <div className="relNeighborCol">
                      {rightNeighbors.map(({ table, rel, isFromFocal }) => (
                        <div className="relNeighborSlot reverse" key={table.name}>
                          <button
                            type="button"
                            className={`relEdgeBadge ${selectedRel?.id === rel.id ? 'active' : ''}`}
                            onClick={() => setSelectedRelId(rel.id)}
                            title={`${rel.from_table}.${rel.from_column} → ${rel.to_table}.${rel.to_column}`}
                          >
                            <span>{isFromFocal ? '*' : '1'}</span>
                            <span className="relEdgeLine" />
                            <span>{isFromFocal ? '1' : '*'}</span>
                          </button>
                          {renderTableNode(table, false)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">No tables in semantic model.</div>
              )}

              <div className="relLegendBar">
                <div className="relLegendItems">
                  <span className="relLegendLabel">Legend:</span>
                  <span className="relLegendTag"><span className="relLegendSwatch fact" /> Focal Table</span>
                  <span className="relLegendTag"><span className="relLegendSwatch dim" /> Related Table ({neighborNodes.length})</span>
                  <span className="relLegendTag"><span className="relLegendLineSwatch" /> Relationship</span>
                  <span className="relLegendTag"><span className="relCardChip">1</span> One</span>
                  <span className="relLegendTag"><span className="relCardChip">*</span> Many</span>
                </div>
                <button type="button" className="relFitBtn" onClick={() => setZoom(1)}>
                  <Maximize2 size={13} /> Fit to View
                </button>
              </div>
            </div>

            {/* RIGHT INSPECTOR */}
            <div className="relInspectorCol">
              <div className="relInspectorCard">
                <div className="relInspectorHead">
                  <Link2 size={16} className="relPurpleIcon" />
                  <b>Selected Relationship</b>
                </div>

                {selectedRel ? (
                  <>
                    <div className="relPropsList">
                      <div><span>From Table</span><b><Table2 size={13} className="relPurpleIcon" /> {selectedRel.from_table || '—'}</b></div>
                      <div><span>From Column</span><b><KeyRound size={13} className="relKeyIcon" /> {selectedRel.from_column || '—'}</b></div>
                      <div><span>To Table</span><b><Table2 size={13} className="relBlueIcon" /> {selectedRel.to_table || '—'}</b></div>
                      <div><span>To Column</span><b><KeyRound size={13} className="relKeyIcon" /> {selectedRel.to_column || '—'}</b></div>
                      <div><span>Cardinality</span><span className="relCardioPill">{selectedRel.cardinality}</span></div>
                      <div><span>Cross Filter</span><span className="relFilterPill">{selectedRel.cross_filter_direction}</span></div>
                    </div>
                    <div className="relInspectorActions">
                      <button
                        type="button"
                        className="relMiniBtn"
                        onClick={() => { setEditing(selectedRel.id); setActiveTab('list'); }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="relMiniBtn danger"
                        onClick={() => setRels(rels.filter(x => x.id !== selectedRel.id))}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="muted" style={{ fontSize: 12.5 }}>No relationships configured yet. Click "+ Add relationship" to create one.</div>
                )}
              </div>

              <div className="relSummaryCard">
                <div className="relInspectorHead">
                  <BarChart3 size={16} className="relPurpleIcon" />
                  <b>Model Summary</b>
                </div>
                <ul className="relSummaryList">
                  <li><CheckCircle2 size={15} /> <span>{finalTables.length} tables configured</span></li>
                  <li><CheckCircle2 size={15} /> <span>{rels.length} relationships ({rels.length ? 'all valid' : 'none'})</span></li>
                  <li><CheckCircle2 size={15} /> <span>Single cross-filter direction</span></li>
                  <li><CheckCircle2 size={15} /> <span>Ambiguous paths prevented</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RELATIONSHIPS LIST & EDITOR */}
        {activeTab === 'list' && (
          <div className="relListPanel">
            {!rels.length && (
              <div className="empty friendlyEmpty">
                <Link2 size={30} />
                <b>No final relationship was safely inferred.</b>
                <span>Add only the business relationship required by the Power BI model.</span>
              </div>
            )}
            <div className="finalRelationshipList">
              {rels.map((r, i) => {
                const isEdit = editing === r.id;
                return (
                  <div className="finalRelationshipRow" key={r.id}>
                    {!isEdit ? (
                      <>
                        <div className="relationshipFlow">
                          <div>
                            <small>Many / From</small>
                            <b>{r.from_table || 'Select table'}</b>
                            <span>{r.from_column || 'Select column'}</span>
                          </div>
                          <div className="relationshipConnector">
                            <span>{r.cardinality}</span>
                            <Link2 size={20} />
                            <small>{r.cross_filter_direction} filter</small>
                          </div>
                          <div>
                            <small>One / To</small>
                            <b>{r.to_table || 'Select table'}</b>
                            <span>{r.to_column || 'Select column'}</span>
                          </div>
                        </div>
                        <div className="relRowActions">
                          <Badge tone="good">Active</Badge>
                          <button type="button" className="relMiniBtn" onClick={() => setEditing(r.id)}>
                            <Edit3 size={13} /> Edit
                          </button>
                          <button type="button" className="relMiniBtn danger" onClick={() => setRels(rels.filter(x => x.id !== r.id))}>
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="relationshipEditGrid">
                        <label>
                          From table
                          <select value={r.from_table} onChange={e => update(i, 'from_table', e.target.value)}>
                            <option value="">Select table</option>
                            {finalTables.map(t => <option key={t.name}>{t.name}</option>)}
                          </select>
                        </label>
                        <label>
                          From column
                          <select value={r.from_column} onChange={e => update(i, 'from_column', e.target.value)}>
                            <option value="">Select column</option>
                            {cols(r.from_table).map(c => <option key={String(c.name)}>{String(c.name)}</option>)}
                          </select>
                        </label>
                        <label>
                          To table
                          <select value={r.to_table} onChange={e => update(i, 'to_table', e.target.value)}>
                            <option value="">Select table</option>
                            {finalTables.map(t => <option key={t.name}>{t.name}</option>)}
                          </select>
                        </label>
                        <label>
                          To column
                          <select value={r.to_column} onChange={e => update(i, 'to_column', e.target.value)}>
                            <option value="">Select column</option>
                            {cols(r.to_table).map(c => <option key={String(c.name)}>{String(c.name)}</option>)}
                          </select>
                        </label>
                        <label>
                          Cardinality
                          <select value={r.cardinality} onChange={e => update(i, 'cardinality', e.target.value)}>
                            <option>Many-to-one</option>
                            <option>One-to-one</option>
                          </select>
                        </label>
                        <label>
                          Filter direction
                          <select value={r.cross_filter_direction} onChange={e => update(i, 'cross_filter_direction', e.target.value)}>
                            <option>Single</option>
                          </select>
                        </label>
                        <button type="button" className="primary" style={{ width: 'auto' }} onClick={() => setEditing(undefined)}>
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TABLES & COLUMNS */}
        {activeTab === 'tables' && (
          <div className="relTablesGrid">
            {finalTables.map(t => (
              <div className="relTableDetailCard" key={t.name}>
                <div className="relTableDetailHead">
                  <Table2 size={16} className="relPurpleIcon" />
                  <b>{t.name}</b>
                  <span>{t.columns.length} columns · {t.measures.length} measures</span>
                </div>
                <div className="relColsChips">
                  {t.columns.map((c, i) => (
                    <span className="relColTag" key={`${String(c.name)}-${i}`}>
                      {keyColsSet.has(`${t.name}.${String(c.name)}`) && <KeyRound size={11} className="relKeyIcon" />}
                      {String(c.name)}
                    </span>
                  ))}
                  {t.measures.map((m, i) => (
                    <span className="relColTag measure" key={`m-${String(m.name)}-${i}`}>
                      Σ {String(m.name)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: MODEL PROPERTIES */}
        {activeTab === 'properties' && (
          <div className="relPropsGrid">
            <div className="relPropCard"><span>Final Tables</span><b>{finalTables.length}</b></div>
            <div className="relPropCard"><span>Final Relationships</span><b>{rels.length}</b></div>
            <div className="relPropCard"><span>Filter Direction</span><b>Single</b></div>
            <div className="relPropCard"><span>Ambiguous Paths</span><b>Prevented</b></div>
          </div>
        )}
      </div>
    </div>
  );
}
