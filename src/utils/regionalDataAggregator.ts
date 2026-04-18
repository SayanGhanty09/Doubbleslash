/**
 * Regional Data Aggregator
 * Aggregates patient and biomarker data by region (state/geographic clusters)
 * Ensures NO patient PII is exposed, only bulk statistics
 */

import type { Patient, RecordingEntry } from '../contexts/PatientStore';

export interface RegionalBiomarkerStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  count: number;
}

export interface RegionalStats {
  region: string;
  state?: string;
  latitude: number;
  longitude: number;
  patientCount: number;
  recordingCount: number;
  ageStats: {
    min: number;
    max: number;
    mean: number;
  };
  sexDistribution: {
    Male: number;
    Female: number;
    Other: number;
  };
  biomarkerStats: Record<string, RegionalBiomarkerStats>;
  riskLevel: 'Low' | 'Medium' | 'High'; // Calculated based on biomarker trends
}

// Indian states with approximate geographic centers for clustering
const INDIAN_STATES = {
  'Andhra Pradesh': { lat: 15.9129, lon: 78.6675 },
  'Arunachal Pradesh': { lat: 28.2180, lon: 94.7278 },
  'Assam': { lat: 26.2006, lon: 92.9376 },
  'Bihar': { lat: 25.0961, lon: 85.3131 },
  'Chhattisgarh': { lat: 21.2787, lon: 81.8661 },
  'Goa': { lat: 15.2993, lon: 73.8243 },
  'Gujarat': { lat: 22.2587, lon: 71.1924 },
  'Haryana': { lat: 29.0588, lon: 77.0745 },
  'Himachal Pradesh': { lat: 31.7433, lon: 77.1205 },
  'Jharkhand': { lat: 23.6102, lon: 85.2799 },
  'Karnataka': { lat: 15.3173, lon: 75.7139 },
  'Kerala': { lat: 10.8505, lon: 76.2711 },
  'Madhya Pradesh': { lat: 22.9375, lon: 78.6553 },
  'Maharashtra': { lat: 19.7515, lon: 75.7139 },
  'Manipur': { lat: 24.6637, lon: 93.9063 },
  'Meghalaya': { lat: 25.4670, lon: 91.3662 },
  'Mizoram': { lat: 23.1815, lon: 92.9789 },
  'Nagaland': { lat: 26.1584, lon: 94.5624 },
  'Odisha': { lat: 20.9517, lon: 85.0985 },
  'Punjab': { lat: 31.5497, lon: 74.3436 },
  'Rajasthan': { lat: 27.0238, lon: 74.2179 },
  'Sikkim': { lat: 27.5330, lon: 88.5122 },
  'Tamil Nadu': { lat: 11.1271, lon: 79.2787 },
  'Telangana': { lat: 18.1124, lon: 79.0193 },
  'Tripura': { lat: 23.9408, lon: 91.9882 },
  'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
  'Uttarakhand': { lat: 30.0668, lon: 79.0193 },
  'West Bengal': { lat: 24.5155, lon: 88.2289 },
};

/**
 * Calculate statistics from a number array
 */
function calculateStats(values: number[]): RegionalBiomarkerStats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, median, stdDev, count: values.length };
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function normalizeLocationToken(value?: string): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized;
}

/**
 * Determine risk level based on biomarker statistics
 * This is a simple heuristic; adjust based on actual medical guidelines
 */
function determineRiskLevel(
  biomarkerStats: Record<string, RegionalBiomarkerStats>
): 'Low' | 'Medium' | 'High' {
  // Check for high variance or extreme values
  let riskScore = 0;

  for (const [_, stats] of Object.entries(biomarkerStats)) {
    // If standard deviation is high relative to mean, it indicates variability
    if (stats.mean > 0 && stats.stdDev / stats.mean > 0.5) {
      riskScore += 1;
    }
    // If max value is significantly higher than mean
    if (stats.mean > 0 && stats.max / stats.mean > 2) {
      riskScore += 1;
    }
  }

  if (riskScore >= 4) return 'High';
  if (riskScore >= 2) return 'Medium';
  return 'Low';
}

/**
 * Get state from patient location (state field or infer from coordinates)
 */
function getPatientState(patient: Patient): string {
  if (patient.state) return patient.state;
  if (patient.latitude && patient.longitude) {
    // Find closest state by coordinates
    let closest = 'Other';
    let minDistance = Infinity;
    for (const [state, coords] of Object.entries(INDIAN_STATES)) {
      const distance = Math.sqrt(
        Math.pow(patient.latitude - coords.lat, 2) +
        Math.pow(patient.longitude - coords.lon, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = state;
      }
    }
    return closest;
  }
  return 'Other';
}

function getPatientRegion(patient: Patient): { region: string; state: string } {
  const state = normalizeLocationToken(patient.state) ?? getPatientState(patient);
  const city = normalizeLocationToken(patient.city);

  // Prefer smaller locality grouping when available.
  if (city) {
    const region =
      city.toLowerCase() === state.toLowerCase() ? city : `${city}, ${state}`;
    return { region, state };
  }

  return { region: state, state };
}

/**
 * Aggregate all patient data by region
 * Returns regional statistics without exposing individual patient details
 */
export function aggregateDataByRegion(
  patients: Patient[],
  recordings: RecordingEntry[]
): RegionalStats[] {
  const regionData: Record<
    string,
    {
      state: string;
      patients: Patient[];
      recordings: RecordingEntry[];
    }
  > = {};

  const patientRegionById: Record<string, { region: string; state: string }> = {};

  // Group patients by smaller locality first (city), then fallback to state.
  for (const patient of patients) {
    const regionInfo = getPatientRegion(patient);
    patientRegionById[patient.id] = regionInfo;

    if (!regionData[regionInfo.region]) {
      regionData[regionInfo.region] = {
        state: regionInfo.state,
        patients: [],
        recordings: [],
      };
    }
    regionData[regionInfo.region].patients.push(patient);
  }

  // Group recordings by patient's region
  for (const recording of recordings) {
    const regionInfo = patientRegionById[recording.patientId];
    if (regionInfo && regionData[regionInfo.region]) {
      regionData[regionInfo.region].recordings.push(recording);
    }
  }

  // Transform to RegionalStats
  const stats: RegionalStats[] = [];

  for (const [regionName, data] of Object.entries(regionData)) {
    if (data.patients.length === 0) continue;

    const stateCoords = INDIAN_STATES[data.state as keyof typeof INDIAN_STATES] || {
      lat: 20.5937,
      lon: 78.9629,
    };

    const validCoords = data.patients.filter(
      (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
    );

    // Use coordinate concentration (median center) when available.
    const representativeCoords =
      validCoords.length > 0
        ? {
            lat: calculateMedian(validCoords.map((p) => p.latitude as number)),
            lon: calculateMedian(validCoords.map((p) => p.longitude as number)),
          }
        : stateCoords;

    // Calculate age statistics
    const ages = data.patients.map((p) => p.age || 0);
    const ageStats = {
      min: Math.min(...ages),
      max: Math.max(...ages),
      mean: ages.reduce((a, b) => a + b, 0) / ages.length,
    };

    // Calculate sex distribution
    const sexDistribution = { Male: 0, Female: 0, Other: 0 };
    for (const patient of data.patients) {
      sexDistribution[patient.sex]++;
    }

    // Aggregate biomarker statistics
    const biomarkerData: Record<string, number[]> = {};
    for (const recording of data.recordings) {
      for (const [key, value] of Object.entries(recording.biomarkers)) {
        if (value !== undefined) {
          if (!biomarkerData[key]) biomarkerData[key] = [];
          biomarkerData[key].push(value);
        }
      }
    }

    const biomarkerStats: Record<string, RegionalBiomarkerStats> = {};
    for (const [key, values] of Object.entries(biomarkerData)) {
      biomarkerStats[key] = calculateStats(values);
    }

    const riskLevel = determineRiskLevel(biomarkerStats);

    stats.push({
      region: regionName,
      state: data.state,
      latitude: representativeCoords.lat,
      longitude: representativeCoords.lon,
      patientCount: data.patients.length,
      recordingCount: data.recordings.length,
      ageStats,
      sexDistribution,
      biomarkerStats,
      riskLevel,
    });
  }

  return stats.sort((a, b) => b.recordingCount - a.recordingCount);
}

/**
 * Format regional stats into a summary for AI analysis
 * Ensures NO patient PII is exposed
 */
export function formatRegionalSummaryForAI(stats: RegionalStats[]): string {
  const summaries = stats.map(
    (region) =>
      `
### Region: ${region.region}
- **Patients**: ${region.patientCount}
- **Recordings**: ${region.recordingCount}
- **Risk Level**: ${region.riskLevel}
- **Age Range**: ${region.ageStats.min}-${region.ageStats.max} years (avg: ${region.ageStats.mean.toFixed(
        1
      )})
- **Gender Distribution**: Male ${region.sexDistribution.Male}, Female ${
        region.sexDistribution.Female
      }, Other ${region.sexDistribution.Other}
- **Biomarker Summary**:
${Object.entries(region.biomarkerStats)
  .map(
    ([name, stats]) =>
      `  - ${name}: Mean=${stats.mean.toFixed(2)}, StdDev=${stats.stdDev.toFixed(
        2
      )}, Range=[${stats.min.toFixed(2)}, ${stats.max.toFixed(2)}]`
  )
  .join('\n')}
`
  );

  return summaries.join('\n');
}
