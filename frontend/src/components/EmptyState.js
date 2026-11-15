import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No data found",
  description = "There are no records matching your criteria.",
  actionText,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon-box">
        <Icon size={24} />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-desc">{description}</p>
      {actionText && onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary btn-sm">
          {actionText}
        </button>
      )}
    </div>
  );
}

