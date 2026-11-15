"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Sliders,
  CheckCircle2,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    soundAlerts: true,
    autoCallNext: false,
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    addToast({
      title: "Settings Saved",
      message: "Your preferences have been updated successfully.",
      type: "success",
    });
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile information and system preferences."
        showPreviewBadge={false}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "800px" }}>
        {/* Profile Details Card */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <User size={18} color="var(--primary)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Manager Profile</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  value={user?.name || "Manager"}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  className="form-input"
                  value={user?.email || "—"}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Phone size={15} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  value={user?.phone || "Not configured"}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Account Status</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <Shield size={15} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  value={user?.is_active ? "Active Manager" : "Inactive"}
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>
          <span className="form-hint" style={{ marginTop: "0.75rem", display: "block" }}>
            Profile details are managed by your administrator or set during registration.
          </span>
        </div>

        {/* Operational Preferences Card */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Sliders size={18} color="var(--primary)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Operational Preferences</h3>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>Desktop Sound Alerts</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Play an audible chime when a new customer joins or ticket is called.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.soundAlerts}
                  onChange={() => handleToggle("soundAlerts")}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </label>

              <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>Email Reports & Daily Digest</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Receive end-of-day summary reports on ticket completion and queue volume.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.emailAlerts}
                  onChange={() => handleToggle("emailAlerts")}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </label>

              <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>Auto-advance Customer Queue</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Automatically prompt to call next token upon completing the current session.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.autoCallNext}
                  onChange={() => handleToggle("autoCallNext")}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </label>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <button type="submit" className="btn btn-primary">
                <Save size={15} />
                <span>Save Preferences</span>
              </button>
              {saved && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8125rem", color: "var(--success)" }}>
                  <CheckCircle2 size={16} /> Saved
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

