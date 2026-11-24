import { Card, Badge } from '../components/Cards';
import DataTable from '../components/DataTable';
import { MigrationProject } from '../types/project';

export default function Validation({ project }: {project: MigrationProject}) {
  const errors = project.validation_issues.filter(i => i.severity === 'error').length;
  const warnings = project.validation_issues.filter(i => i.severity === 'warning').length;
  const manual = (project.migration_decisions || []).filter(d => d.manual_review).length;

  const tdeSummaryRows = (project.tde_analysis || []).map((r: any) => ({
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
    validation_pattern: r.validation_pattern
  }));

  return <div className="page validationPage">
    <Card title="Validation & Auto-Fix Center" right={<><Badge tone={errors ? 'bad' : 'good'}>{errors} errors</Badge><Badge tone={warnings ? 'warn' : 'good'}>{warnings} warnings</Badge><Badge tone={manual ? 'warn' : 'good'}>{manual} manual decisions</Badge></>}>
      <DataTable rows={project.validation_issues as unknown as Record<string, unknown>[]} empty="No validation issues detected"/>
    </Card>
    <Card title="TDE Extract Strategy - TDE is validation/fallback, not source of truth">
      <DataTable rows={tdeSummaryRows as Record<string, unknown>[]} empty="No legacy .tde extract detected"/>
    </Card>
    <Card title="Migration Strategy Decisions - migrate business logic, not Tableau mechanics">
      <DataTable rows={(project.migration_decisions || []) as Record<string, unknown>[]} empty="No migration decisions generated"/>
    </Card>
    <Card title="Accuracy & Reconciliation Plan">
      <DataTable rows={(project.reconciliation_plan || []) as Record<string, unknown>[]} empty="No reconciliation plan generated"/>
    </Card>
  </div>;
}
