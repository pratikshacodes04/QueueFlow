/**
 * QueueFlow Application Constants
 */

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "QueueFlow",
  tagline: "Smart Queue Management System",
  version: "1.0.0",
};

export const API_ENDPOINTS = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  root: "/",
  health: "/health",
  docs: "http://localhost:8000/docs",
};

export const STATUS_TYPES = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  ERROR: "error",
  LOADING: "loading",
};

