import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  GitFork,
  Search,
  Target,
  Wrench,
} from 'lucide-react';
import DataTable from '../components/DataTable';
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

  const tdeSummaryRows = useMemo(
    () =>
      (project.tde_analysis || []).map((r: any) => ({
        tde_file: r.tde_file,
        tde_role: r.tde_role,
        is_source_of_truth: r.is_source_of_truth,
        recommended_usage: r.recommended_usage,
        scenario: r.scenario,
        scenario_classification: r.scenario_classification,
        priority: r.priority,
        decision: r.decision,
        preferred_architecture: r.preferred_architecture,
        temporary_fallback: r.temporary_fallback,
        validation_pattern: r.validation_pattern,
      })),
    [project.tde_analysis]
  );

  const tdeWarnings = useMemo(
    () =>
      (project.tde_analysis || []).filter(
        (r: any) => r.temporary_fallback || String(r.priority || '').toLowerCase() === 'high'
      ).length,
    [project.tde_analysis]
  );
  const tdePassed = Math.max(0, tdeSummaryRows.length - tdeWarnings);

  const decisions = project.migration_decisions || [];
  const decWarnings = decisions.filter((d: any) => Boolean(d.manual_review)).length;
  const decPassed = Math.max(0, decisions.length - decWarnings);

  const reconciliation = project.reconciliation_plan || [];
  const recWarnings = reconciliation.filter(
    (r: any) => String(r.status || '').toLowerCase().includes('warn') || Boolean(r.manual_review)
  ).length;
  const recPassed = Math.max(0, reconciliation.length - recWarnings);

  return (
    <div className="page validationPage valPage">
      {/* 1. Validation & Auto-Fix Center */}
      <section className="valAccordionCard">
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

            <div className="valTableWrap">
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
            <span className="valChecksPill">{tdeSummaryRows.length} checks</span>
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
          <div className="valAccordionBody">
            <DataTable
              rows={tdeSummaryRows as Record<string, unknown>[]}
              empty="No legacy .tde extract detected"
            />
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
            <DataTable
              rows={decisions as Record<string, unknown>[]}
              empty="No migration decisions generated"
            />
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
          <div className="valAccordionBody">
            <DataTable
              rows={reconciliation as Record<string, unknown>[]}
              empty="No reconciliation plan generated"
            />
          </div>
        )}
      </section>
    </div>
  );
}
