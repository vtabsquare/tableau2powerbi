import React, { useState } from 'react';
import { 
  X, Lock, CheckCircle2, Sparkles, Mail, Copy, Check, ExternalLink 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDemoModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const contactEmail = 'contactsales@vtabsquare.com';
  const contactDemoUrl = 'https://www.vtabsquare.com/';

  if (!isOpen) return null;

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText(contactEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="vtabModalBackdrop" onClick={handleBackdropClick}>
      <div 
        className="vtabModalCard" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="vtab-modal-title"
      >
        {/* Top bar with Demo Completed Badge and Close button */}
        <div 
          className="vtabModalTopRow"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '16px'
          }}
        >
          <div 
            className="vtabDemoPill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Lock size={13} className="vtabLockIcon" />
            <span>DEMO VERSION COMPLETED</span>
          </div>
          <button 
            type="button" 
            className="vtabModalClose" 
            onClick={onClose} 
            aria-label="Close dialog"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              maxWidth: '32px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              marginLeft: 'auto',
              flexShrink: 0,
              padding: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Header */}
        <div className="vtabModalHeader">
          <h2 id="vtab-modal-title" className="vtabModalTitle">
            Demo Ended — Interactive Preview Completed!
          </h2>
          <p className="vtabModalSubtitle">
            You have successfully explored the interactive demo up to DAX Measures. Contact us for full access to remaining enterprise features and production deployment.
          </p>
        </div>

        {/* Comparison Grid (Completed in Demo vs Remaining Enterprise Steps) */}
        <div className="vtabCompareGrid">
          {/* Left: Completed in Demo */}
          <div className="vtabGridCard vtabGridCompleted">
            <div className="vtabGridCardHeader completedHeader">
              <CheckCircle2 size={16} />
              <span>COMPLETED IN DEMO</span>
            </div>
            <ul className="vtabBulletList completedBullets">
              <li>
                <span className="bulletSymbol">✓</span>
                <span>Capture, Tableau Parsing &amp; Workbook Analysis</span>
              </li>
              <li>
                <span className="bulletSymbol">✓</span>
                <span>Lineage, Power Query M &amp; DAX Measures</span>
              </li>
              <li>
                <span className="bulletSymbol">✓</span>
                <span>Deterministic logic policy validation &amp; review</span>
              </li>
            </ul>
          </div>

          {/* Right: Remaining Enterprise Steps */}
          <div className="vtabGridCard vtabGridEnterprise">
            <div className="vtabGridCardHeader enterpriseHeader">
              <Lock size={15} />
              <span>REMAINING IN ENTERPRISE EDITION</span>
            </div>
            <ul className="vtabBulletList enterpriseBullets">
              <li>
                <span className="bulletLock">🔒</span>
                <span>Automated Semantic Model &amp; TMDL Generation</span>
              </li>
              <li>
                <span className="bulletLock">🔒</span>
                <span>Power BI Desktop PBIP (.zip) download</span>
              </li>
              <li>
                <span className="bulletLock">🔒</span>
                <span>Direct Microsoft Fabric &amp; Power BI Service deployment</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Solutions Banner */}
        <div className="vtabSolutionsBox">
          <div className="vtabSolutionsHeader">
            <div className="vtabSparkleIconWrap">
              <Sparkles size={18} color="#FFFFFF" />
            </div>
            <div>
              <h3 className="vtabSolutionsTitle">Ready to migrate your full Tableau environment?</h3>
              <p className="vtabSolutionsDesc">
                Contact our solutions team for enterprise licensing, private on-prem / cloud deployment, and Proof of Concept (PoC) validation on your own enterprise reports.
              </p>
            </div>
          </div>

          <div 
            className="vtabSolutionsActionRow"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div 
              className="vtabEmailCopyBox"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '10px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '7px 10px 7px 12px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                width: 'auto',
                boxSizing: 'border-box'
              }}
            >
              <Mail size={15} style={{ color: '#4F46E5', flexShrink: 0 }} />
              <span 
                className="vtabEmailText"
                style={{
                  fontFamily: 'inherit',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#1E293B',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  display: 'inline-block',
                  flexShrink: 0
                }}
              >
                {contactEmail}
              </span>
              <button 
                type="button" 
                className="vtabCopyBtn" 
                onClick={handleCopyEmail}
                title="Copy email to clipboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: 'auto',
                  minWidth: 'auto',
                  maxWidth: 'none',
                  flexShrink: 0,
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  boxShadow: 'none',
                  lineHeight: 1,
                  margin: 0
                }}
              >
                {copied ? (
                  <>
                    <Check size={12} color="#16A34A" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy
                  </>
                )}
              </button>
            </div>

            <a 
              href={contactDemoUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="vtabContactDemoBtn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                width: 'auto',
                flexShrink: 0,
                background: '#4F46E5',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                padding: '9px 20px',
                borderRadius: '9999px',
                textDecoration: 'none',
                boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)',
                whiteSpace: 'nowrap',
                lineHeight: 1
              }}
            >
              <span>Contact Demo</span>
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div 
          className="vtabModalFooter"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '18px',
            borderTop: '1px solid #F1F5F9'
          }}
        >
          <div 
            className="vtabFooterBadge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#10B981',
              whiteSpace: 'nowrap'
            }}
          >
            <CheckCircle2 size={15} color="#10B981" />
            <span>VTAB Square Enterprise Migration Engine v2.0</span>
          </div>

          <button 
            type="button" 
            className="vtabReviewStagesBtn" 
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'auto',
              marginLeft: 'auto',
              flexShrink: 0,
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 20px',
              borderRadius: '9999px',
              cursor: 'pointer',
              boxShadow: 'none'
            }}
          >
            Review Previous Stages
          </button>
        </div>
      </div>
    </div>
  );
}
