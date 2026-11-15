import React from "react";
import { APP_CONFIG } from "@/utils/constants";

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} {APP_CONFIG.name} – {APP_CONFIG.tagline}.
        Built with Next.js, FastAPI, & MongoDB.
      </p>
    </footer>
  );
}

