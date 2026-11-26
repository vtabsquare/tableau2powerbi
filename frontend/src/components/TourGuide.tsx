import { useEffect, useState } from 'react';
import { ArrowRight, Compass, X } from 'lucide-react';

export type TourStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
};

const LANDING_TOUR_STEPS: TourStep[] = [
  {
    id: 'phase-discover',
    selector: '[data-tour="phase-discover"]',
    title: '1. Discover',
    description:
      'Inventory your Tableau package, classify upload models, inspect the file processing tree, and recover upstream sources from any legacy TDE extracts.',
  },
  {
    id: 'phase-prepare',
    selector: '[data-tour="phase-prepare"]',
    title: '2. Prepare',
    description:
      'Configure source mappings and connection paths, preview data with inferred Power BI types, and verify table relationships in the model diagram.',
  },
  {
    id: 'phase-convert',
    selector: '[data-tour="phase-convert"]',
    title: '3. Convert',
    description:
      'Review Tableau-to-DAX calculations, inspect generated Power Query (M) scripts, verify Final Tables, and review the Visual Conversion Plan.',
  },
  {
    id: 'phase-deliver',
    selector: '[data-tour="phase-deliver"]',
    title: '4. Deliver',
    description:
      'Run final validation & reconciliation checks and export your Power BI semantic model package ready for Power BI Desktop.',
  },
  {
    id: 'new-migration',
    selector: '[data-tour="new-migration"]',
    title: '5. New Migration',
    description:
      'Click New Migration to upload your Tableau workbooks, packaged assets, or ZIP archive and begin your migration.',
  },
];

const UPLOAD_TOUR_STEPS: TourStep[] = [
  {
    id: 'choose-files',
    selector: '[data-tour="choose-files"]',
    title: '1. Choose Files',
    description:
      'Click Choose Files (or drag & drop) to select your Tableau workbook (.twb/.twbx), data sources, Prep flows, or a complete project ZIP.',
  },
  {
    id: 'upload-analyze',
    selector: '[data-tour="upload-analyze"], [data-tour="upload-analyze-fallback"]',
    title: '2. Upload & Analyze',
    description:
      'Click Upload & Analyze File(s) to inventory your package, detect the upload model, and begin automated metadata extraction.',
  },
];

const UPLOAD_MODELS_TOUR_STEPS: TourStep[] = [
  {
    id: 'detected-upload-model',
    selector: '[data-tour="detected-upload-model"]',
    title: '1. Detected Upload Model',
    description:
      'This highlighted model among the 14 Supported Upload Models matches your uploaded assets, showing mandatory files, processing route, and production rules.',
  },
  {
    id: 'proceed-next',
    selector: '[data-tour="proceed-next"]',
    title: '2. Proceed to 360 Summary',
    description:
      'Click Proceed to 360 Summary at the bottom right to inspect the full workbook inventory, datasources, and KPIs.',
  },
];

const SUMMARY_TOUR_STEPS: TourStep[] = [
  {
    id: 'compact-health',
    selector: '[data-tour="compact-health"]',
    title: '1. Compact Migration Health by Area',
    description:
      'Review migration health across Report Structure, Data Model, Logic, and TDE Strategy in one compact table.',
  },
  {
    id: 'proceed-next',
    selector: '[data-tour="proceed-next"]',
    title: '2. Proceed to File Processing Tree',
    description:
      'Click Proceed to File Processing Tree to see how every uploaded file is routed through the migration pipeline.',
  },
];

const FILE_TREE_TOUR_STEPS: TourStep[] = [
  {
    id: 'file-processing-routing',
    selector: '[data-tour="file-processing-routing"]',
    title: '1. File Processing & Next-Stage Routing',
    description:
      'Inspect how each uploaded package and child file is classified, its processing route, and which stage uses its output next.',
  },
  {
    id: 'proceed-next',
    selector: '[data-tour="proceed-next"]',
    title: '2. Proceed to TDE Source Recovery',
    description:
      'Click Proceed to TDE Source Recovery to verify or recover the original upstream data sources.',
  },
];

const TDE_RECOVERY_TOUR_STEPS: TourStep[] = [
  {
    id: 'tde-detected-tables',
    selector: '[data-tour="tde-detected-tables"]',
    title: '1. Review All Detected Tables',
    description:
      'Review every detected table in the left list and select any table to inspect or update its source connection details.',
  },
  {
    id: 'tde-path-input',
    selector: '[data-tour="tde-path-input"]',
    title: '2. Enter Path Details Properly',
    description:
      'Enter the Power BI Readable File Path cleanly without quotes (e.g. Data/Academic_Data.xlsx). Quoted paths are blocked in red.',
  },
  {
    id: 'tde-save-btn',
    selector: '[data-tour="tde-save-btn"]',
    title: '3. Save Source Details & Validate Columns',
    description:
      'Click Save Source Details & Validate Columns to persist your source paths and unlock the next stage.',
  },
  {
    id: 'proceed-next',
    selector: '[data-tour="proceed-next"]',
    title: '4. Proceed to Source Overview',
    description:
      'Once saved, click Proceed to Source Overview to review the complete source inventory.',
  },
];

type Props = {
  open: boolean;
  activeStage: string;
  onClose: () => void;
};

type RectBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default function TourGuide({ open, activeStage, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);

  const steps =
    activeStage === 'Upload'
      ? UPLOAD_TOUR_STEPS
      : activeStage === 'Upload Models'
      ? UPLOAD_MODELS_TOUR_STEPS
      : activeStage === '360 Summary'
      ? SUMMARY_TOUR_STEPS
      : activeStage === 'File Processing Tree'
      ? FILE_TREE_TOUR_STEPS
      : activeStage === 'TDE Source Recovery'
      ? TDE_RECOVERY_TOUR_STEPS
      : LANDING_TOUR_STEPS;
  const safeStepIdx = Math.min(stepIdx, steps.length - 1);
  const step = steps[safeStepIdx];

  useEffect(() => {
    if (!open) {
      setStepIdx(0);
      setTargetRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const handleTargetClick = () => {
      if (step.id === 'new-migration' || step.id === 'upload-analyze' || step.id === 'proceed-next') {
        onClose();
      }
    };
    if (el && (step.id === 'new-migration' || step.id === 'upload-analyze' || step.id === 'proceed-next')) {
      el.addEventListener('click', handleTargetClick);
    }

    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 420);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (el && (step.id === 'new-migration' || step.id === 'upload-analyze' || step.id === 'proceed-next')) {
        el.removeEventListener('click', handleTargetClick);
      }
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step.id, step.selector, onClose]);

  if (!open) return null;

  const isLast = safeStepIdx === steps.length - 1;

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const popWidth = 340;

  let popTop = 180;
  let popLeft = Math.max(16, (viewportW - popWidth) / 2);
  let arrowDir: 'up' | 'down' = 'up';

  if (targetRect) {
    const spaceBelow = viewportH - (targetRect.top + targetRect.height);
    if (spaceBelow >= 230) {
      popTop = targetRect.top + targetRect.height + 16;
      arrowDir = 'up';
    } else {
      popTop = Math.max(16, targetRect.top - 220);
      arrowDir = 'down';
    }
    popLeft = Math.min(
      Math.max(16, targetRect.left + targetRect.width / 2 - popWidth / 2),
      Math.max(16, viewportW - popWidth - 16)
    );
  }

  return (
    <div className="tourOverlay" role="dialog" aria-modal="true" aria-label="Application Tour">
      {targetRect && (
        <div
          className="tourSpotlight"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <div
        className={`tourPopover ${arrowDir === 'down' ? 'arrowDown' : 'arrowUp'}`}
        style={{ top: popTop, left: popLeft, width: popWidth }}
      >
        <div className="tourPopoverTop">
          <span className="tourStepBadge">
            Step {safeStepIdx + 1} of {steps.length}
          </span>
          <button type="button" className="tourCloseBtn" onClick={onClose} aria-label="Close tour">
            <X size={15} />
          </button>
        </div>

        <h3>{step.title}</h3>
        <p>{step.description}</p>

        <div className="tourPopoverFooter">
          <div className="tourDots">
            {steps.map((s, i) => (
              <span key={s.id} className={i === safeStepIdx ? 'active' : ''} />
            ))}
          </div>
          <div className="tourPopoverBtns">
            <button type="button" className="tourSkipBtn" onClick={onClose}>
              Skip Tour
            </button>
            <button
              type="button"
              className="tourNextBtn"
              onClick={() => {
                if (isLast) onClose();
                else setStepIdx((i) => i + 1);
              }}
            >
              {isLast ? 'Finish' : 'Next'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourTriggerButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tourTriggerBtn ${active ? 'active' : ''}`}
      onClick={onClick}
      title="Start Interactive Application Tour"
    >
      <Compass size={15} />
      <span>Tour</span>
    </button>
  );
}
