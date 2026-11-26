import { useEffect, useState } from 'react';
import { ArrowRight, Compass, Map as MapIcon, X } from 'lucide-react';

export type TourStep = {
  id: string;
  selector: string;
  title: string;
  subtitle: string;
  description: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 'phase-row',
    selector: '[data-tour="phase-row"]',
    title: 'Migration Workflow',
    subtitle: 'Understand the 4-phase process',
    description:
      'This is the 4-phase migration workflow (Discover, Prepare, Convert, Deliver). It guides you from inventorying Tableau assets to delivering a validated Power BI package.',
  },
  {
    id: 'new-migration',
    selector: '[data-tour="new-migration"]',
    title: 'New Migration',
    subtitle: 'Start a new Tableau to Power BI migration',
    description:
      'Click New Migration to upload your Tableau workbook, packaged assets, or ZIP archive and launch the automated migration pipeline.',
  },
  {
    id: 'zip-guidelines',
    selector: '[data-tour="zip-guidelines"]',
    title: 'Input Guidelines',
    subtitle: 'View required files and ZIP contents',
    description:
      'Review what files to include in your package (.twb/.twbx, .tds/.tdsx, .tfl/.tflx, CSV/Excel/Parquet sources, SQL scripts, and optional lineage metadata).',
  },
  {
    id: 'tde-rule',
    selector: '[data-tour="tde-rule"]',
    title: 'TDE Handling',
    subtitle: 'Learn how TDE files are processed',
    description:
      'Legacy .tde extracts are treated as validation baselines or temporary fallbacks—never as the production Power BI source. Original sources are recovered automatically.',
  },
  {
    id: 'capabilities',
    selector: '[data-tour="capabilities"]',
    title: 'Core Capabilities',
    subtitle: 'What the app can do and validate',
    description:
      'See full workbench coverage: metadata inventory, M/DAX conversion, visual recommendations, validation checkpoints, and the FastAPI + React + PyArrow stack.',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

type RectBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default function TourGuide({ open, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);

  const step = TOUR_STEPS[stepIdx];

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

    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 420);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step.selector]);

  if (!open) return null;

  const isLast = stepIdx === TOUR_STEPS.length - 1;

  // Compute popover position below or above the spotlight box
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
      Math.max(16, viewportW - popWidth - 290)
    );
  }

  return (
    <div className="tourOverlay" role="dialog" aria-modal="true" aria-label="Application Tour">
      {/* Highlighted spotlight cutout */}
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

      {/* Step Popover */}
      <div
        className={`tourPopover ${arrowDir === 'down' ? 'arrowDown' : 'arrowUp'}`}
        style={{ top: popTop, left: popLeft, width: popWidth }}
      >
        <div className="tourPopoverTop">
          <span className="tourStepBadge">
            Step {stepIdx + 1} of {TOUR_STEPS.length}
          </span>
          <button type="button" className="tourCloseBtn" onClick={onClose} aria-label="Close tour">
            <X size={15} />
          </button>
        </div>

        <h3>{step.title}</h3>
        <p>{step.description}</p>

        <div className="tourPopoverFooter">
          <div className="tourDots">
            {TOUR_STEPS.map((s, i) => (
              <span key={s.id} className={i === stepIdx ? 'active' : ''} />
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

      {/* Right-Side Application Tour Checklist */}
      <aside className="tourSidebarCard">
        <div className="tourSidebarHead">
          <MapIcon size={16} />
          <strong>Application Tour</strong>
        </div>
        <div className="tourSidebarList">
          {TOUR_STEPS.map((s, idx) => {
            const active = idx === stepIdx;
            return (
              <button
                key={s.id}
                type="button"
                className={`tourSidebarItem ${active ? 'active' : ''}`}
                onClick={() => setStepIdx(idx)}
              >
                <span className="tourSidebarNum">{idx + 1}</span>
                <div className="tourSidebarText">
                  <b>{s.title}</b>
                  <span>{s.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
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
