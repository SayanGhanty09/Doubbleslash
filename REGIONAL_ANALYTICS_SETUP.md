# Regional Analytics Setup Guide

## Overview
The new **Regional Analytics** feature provides AI-powered health insights for regions/states in India. It aggregates patient biomarker data by geographic region (without exposing individual patient information) and generates actionable recommendations using OpenRouter API.

## Setup Steps

### 1. Get OpenRouter API Key
1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Sign up (free tier available with $5 credit)
3. Go to Keys section
4. Create a new API key
5. Copy the key (format: `sk-or-v1-xxxxx...`)

### 2. Configure in Spectru App
1. Navigate to **Regional Analytics** page from sidebar (Map icon)
2. Click **"Configure API"** button (top right)
3. Paste your OpenRouter API key into the input field
4. Click **Save**
5. The button will turn green showing "API Configured"

### 3. Generate Regional Reports
1. **Select a Region**: Click on any region/circle on the map
2. **View Stats**: Region sidebar shows:
   - Patient count
   - Recording count
   - Risk level (Low/Medium/High)
3. **Generate Report**: Click "Generate AI Report" button
4. **Review Insights**: AI-generated analysis including:
   - Health status summary
   - Key findings from biomarker data
   - 4-5 actionable recommendations for healthcare providers
   - Priority level for intervention

## Data Privacy

### What's Included in Reports
✅ **Bulk Aggregated Statistics** (Safe):
- Mean, median, std deviation of biomarkers
- Age distribution
- Gender distribution
- Patient counts
- Recording frequency

### What's NOT Included (Never sent to AI)
❌ **Patient Information** (Never exposed):
- Individual patient names
- Individual medications
- Individual diagnoses
- Specific age of any patient
- Any identifying information

## Understanding the Reports

### Risk Levels
- **Low**: Stable biomarkers, consistent health measurements
- **Medium**: Moderate variance or some elevated values
- **High**: High variance indicating inconsistent management, or significant risk indicators

### Biomarker Statistics
For each health measurement detected in recordings, you'll see:
- **Mean**: Average value across all measurements in region
- **StdDev**: How much values vary (high = inconsistent management)
- **Range**: [Min, Max] values observed

### Recommendations
All recommendations focus on:
- Community-level interventions (not individual treatment)
- Regional resource allocation
- Prevention programs
- Health awareness programs
- Data collection improvements

## Map Visualization

### Circle Colors
- 🟢 **Green**: Low risk
- 🟡 **Yellow**: Medium risk
- 🔴 **Red**: High risk

### Circle Size
- Larger circles = more recordings in that region
- Indicates data density and engagement

### Interaction
- Click any region to select
- Selected region highlights with blue border
- Hover popup shows quick stats

## API Security Notes

⚠️ **Current Implementation**: API key is stored in browser's localStorage
- Suitable for personal/development use
- NOT suitable for production deployment

## Production Recommendation
For production environment, consider:
1. Move API key to environment variable
2. Send region analysis requests to backend
3. Backend communicates with OpenRouter API
4. Backend returns analyzed report to frontend
5. This prevents exposing API key in client code

## Troubleshooting

### "Please configure OpenRouter API key first"
- Click "Configure API" button
- Paste a valid API key
- Save and try again

### "Failed to analyze region"
- Check OpenRouter API key is valid
- Ensure you have remaining credits (free tier: $5)
- Check browser console for error details
- Try again in a few seconds

### No regions showing on map
- Ensure patients exist in Patient Management
- Ensure patients have location data (latitude/longitude)
- Try refreshing the page

### Regions not clickable
- Ensure you have location data for at least one patient
- Must have latitude AND longitude coordinates

## Advanced: Customizing AI Instructions

To modify what Claude analyzes, edit the `systemPrompt` in `/src/utils/openRouterClient.ts`:

```typescript
const systemPrompt = `You are a healthcare data analyst. Analyze the provided 
regional health data (bulk statistics only, NO individual patient data) and provide:
...`
```

Currently configured to provide:
1. Health status summary
2. Key findings
3. Actionable recommendations  
4. Priority level classification

## Support

For issues with:
- **OpenRouter API**: See [OpenRouter Documentation](https://openrouter.ai/docs)
- **Regional Analytics Feature**: Check console errors (F12 → Console)
- **Data Accuracy**: Verify patient location data is complete

---

**Last Updated**: March 24, 2026  
**API Model**: Claude 3.5 Sonnet (via OpenRouter)  
**Data Format**: Bulk statistics only, zero PII exposure
