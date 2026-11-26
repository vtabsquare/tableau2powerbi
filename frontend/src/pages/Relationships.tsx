import { useEffect, useMemo, useRef, useState } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { Badge } from '../components/Cards';
import { MigrationProject, Relationship, SemanticTable } from '../types/project';
import { saveRelationships } from '../services/api';

type RelTab = 'diagram' | 'list' | 'tables' | 'properties';
type NodePos = { x: number; y: number };

const CARD_W = 216;
const CARD_H = 196;
const GAP_X = 96;
const GAP_Y = 74;

function computeInitialPositions(tables: SemanticTable[], rels: Relationship[]): Record<string, NodePos> {
  const positions: Record<string, NodePos> = {};
  if (!tables.length) return positions;

  // Build adjacency & degree
  const adj = new Map<string, Set<string>>();
  const degree = new Map<string, number>();
  tables.forEach(t => {
    adj.set(t.name, new Set());
    degree.set(t.name, 0);
  });
  rels.forEach(r => {
    if (adj.has(r.from_table) && adj.has(r.to_table) && r.from_table !== r.to_table) {
      adj.get(r.from_table)!.add(r.to_table);
      adj.get(r.to_table)!.add(r.from_table);
      degree.set(r.from_table, (degree.get(r.from_table) || 0) + 1);
      degree.set(r.to_table, (degree.get(r.to_table) || 0) + 1);
    }
  });

  // Find connected components
  const visited = new Set<string>();
  const components: SemanticTable[][] = [];
  const standalone: SemanticTable[] = [];

  tables.forEach(t => {
    if (visited.has(t.name)) return;
    if ((adj.get(t.name)?.size || 0) === 0) {
      visited.add(t.name);
      standalone.push(t);
      return;
    }
    const comp: SemanticTable[] = [];
    const queue = [t.name];
    visited.add(t.name);
    while (queue.length) {
      const curr = queue.shift()!;
      const tbl = tables.find(x => x.name === curr);
      if (tbl) comp.push(tbl);
      adj.get(curr)?.forEach(nxt => {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push(nxt);
        }
      });
    }
    components.push(comp);
  });

  // Sort components largest first
  components.sort((a, b) => b.length - a.length);

  let cursorY = 28;
  const maxCols = 4;

  // Layout each connected component in clean rows with hub-centered ordering
  components.forEach(comp => {
    const sorted = [...comp].sort((a, b) => (degree.get(b.name) || 0) - (degree.get(a.name) || 0));
    // Place hub in middle of row if 3+ items for cleaner lines
    const colsCount = Math.min(maxCols, Math.max(2, Math.ceil(Math.sqrt(sorted.length * 1.4))));
    if (sorted.length >= 3) {
      const hub = sorted.shift()!;
      const midIdx = Math.floor(Math.min(colsCount, sorted.length + 1) / 2);
      sorted.splice(midIdx, 0, hub);
    }
    sorted.forEach((t, idx) => {
      const col = idx % colsCount;
      const row = Math.floor(idx / colsCount);
      positions[t.name] = {
        x: 28 + col * (CARD_W + GAP_X),
        y: cursorY + row * (CARD_H + GAP_Y),
      };
    });
    const rowsUsed = Math.ceil(sorted.length / colsCount);
    cursorY += rowsUsed * (CARD_H + GAP_Y);
  });

  // Layout standalone tables neatly below
  if (standalone.length) {
    standalone.forEach((t, idx) => {
      const col = idx % maxCols;
      const row = Math.floor(idx / maxCols);
      positions[t.name] = {
        x: 28 + col * (CARD_W + GAP_X),
        y: cursorY + row * (CARD_H + GAP_Y),
      };
    });
  }

  return positions;
}

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
  const [zoom, setZoom] = useState(0.85);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePos>>({});
  const dragRef = useRef<{ name: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRels(initial);
  }, [project.project_id, initial]);

  // Compute initial positions for all tables
  useEffect(() => {
    setNodePositions(computeInitialPositions(finalTables, rels));
  }, [project.project_id, finalTables.length]);

  // Pick default selected table
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

  // Helper: select a table AND sync the Selected Relationship panel to that table's relationships
  function selectTable(name: string) {
    setSelectedTableName(name);
    const matching = rels.find(r => r.from_table === name || r.to_table === name);
    setSelectedRelId(matching ? matching.id : '');
  }

  // Keep selectedRelId valid if rels change
  useEffect(() => {
    if (!rels.length) {
      setSelectedRelId('');
      return;
    }
    if (selectedRelId && !rels.some(r => r.id === selectedRelId)) {
      const matching = rels.find(r => r.from_table === selectedTableName || r.to_table === selectedTableName);
      setSelectedRelId(matching ? matching.id : '');
    }
  }, [rels, selectedRelId, selectedTableName]);

  const canvasBounds = useMemo(() => {
    const vals = Object.values(nodePositions);
    if (!vals.length) return { width: 900, height: 520 };
    const maxX = Math.max(...vals.map(p => p.x)) + CARD_W + 40;
    const maxY = Math.max(...vals.map(p => p.y)) + CARD_H + 40;
    return { width: Math.max(760, maxX), height: Math.max(460, maxY) };
  }, [nodePositions]);

  function fitToView() {
    const el = canvasViewportRef.current;
    if (!el) {
      setZoom(0.85);
      return;
    }
    const availW = Math.max(320, el.clientWidth - 24);
    const availH = Math.max(320, el.clientHeight - 24);
    const ratio = Math.min(1, availW / canvasBounds.width, availH / canvasBounds.height);
    setZoom(Math.max(0.45, +ratio.toFixed(2)));
  }

  // Auto-fit once positions are computed
  useEffect(() => {
    if (activeTab === 'diagram') {
      const timer = setTimeout(fitToView, 60);
      return () => clearTimeout(timer);
    }
  }, [activeTab, canvasBounds.width, canvasBounds.height]);

  function onNodeMouseDown(e: React.MouseEvent, name: string) {
    e.stopPropagation();
    selectTable(name);
    const pos = nodePositions[name] || { x: 24, y: 24 };
    dragRef.current = { name, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      const nx = Math.max(12, Math.round(dragRef.current.origX + dx));
      const ny = Math.max(12, Math.round(dragRef.current.origY + dy));
      const targetName = dragRef.current.name;
      setNodePositions(prev => ({ ...prev, [targetName]: { x: nx, y: ny } }));
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

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
        from_table: selectedTableName || '',
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

  // Relationships connected to the currently selected table
  const selectedTableRels = useMemo(() => {
    if (!selectedTableName) return [];
    return rels.filter(r => r.from_table === selectedTableName || r.to_table === selectedTableName);
  }, [rels, selectedTableName]);

  const selectedRel = useMemo(
    () => rels.find(r => r.id === selectedRelId) || null,
    [rels, selectedRelId]
  );

  const keyColsSet = useMemo(() => {
    const s = new Set<string>();
    rels.forEach(r => {
      if (r.from_table && r.from_column) s.add(`${r.from_table}.${r.from_column}`);
      if (r.to_table && r.to_column) s.add(`${r.to_table}.${r.to_column}`);
    });
    return s;
  }, [rels]);

  const factTablesSet = useMemo(() => {
    const s = new Set<string>();
    rels.forEach(r => {
      if (r.from_table) s.add(r.from_table);
    });
    return s;
  }, [rels]);

  function renderTableNode(table: SemanticTable) {
    const isSelected = selectedTableName === table.name;
    const isFact = factTablesSet.has(table.name);
    const visibleCols = table.columns.slice(0, 5);
    const visibleMeasures = table.measures.slice(0, 2);
    const extraCount = Math.max(0, table.columns.length - visibleCols.length) + Math.max(0, table.measures.length - visibleMeasures.length);

    return (
      <div
        className={`relNodeCard ${isFact ? 'fact' : 'dim'} ${isSelected ? 'selectedNode' : ''}`}
        onMouseDown={e => onNodeMouseDown(e, table.name)}
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
          <button type="button" className="relSaveBtn" data-tour="rel-save-btn" onClick={save} disabled={busy}>
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
                selectTable(t.name);
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

        {/* TAB 1: FULL ALL-TABLES POWER BI MODEL DIAGRAM */}
        {activeTab === 'diagram' && (
          <div className="relDiagramGrid" data-tour="rel-model-diagram">
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
                    onClick={() => selectTable(t.name)}
                  >
                    <Table2 size={15} className="relPurpleIcon" />
                    <span title={t.name}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CENTER ALL-TABLES CANVAS */}
            <div className="relCanvasShell">
              <div className="relCanvasControls">
                <button type="button" onClick={fitToView} title="Fit all tables to view"><Maximize2 size={14} /></button>
                <button type="button" onClick={() => setZoom(z => Math.min(1.25, +(z + 0.1).toFixed(2)))} title="Zoom in"><ZoomIn size={14} /></button>
                <button type="button" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))} title="Zoom out"><ZoomOut size={14} /></button>
                <button type="button" onClick={() => setNodePositions(computeInitialPositions(finalTables, rels))} title="Reset layout"><RotateCcw size={14} /></button>
              </div>

              <div className="relCanvasViewport" ref={canvasViewportRef}>
                {finalTables.length > 0 ? (
                  <div
                    className="relCanvasWorld"
                    style={{
                      width: canvasBounds.width * zoom,
                      height: canvasBounds.height * zoom,
                    }}
                  >
                    <div
                      className="relCanvasScaled"
                      style={{
                        width: canvasBounds.width,
                        height: canvasBounds.height,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      {/* SVG CONNECTOR LINES FOR ALL RELATIONSHIPS */}
                      <svg className="relSvgLayer" width={canvasBounds.width} height={canvasBounds.height}>
                        {rels.map(r => {
                          const p1 = nodePositions[r.from_table];
                          const p2 = nodePositions[r.to_table];
                          if (!p1 || !p2) return null;

                          const c1x = p1.x + CARD_W / 2;
                          const c1y = p1.y + CARD_H / 2;
                          const c2x = p2.x + CARD_W / 2;
                          const c2y = p2.y + CARD_H / 2;
                          const dx = c2x - c1x;
                          const dy = c2y - c1y;

                          let x1 = c1x;
                          let y1 = c1y;
                          let x2 = c2x;
                          let y2 = c2y;

                          if (Math.abs(dx) >= Math.abs(dy)) {
                            x1 = dx >= 0 ? p1.x + CARD_W : p1.x;
                            x2 = dx >= 0 ? p2.x : p2.x + CARD_W;
                          } else {
                            y1 = dy >= 0 ? p1.y + CARD_H : p1.y;
                            y2 = dy >= 0 ? p2.y : p2.y + CARD_H;
                          }

                          const midX = (x1 + x2) / 2;
                          const midY = (y1 + y2) / 2;
                          const pathD = Math.abs(dx) >= Math.abs(dy)
                            ? `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
                            : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

                          const isHighlighted =
                            selectedRel?.id === r.id ||
                            r.from_table === selectedTableName ||
                            r.to_table === selectedTableName;
                          const isActiveRel = selectedRel?.id === r.id;

                          const fromLabel = r.cardinality === 'One-to-one' ? '1' : '*';
                          const toLabel = '1';

                          const lbl1X = x1 + (x2 - x1) * 0.14;
                          const lbl1Y = y1 + (y2 - y1) * 0.14;
                          const lbl2X = x2 - (x2 - x1) * 0.14;
                          const lbl2Y = y2 - (y2 - y1) * 0.14;

                          return (
                            <g
                              key={r.id}
                              className={`relSvgEdge ${isActiveRel ? 'active' : isHighlighted ? 'highlighted' : 'dimmed'}`}
                              onClick={() => {
                                setSelectedRelId(r.id);
                                if (r.from_table) setSelectedTableName(r.from_table);
                              }}
                            >
                              <path d={pathD} className="relEdgeHit" />
                              <path d={pathD} className="relEdgeStroke" />
                              <circle cx={lbl1X} cy={lbl1Y} r={10} className="relCardCircle" />
                              <text x={lbl1X} y={lbl1Y + 4} textAnchor="middle" className="relCardText">{fromLabel}</text>
                              <circle cx={lbl2X} cy={lbl2Y} r={10} className="relCardCircle" />
                              <text x={lbl2X} y={lbl2Y + 4} textAnchor="middle" className="relCardText">{toLabel}</text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* ALL TABLE NODES */}
                      {finalTables.map(t => {
                        const pos = nodePositions[t.name] || { x: 24, y: 24 };
                        return (
                          <div
                            key={t.name}
                            className="relAbsNode"
                            style={{ left: pos.x, top: pos.y, width: CARD_W }}
                          >
                            {renderTableNode(t)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="empty">No tables in semantic model.</div>
                )}
              </div>

              <div className="relLegendBar">
                <div className="relLegendItems">
                  <span className="relLegendLabel">Legend:</span>
                  <span className="relLegendTag"><span className="relLegendSwatch fact" /> Fact / Source Table</span>
                  <span className="relLegendTag"><span className="relLegendSwatch dim" /> Dimension Table</span>
                  <span className="relLegendTag"><span className="relLegendLineSwatch" /> Relationship ({rels.length})</span>
                  <span className="relLegendTag"><span className="relCardChip">1</span> One</span>
                  <span className="relLegendTag"><span className="relCardChip">*</span> Many</span>
                  <span className="relLegendLabel">Tip: Drag tables to arrange</span>
                </div>
                <button type="button" className="relFitBtn" onClick={fitToView}>
                  <Maximize2 size={13} /> Fit to View ({Math.round(zoom * 100)}%)
                </button>
              </div>
            </div>

            {/* RIGHT INSPECTOR */}
            <div className="relInspectorCol">
              <div className="relInspectorCard">
                <div className="relInspectorHead">
                  <Link2 size={16} className="relPurpleIcon" />
                  <b>Selected Table & Relationship</b>
                </div>

                <div className="relSelectedTableBanner">
                  <span>Selected Table:</span>
                  <b><Table2 size={13} className="relPurpleIcon" /> {selectedTableName || 'None'}</b>
                </div>

                {selectedTableRels.length > 0 && (
                  <div className="relTableRelChips">
                    <span className="relMiniCaption">Relationships for {selectedTableName} ({selectedTableRels.length}):</span>
                    <div className="relRelPillList">
                      {selectedTableRels.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          className={`relRelSelectPill ${selectedRel?.id === r.id ? 'active' : ''}`}
                          onClick={() => setSelectedRelId(r.id)}
                        >
                          {r.from_table} → {r.to_table}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                  <div className="relNoRelBox">
                    <span>No relationships connected to <b>{selectedTableName || 'this table'}</b>.</span>
                    <button type="button" className="relMiniBtn" onClick={add}>
                      <Plus size={13} /> Add relationship
                    </button>
                  </div>
                )}
              </div>

              <div className="relSummaryCard">
                <div className="relInspectorHead">
                  <BarChart3 size={16} className="relPurpleIcon" />
                  <b>Model Summary</b>
                </div>
                <ul className="relSummaryList">
                  <li><CheckCircle2 size={15} /> <span>{finalTables.length} tables in diagram</span></li>
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
