/**
 * OpenRouter API Integration
 * Sends regional health data (bulk statistics only, no PII) to Claude for analysis
 * Generates actionable recommendations for each region
 */

export interface RegionalReport {
  region: string;
  riskLevel: string;
  summary: string;
  recommendations: string[];
  keyFindings: string[];
  priorityLevel: 'Low' | 'Medium' | 'High';
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Generate analysis for a region based on aggregated health data
 */
export async function generateRegionalAnalysis(
  regionName: string,
  bulkDataSummary: string,
  openRouterKey: string,
  model = 'anthropic/claude-sonnet-4'
): Promise<RegionalReport> {
  if (!openRouterKey || openRouterKey.trim() === '') {
    throw new Error('OpenRouter API key not configured');
  }

  const systemPrompt = `You are a healthcare data analyst. Analyze the provided regional health data (bulk statistics only, NO individual patient data) and provide:

1. **Summary**: 2-3 sentence overview of regional health status
2. **Key Findings**: 3-4 bullet points of notable trends
3. **Recommendations**: 4-5 actionable steps for healthcare providers in this region (focus on prevention, resource allocation, community programs)
4. **Priority Level**: Classify as Low/Medium/High based on:
   - Risk level of biomarkers
   - High variance in measurements (indicates inconsistent health management)
   - Population size requiring intervention

=== CRITICAL DATA SECURITY RULES ===
1. NEVER EVER include or infer any individual patient names, identities, or personal information.
2. Only analyze and discuss aggregated statistics (means, distributions, counts, ranges).
3. All recommendations must be population/community-level, NEVER individual-specific.
4. All findings must reference only bulk statistics, never individual cases.
5. Do not attempt to identify or discuss any specific individuals.
6. Refuse any requests that would require disclosing patient-level data.

Be specific, data-driven, and practical. All recommendations should be implementable at regional/community level.
NEVER mention any patient names, identities, or individual details under any circumstances.`;

  const userPrompt = `Analyze this regional health data for ${regionName}:

${bulkDataSummary}

Provide your analysis in JSON format:
{
  "summary": "...",
  "keyFindings": ["...", "...", "..."],
  "recommendations": ["...", "...", "...", "..."],
  "priorityLevel": "Low|Medium|High"
}`;

  const requestModel = async (modelName: string) => {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Spectru Regional Health Analytics',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    return response;
  };

  try {
    let response = await requestModel(model);

    if (!response.ok) {
      const errorText = await response.text();

      // Stale/unsupported model IDs can persist in localStorage; retry once with a stable default.
      if (
        response.status === 404 &&
        errorText.toLowerCase().includes('no endpoints found') &&
        model !== 'anthropic/claude-sonnet-4'
      ) {
        response = await requestModel('anthropic/claude-sonnet-4');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter error ${response.status}: ${errorText || response.statusText}`
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const content = Array.isArray(rawContent)
      ? rawContent
          .map((part) => (typeof part?.text === 'string' ? part.text : ''))
          .join('\n')
      : typeof rawContent === 'string'
      ? rawContent
      : '';

    if (!content) {
      throw new Error('No response content from OpenRouter API');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      region: regionName,
      riskLevel: 'Calculate based on data', // This should be included from caller
      summary: parsed.summary,
      recommendations: parsed.recommendations || [],
      keyFindings: parsed.keyFindings || [],
      priorityLevel: parsed.priorityLevel || 'Medium',
    };
  } catch (err) {
    console.error('Error calling OpenRouter API:', err);
    throw err instanceof Error ? err : new Error('Unknown OpenRouter error');
  }
}

/**
 * Batch analyze multiple regions
 */
export async function generateMultipleRegionalAnalyses(
  regionDataMap: Record<string, string>,
  openRouterKey: string
): Promise<RegionalReport[]> {
  const reports: RegionalReport[] = [];

  for (const [regionName, dataString] of Object.entries(regionDataMap)) {
    try {
      const report = await generateRegionalAnalysis(
        regionName,
        dataString,
        openRouterKey
      );
      if (report) {
        reports.push(report);
      }
    } catch (err) {
      console.error(`Failed to analyze region ${regionName}:`, err);
    }
  }

  return reports;
}

/**
 * Validate OpenRouter API key format
 */
export function isValidOpenRouterKey(key: string): boolean {
  if (!key) return false;
  return key.trim().length > 10;
}

/**
 * Validate that input is a medical/health-related analysis request
 * Prevents misuse for non-medical purposes
 */
export function isMedicalAnalysisRequest(userInput: string): boolean {
  const medicalKeywords = ['health', 'biomarker', 'patient', 'medical', 'disease', 'risk', 'diagnosis', 'treatment', 'wellness', 'epidemic', 'data', 'regional', 'analysis', 'recommendation', 'report', 'screening'];
  const lowerInput = userInput.toLowerCase();
  return medicalKeywords.some(keyword => lowerInput.includes(keyword));
}
