import React from "react";
import { Sparkles } from "lucide-react";

export default function PageHeader({
  title,
  subtitle,
  actions,
  showPreviewBadge = true,
  badgeText = "Preview Data",
}) {
  return (
    <div className="page-header-container">
      <div className="page-title-group">
        <div className="page-title-row">
          <h1 className="page-heading">{title}</h1>
          {showPreviewBadge && (
            <span className="preview-badge-pill" title="Illustrative preview data mode">
              <Sparkles size={11} />
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {actions && <div className="page-actions-group">{actions}</div>}
    </div>
  );
}

