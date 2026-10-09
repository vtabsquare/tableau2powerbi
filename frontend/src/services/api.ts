import { MigrationProject, Relationship, SourceMapping } from '../types/project';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = window.localStorage?.getItem('T2PBI_API_BASE_URL');
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/$/, '');
    }
  }

  let raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

  // If Render internal private host was provided (e.g. "tableau2pbi-backend" without dots and not localhost)
  if (raw && !raw.includes('.') && !raw.startsWith('http://localhost') && !raw.startsWith('http://127.0.0.1')) {
    raw = `${raw}.onrender.com`;
  }

  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  // Fallback: If running on onrender.com frontend, infer backend onrender.com host
  if (typeof window !== 'undefined' && window.location?.hostname?.endsWith('.onrender.com')) {
    const currentHost = window.location.hostname;
    const backendHost = currentHost.replace(/-frontend\b/, '-backend');
    if (backendHost !== currentHost) {
      return `https://${backendHost}`;
    }
    return 'https://tableau2pbi-backend.onrender.com';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
}

export function setCustomApiBaseUrl(url: string | null): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      window.localStorage?.removeItem('T2PBI_API_BASE_URL');
    } else {
      window.localStorage?.setItem('T2PBI_API_BASE_URL', url.trim());
    }
  }
}

export const API_BASE_URL = getApiBaseUrl();

export function makeAbsoluteApiUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getApiBaseUrl();
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const msg = (err as Error)?.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      const currentBase = getApiBaseUrl();
      throw new Error(
        `Cannot connect to backend server at ${currentBase}. ` +
        `If the backend is hosted on Render free tier, it spins down after 15 minutes of inactivity and may take 30-50 seconds to wake up. ` +
        `Please wait a few seconds and try again, or check that your Render backend service is running.`
      );
    }
    throw err;
  }
}

export async function testBackendConnection(): Promise<{ ok: boolean; message: string; version?: string }> {
  try {
    const url = `${getApiBaseUrl()}/api/health`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: 'Backend connected successfully', version: data.version };
    }
    return { ok: false, message: `Backend responded with HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.detail || JSON.stringify(body);
    } catch {
      message = await response.text();
    }
    throw new Error(message || `Request failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function assertTableauBackend(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await apiFetch(`${baseUrl}/api/health`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Backend health check failed with HTTP ${response.status}`);
    }
    const health = await response.json();
    if (!String(health.application || '').includes('TABLEAU2PBI')) {
      throw new Error(`The backend at ${baseUrl} is not running the TABLEAU2PBI service.`);
    }
    const backendVersion = String(health.version || '0.0.0');
    const majorVersion = Number.parseInt(backendVersion.split('.')[0] || '0', 10);
    if (!Number.isFinite(majorVersion) || majorVersion < 11) {
      throw new Error(
        `Backend at ${baseUrl} is running an incompatible version (${backendVersion}). ` +
        'Please ensure the latest backend version is running.'
      );
    }
  } catch (error) {
    throw new Error(`Cannot connect to TABLEAU2PBI backend at ${baseUrl}. Details: ${(error as Error).message}`);
  }
}

export async function uploadProject(files: File[]): Promise<MigrationProject> {
  await assertTableauBackend();
  const form = new FormData();
  files.forEach(file => form.append('files', file, file.name));
  const response = await apiFetch(`${getApiBaseUrl()}/api/projects/upload`, { method: 'POST', body: form });
  return asJson<MigrationProject>(response);
}

export async function loadDemo(): Promise<MigrationProject> {
  await assertTableauBackend();
  const response = await apiFetch(`${getApiBaseUrl()}/api/projects/demo`, { method: 'POST' });
  return asJson<MigrationProject>(response);
}

export async function saveSourceMappings(projectId: string, mappings: SourceMapping[]): Promise<MigrationProject> {
  await assertTableauBackend();
  const response = await apiFetch(`${getApiBaseUrl()}/api/projects/${projectId}/source-mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappings)
  });
  return asJson<MigrationProject>(response);
}

export async function saveRelationships(projectId: string, relationships: Relationship[]): Promise<MigrationProject> {
  await assertTableauBackend();
  const response = await apiFetch(`${getApiBaseUrl()}/api/projects/${projectId}/relationships`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(relationships)
  });
  return asJson<MigrationProject>(response);
}

export async function exportProject(projectId: string): Promise<{download_url: string; absolute_download_url?: string; export_path: string; health_status: string}> {
  await assertTableauBackend();
  const response = await apiFetch(`${getApiBaseUrl()}/api/projects/${projectId}/export`, { method: 'POST' });
  const result = await asJson<{download_url: string; absolute_download_url?: string; export_path: string; health_status: string}>(response);
  return { ...result, absolute_download_url: result.absolute_download_url || makeAbsoluteApiUrl(result.download_url) };
}

export async function downloadExportPackage(downloadUrl: string, filename: string): Promise<void> {
  const absoluteUrl = makeAbsoluteApiUrl(downloadUrl);
  const response = await apiFetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}: ${await response.text()}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export async function login(username: string, password: string): Promise<{authenticated: boolean}> {
  const response = await apiFetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, password})
  });
  return asJson(response);
}

export async function registerRequest(email: string): Promise<{status: string; message: string; email: string; dev_otp?: string}> {
  const response = await apiFetch(`${getApiBaseUrl()}/api/auth/register-request`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email})
  });
  return asJson(response);
}

export async function verifyOtp(email: string, otp: string): Promise<{status: string; message: string; email: string; requires_password_creation: boolean}> {
  const response = await apiFetch(`${getApiBaseUrl()}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, otp})
  });
  return asJson(response);
}

export async function createPassword(email: string, otp: string, password: string): Promise<{authenticated: boolean; display_name: string; role: string; message: string}> {
  const response = await apiFetch(`${getApiBaseUrl()}/api/auth/create-password`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, otp, password})
  });
  return asJson(response);
}

export async function deleteProject(projectId: string): Promise<{deleted: boolean; project_id: string; message: string}> {
  await assertTableauBackend();
  const response = await apiFetch(`${getApiBaseUrl()}/api/projects/${projectId}`, { method: 'DELETE' });
  return asJson(response);
}

