/**
 * DRAPE Frontend API Integration Client.
 * 
 * Provides typed methods for backend connectivity, health verification,
 * and error handling conforming to RFC 9457 Problem Details.
 */

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ReadyResponse {
  status: "ready" | "unhealthy";
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: "connected" | "disconnected";
  };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Checks backend liveness probe via GET /healthz.
 */
export async function fetchBackendHealth(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/healthz`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unable to establish connection with DRAPE API backend.");
  }
}

/**
 * Checks backend readiness probe via GET /readyz.
 */
export async function fetchBackendReadiness(): Promise<ReadyResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/readyz`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unable to reach DRAPE API readiness endpoint.");
  }
}

