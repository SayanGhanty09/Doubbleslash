export interface ExchangePatientPayload {
  id: string;
  name: string;
  age: number;
  sex: string;
}

export interface ExchangeBiomarkersPayload {
  spo2: number | null;
  heartRate: number | null;
  perfusionIndex: number | null;
  signalQuality: number | null;
  sdnn: number | null;
  rmssd: number | null;
  hemoglobin: number | null;
  bilirubin: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulseRate: number | null;
  respirationRate: number | null;
}

export interface ExchangeRequestPayload {
  deviceName: string;
  patient: ExchangePatientPayload;
  timestamp: string;
  biomarkers: ExchangeBiomarkersPayload;
}

export interface LiveReportFinding {
  parameter: string;
  value: string;
  status: 'normal' | 'borderline' | 'abnormal';
  interpretation: string;
}

export interface LiveReportResult {
  healthScore: number;
  summary: string;
  findings: LiveReportFinding[];
  recommendations: string[];
  warnings: string[];
  disclaimer: string;
}

export interface ExchangeApiResponse {
  request_id?: string;
  status?: string;
  website_message?: string;
  full_clinical_text?: string;
  medical_report?: unknown;
  output_json?: unknown;
}

const DEFAULT_EXCHANGE_BASE_URL = 'http://192.168.0.224:8000';
const EXCHANGE_BASE_URL_STORAGE = 'spectru_exchange_base_url';

function getExchangeBaseUrl(): string {
  const fromStorage = localStorage.getItem(EXCHANGE_BASE_URL_STORAGE)?.trim();
  if (fromStorage) return fromStorage.replace(/\/$/, '');

  const fromEnv = (import.meta.env.VITE_EXCHANGE_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  return DEFAULT_EXCHANGE_BASE_URL;
}

function parseStatus(value: unknown): 'normal' | 'borderline' | 'abnormal' {
  const lower = String(value ?? '').toLowerCase();
  if (lower === 'normal' || lower === 'borderline' || lower === 'abnormal') {
    return lower;
  }
  return 'normal';
}

function normalizeFindings(value: unknown): LiveReportFinding[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const record = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    return {
      parameter: String(record.parameter ?? 'PARAMETER'),
      value: String(record.value ?? '--'),
      status: parseStatus(record.status),
      interpretation: String(record.interpretation ?? ''),
    };
  });
}

export function normalizeMedicalReport(rawReport: unknown, fallbackSummary = ''): LiveReportResult {
  const report = typeof rawReport === 'object' && rawReport !== null
    ? (rawReport as Record<string, unknown>)
    : {};

  return {
    healthScore: Number(report.healthScore ?? 0),
    summary: String(report.summary ?? fallbackSummary),
    findings: normalizeFindings(report.findings),
    recommendations: Array.isArray(report.recommendations)
      ? report.recommendations.map((item) => String(item))
      : [],
    warnings: Array.isArray(report.warnings)
      ? report.warnings.map((item) => String(item))
      : [],
    disclaimer: String(report.disclaimer ?? ''),
  };
}

function resolveMedicalReport(data: ExchangeApiResponse): unknown {
  if (data.medical_report) return data.medical_report;

  if (typeof data.output_json === 'object' && data.output_json !== null) {
    const outputObj = data.output_json as Record<string, unknown>;
    if (outputObj.medical_report) return outputObj.medical_report;
    return outputObj;
  }

  return null;
}

export async function requestLiveRecordingReport(payload: ExchangeRequestPayload): Promise<{
  requestId: string;
  report: LiveReportResult;
}> {
  const baseUrl = getExchangeBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exchange API error ${response.status}: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as ExchangeApiResponse;
  const report = normalizeMedicalReport(
    resolveMedicalReport(data),
    data.website_message || 'No clinical summary returned by exchange endpoint.'
  );

  if (!data.request_id) {
    throw new Error('Exchange API did not return request_id.');
  }

  return {
    requestId: data.request_id,
    report,
  };
}
