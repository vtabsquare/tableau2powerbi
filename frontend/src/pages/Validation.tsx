import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  GitFork,
  Search,
  Target,
  Wrench,
} from 'lucide-react';
import { MigrationProject, ValidationIssue } from '../types/project';

type SectionKey = 'validation' | 'tde' | 'decisions' | 'reconciliation';

function mapSeverityLabel(severity: ValidationIssue['severity']): 'High' | 'Medium' | 'Low' {
  if (severity === 'error') return 'High';
  if (severity === 'warning') return 'Medium';
  return 'Low';
}

function severityClass(severity: ValidationIssue['severity']): string {
  if (severity === 'error') return 'valSevHigh';
  if (severity === 'warning') return 'valSevMedium';
  return 'valSevLow';
}

function str(val: unknown, fallback = '—'): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s || fallback;
}

function toList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (!entries.length) return [];
    return entries.map(([k, v]) => `${k}: ${String(v)}`);
  }
  const s = String(val).trim();
  return s ? [s] : [];
}

function ChipList({ value }: { value: unknown }) {
  const items = toList(value);
  if (!items.length) return <span className="valMutedText">—</span>;
  const visible = items.slice(0, 3);
  const extra = items.length - visible.length;
  return (
    <div className="valChipWrap" title={items.join(', ')}>
      {visible.map((item, i) => (
        <span key={`${item}-${i}`} className="valMiniChip">
          {item}
        </span>
      ))}
      {extra > 0 && <span className="valMiniChip valMiniChipMore">+{extra} more</span>}
    </div>
  );
}

const DECISIONS_PAGE_SIZE = 10;

export default function Validation({ project }: { project: MigrationProject }) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    validation: true,
    tde: false,
    decisions: false,
    reconciliation: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [decSearch, setDecSearch] = useState('');
  const [decReviewFilter, setDecReviewFilter] = useState<'all' | 'auto' | 'manual'>('all');
  const [decPage, setDecPage] = useState(1);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const issues = project.validation_issues || [];
  const categories = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((item) => {
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.object_name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        (item.recommended_fix || '').toLowerCase().includes(q)
      );
    });
  }, [issues, searchQuery, severityFilter, categoryFilter]);

  const valWarnings = issues.filter((i) => i.severity === 'warning' || i.severity === 'error').length;
  const valPassed = Math.max(0, issues.length - valWarnings);

  const tdeRows = useMemo(() => (project.tde_analysis || []) as Array<Record<string, unknown>>, [
    project.tde_analysis,
  ]);
  const tdeWarnings = useMemo(
    () =>
      tdeRows.filter(
        (r) => Boolean(r.temporary_fallback) || String(r.priority || '').toLowerCase() === 'high'
      ).length,
    [tdeRows]
  );
  const tdePassed = Math.max(0, tdeRows.length - tdeWarnings);

  const decisions = useMemo(
    () => (project.migration_decisions || []) as Array<Record<string, unknown>>,
    [project.migration_decisions]
  );
  const decWarnings = decisions.filter((d) => Boolean(d.manual_review)).length;
  const decPassed = Math.max(0, decisions.length - decWarnings);

  const filteredDecisions = useMemo(() => {
    const q = decSearch.trim().toLowerCase();
    return decisions.filter((d) => {
      const isManual = Boolean(d.manual_review);
      if (decReviewFilter === 'manual' && !isManual) return false;
      if (decReviewFilter === 'auto' && isManual) return false;
      if (!q) return true;
      return (
        str(d.object_name, '').toLowerCase().includes(q) ||
        str(d.datasource, '').toLowerCase().includes(q) ||
        str(d.category, '').toLowerCase().includes(q) ||
        str(d.migration_decision, '').toLowerCase().includes(q) ||
        str(d.powerbi_target, '').toLowerCase().includes(q)
      );
    });
  }, [decisions, decSearch, decReviewFilter]);

  const decTotalPages = Math.max(1, Math.ceil(filteredDecisions.length / DECISIONS_PAGE_SIZE));
  const safeDecPage = Math.min(decPage, decTotalPages);
  const pagedDecisions = filteredDecisions.slice(
    (safeDecPage - 1) * DECISIONS_PAGE_SIZE,
    safeDecPage * DECISIONS_PAGE_SIZE
  );
  const decStart = filteredDecisions.length === 0 ? 0 : (safeDecPage - 1) * DECISIONS_PAGE_SIZE + 1;
  const decEnd = Math.min(safeDecPage * DECISIONS_PAGE_SIZE, filteredDecisions.length);

  const reconciliation = useMemo(
    () => (project.reconciliation_plan || []) as Array<Record<string, unknown>>,
    [project.reconciliation_plan]
  );
  const recWarnings = reconciliation.filter(
    (r) => String(r.status || '').toLowerCase().includes('warn') || Boolean(r.manual_review)
  ).length;
  const recPassed = Math.max(0, reconciliation.length - recWarnings);

  return (
    <div className="page validationPage valPage">
      {/* 1. Validation & Auto-Fix Center */}
      <section className="valAccordionCard" data-tour="val-autofix">
        <button
          type="button"
          className="valAccordionHeader"
          onClick={() => toggleSection('validation')}
          aria-expanded={openSections.validation}
        >
          <div className="valAccLeft">
            <span className="valChevron">
              {openSections.validation ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </span>
            <span className="valAccIcon">
              <Wrench size={16} />
            </span>
            <h2 className="valAccTitle">Validation &amp; Auto-Fix Center</h2>
            <span className="valChecksPill">{issues.length} checks</span>
          </div>
          <div className="valAccRight">
            <span className="valPassedPill">
              <CheckCircle2 size={14} />
              {valPassed} Passed
            </span>
            <span className="valWarnPill">
              <AlertTriangle size={14} />
              {valWarnings} Warnings
            </span>
          </div>
        </button>

        {openSections.validation && (
          <div className="valAccordionBody">
            <div className="valFilterBar">
              <div className="valSearchBox">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search checks (e.g., Customer, LOD)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="valFilterSelects">
                <label className="valSelectGroup">
                  <span>Severity</span>
                  <select
                    value={severityFilter}
                    onChange={(e) =>
                      setSeverityFilter(e.target.value as 'all' | 'error' | 'warning' | 'info')
                    }
                  >
                    <option value="all">All</option>
                    <option value="error">High</option>
                    <option value="warning">Medium</option>
                    <option value="info">Low</option>
                  </select>
                </label>
                <label className="valSelectGroup">
                  <span>Category</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="valTableWrap valTableBordered">
              <table className="valTable">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Category</th>
                    <th>Object Name</th>
                    <th>Message</th>
                    <th>Recommended Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="valEmptyCell">
                        {issues.length === 0
                          ? 'No validation issues detected.'
                          : 'No checks match the selected filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue, idx) => (
                      <tr key={`${issue.object_name}-${idx}`}>
                        <td>
                          <span className={`valSevPill ${severityClass(issue.severity)}`}>
                            {mapSeverityLabel(issue.severity)}
                          </span>
                        </td>
                        <td className="valCatCell">{issue.category}</td>
                        <td className="valObjCell">{issue.object_name}</td>
                        <td className="valMsgCell">{issue.message}</td>
                        <td className="valFixCell">{issue.recommended_fix || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 2. TDE Extract Strategy */}
      <section className="valAccordionCard">
        <button
          type="button"
          className="valAccordionHeader"
          onClick={() => toggleSection('tde')}
          aria-expanded={openSections.tde}
        >
          <div className="valAccLeft">
            <span className="valChevron">
              {openSections.tde ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </span>
            <span className="valAccIcon">
              <Database size={16} />
            </span>
            <h2 className="valAccTitle">
              TDE Extract Strategy{' '}
              <span className="valAccSub">– TDE is validation/fallback, not source of truth</span>
            </h2>
            <span className="valChecksPill">{tdeRows.length} checks</span>
          </div>
          <div className="valAccRight">
            <span className="valPassedPill">
              <CheckCircle2 size={14} />
              {tdePassed} Passed
            </span>
            <span className="valWarnPill">
              <AlertTriangle size={14} />
              {tdeWarnings} Warnings
            </span>
          </div>
        </button>

        {openSections.tde && (
          <div className="valAccordionBody valAccordionBodyPadTop">
            <div className="valTableWrap valTableBordered">
              <table className="valTable">
                <thead>
                  <tr>
                    <th>TDE File</th>
                    <th>Role</th>
                    <th>Source of Truth</th>
                    <th>Priority</th>
                    <th>Recommended Usage</th>
                    <th>Migration Decision</th>
                    <th>Preferred Architecture</th>
                    <th>Validation Pattern</th>
                  </tr>
                </thead>
                <tbody>
                  {tdeRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="valEmptyCell">
                        No legacy .tde extract detected.
                      </td>
                    </tr>
                  ) : (
                    tdeRows.map((row, idx) => {
                      const isSot = Boolean(row.is_source_of_truth);
                      return (
                        <tr key={`${str(row.tde_file)}-${idx}`}>
                          <td className="valObjCell valNoWrap">{str(row.tde_file)}</td>
                          <td>{str(row.tde_role)}</td>
                          <td>
                            <span className={`valBoolPill ${isSot ? 'yes' : 'no'}`}>
                              {isSot ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className="valSevPill valSevMedium">{str(row.priority)}</span>
                          </td>
                          <td>{str(row.recommended_usage)}</td>
                          <td>{str(row.decision)}</td>
                          <td>{str(row.preferred_architecture)}</td>
                          <td>{str(row.validation_pattern)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 3. Migration Strategy Decisions */}
      <section className="valAccordionCard">
        <button
          type="button"
          className="valAccordionHeader"
          onClick={() => toggleSection('decisions')}
          aria-expanded={openSections.decisions}
        >
          <div className="valAccLeft">
            <span className="valChevron">
              {openSections.decisions ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </span>
            <span className="valAccIcon">
              <GitFork size={16} />
            </span>
            <h2 className="valAccTitle">
              Migration Strategy Decisions{' '}
              <span className="valAccSub">– Migrate business logic, not Tableau mechanics</span>
            </h2>
            <span className="valChecksPill">{decisions.length} checks</span>
          </div>
          <div className="valAccRight">
            <span className="valPassedPill">
              <CheckCircle2 size={14} />
              {decPassed} Passed
            </span>
            <span className="valWarnPill">
              <AlertTriangle size={14} />
              {decWarnings} Warnings
            </span>
          </div>
        </button>

        {openSections.decisions && (
          <div className="valAccordionBody">
            <div className="valFilterBar">
              <div className="valSearchBox">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search object, datasource, or decision..."
                  value={decSearch}
                  onChange={(e) => {
                    setDecSearch(e.target.value);
                    setDecPage(1);
                  }}
                />
              </div>
              <div className="valFilterSelects">
                <label className="valSelectGroup">
                  <span>Review Status</span>
                  <select
                    value={decReviewFilter}
                    onChange={(e) => {
                      setDecReviewFilter(e.target.value as 'all' | 'auto' | 'manual');
                      setDecPage(1);
                    }}
                  >
                    <option value="all">All ({decisions.length})</option>
                    <option value="auto">Auto ({decPassed})</option>
                    <option value="manual">Manual Review ({decWarnings})</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="valTableWrap valTableBordered">
              <table className="valTable">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Datasource</th>
                    <th>Object Name</th>
                    <th>Tableau Type</th>
                    <th>Power BI Target</th>
                    <th>Migration Decision</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDecisions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="valEmptyCell">
                        No migration decisions match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    pagedDecisions.map((d, idx) => {
                      const manual = Boolean(d.manual_review);
                      return (
                        <tr key={`${str(d.object_name)}-${idx}`}>
                          <td className="valCatCell">{str(d.category).replace(/_/g, ' ')}</td>
                          <td>{str(d.datasource)}</td>
                          <td className="valObjCell">{str(d.object_name)}</td>
                          <td>
                            <span className="valTypeTag">{str(d.tableau_type)}</span>
                          </td>
                          <td>{str(d.powerbi_target)}</td>
                          <td>{str(d.migration_decision)}</td>
                          <td>
                            <span className={`valBoolPill ${manual ? 'warn' : 'yes'}`}>
                              {manual ? 'Manual' : 'Auto'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredDecisions.length > DECISIONS_PAGE_SIZE && (
              <div className="valPagination">
                <span>
                  Showing {decStart}–{decEnd} of {filteredDecisions.length} decisions
                </span>
                <div className="valPageControls">
                  <button
                    type="button"
                    disabled={safeDecPage <= 1}
                    onClick={() => setDecPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>
                    Page {safeDecPage} of {decTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeDecPage >= decTotalPages}
                    onClick={() => setDecPage((p) => Math.min(decTotalPages, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Accuracy & Reconciliation Plan */}
      <section className="valAccordionCard">
        <button
          type="button"
          className="valAccordionHeader"
          onClick={() => toggleSection('reconciliation')}
          aria-expanded={openSections.reconciliation}
        >
          <div className="valAccLeft">
            <span className="valChevron">
              {openSections.reconciliation ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </span>
            <span className="valAccIcon">
              <Target size={16} />
            </span>
            <h2 className="valAccTitle">Accuracy &amp; Reconciliation Plan</h2>
            <span className="valChecksPill">{reconciliation.length} checks</span>
          </div>
          <div className="valAccRight">
            <span className="valPassedPill">
              <CheckCircle2 size={14} />
              {recPassed} Passed
            </span>
            <span className="valWarnPill">
              <AlertTriangle size={14} />
              {recWarnings} Warnings
            </span>
          </div>
        </button>

        {openSections.reconciliation && (
          <div className="valAccordionBody valAccordionBodyPadTop">
            <div className="valTableWrap valTableBordered">
              <table className="valTable">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Checkpoint</th>
                    <th>Validation Scope</th>
                    <th>Tables</th>
                    <th>Artifact Rule / TDE</th>
                    <th>Calculations</th>
                    <th>Worksheets</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="valEmptyCell">
                        No reconciliation plan generated.
                      </td>
                    </tr>
                  ) : (
                    reconciliation.map((r, idx) => {
                      const ruleText = [str(r.artifact_rule, ''), str(r.tde_file, '')]
                        .filter(Boolean)
                        .join(' • ');
                      return (
                        <tr key={`${str(r.step)}-${idx}`}>
                          <td>
                            <span className="valStepBadge">{str(r.step)}</span>
                          </td>
                          <td className="valObjCell">{str(r.checkpoint)}</td>
                          <td className="valMsgCell">{str(r.validation)}</td>
                          <td>
                            <ChipList value={r.tables} />
                          </td>
                          <td className="valMutedText">{ruleText || '—'}</td>
                          <td>
                            <ChipList value={r.calculations} />
                          </td>
                          <td>
                            <ChipList value={r.worksheets} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
