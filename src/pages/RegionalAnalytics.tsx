import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Settings,
  Check,
  AlertCircle,
} from 'lucide-react';
import { usePatientStore } from '../contexts/PatientStore';
import {
  aggregateDataByRegion,
  formatRegionalSummaryForAI,
  type RegionalStats,
} from '../utils/regionalDataAggregator';
import {
  generateRegionalAnalysis,
  isValidOpenRouterKey,
  type RegionalReport,
} from '../utils/openRouterClient';
import {
  getOpenRouterKey,
  getOpenRouterModel,
} from '../utils/aiPreferences';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type TileProvider = {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string;
};

function buildTileLayerOptions(provider: TileProvider): L.TileLayerOptions {
  return {
    attribution: provider.attribution,
    maxZoom: provider.maxZoom ?? 19,
    ...(provider.subdomains ? { subdomains: provider.subdomains } : {}),
  };
}

const FREE_TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'osm-hot',
    name: 'OSM Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, Tiles style by HOT',
    maxZoom: 19,
  },
  {
    id: 'esri-streets',
    name: 'Esri World Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
  },
  {
    id: 'carto-voyager',
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
];

const RegionalAnalytics: React.FC = () => {
  const { patients, recordings } = usePatientStore();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionalStats, setRegionalStats] = useState<RegionalStats[]>([]);
  const [regionalReports, setRegionalReports] = useState<
    Record<string, RegionalReport>
  >({});
  const [analysisMessages, setAnalysisMessages] = useState<
    Record<string, string>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedMapProvider, setSelectedMapProvider] = useState<string>(() =>
    localStorage.getItem('regional_map_provider') || 'osm-hot'
  );
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const tileLayerRef = React.useRef<L.TileLayer | null>(null);
  const markerLayersRef = React.useRef<Record<string, L.CircleMarker>>({});

  // Aggregate data by region
  useEffect(() => {
    const stats = aggregateDataByRegion(patients, recordings);
    setRegionalStats(stats);
  }, [patients, recordings]);

  // Initialize map container
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // Map already initialized

    try {
      const map = L.map(mapContainerRef.current, {
        attributionControl: true,
      }).setView([20.5937, 78.9629], 4);

      mapRef.current = map;
      setIsMapReady(true);
    } catch (err) {
      console.error('Failed to initialize map:', err);
    }
  }, []);

  // Apply selected tile provider with fallback to OSM standard.
  useEffect(() => {
    if (!mapRef.current) return;

    localStorage.setItem('regional_map_provider', selectedMapProvider);

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const provider =
      FREE_TILE_PROVIDERS.find((p) => p.id === selectedMapProvider) ||
      FREE_TILE_PROVIDERS[0];

    const layer = L.tileLayer(provider.url, {
      ...buildTileLayerOptions(provider),
    });

    layer.on('tileerror', () => {
      if (!mapRef.current || provider.id === 'osm-standard') return;

      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }

      const fallback = FREE_TILE_PROVIDERS.find((p) => p.id === 'osm-standard');
      if (!fallback) return;

      const fallbackLayer = L.tileLayer(fallback.url, {
        ...buildTileLayerOptions(fallback),
      }).addTo(mapRef.current);

      tileLayerRef.current = fallbackLayer;
    });

    layer.addTo(mapRef.current);
    tileLayerRef.current = layer;
  }, [selectedMapProvider, isMapReady]);

  // Update map markers based on regional stats and selection
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    Object.values(markerLayersRef.current).forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    markerLayersRef.current = {};

    // Add new markers
    regionalStats.forEach((region) => {
      const isSelected = region.region === selectedRegion;
      const riskColors = {
        Low: '#22c55e',
        Medium: '#f59e0b',
        High: '#ef4444',
      };

      const radius = 8 + (region.recordingCount / 5) * 2;
      const color = riskColors[region.riskLevel];

      const marker = L.circleMarker([region.latitude, region.longitude], {
        radius: isSelected ? radius + 5 : radius,
        fillColor: color,
        color: isSelected ? '#60a5fa' : color,
        weight: isSelected ? 4 : 2,
        opacity: 0.8,
        fillOpacity: isSelected ? 0.8 : 0.6,
      })
        .bindPopup(
          `<div style="font-size: 12px">
          <strong>${region.region}</strong><br>
          Patients: ${region.patientCount}<br>
          Recordings: ${region.recordingCount}<br>
          Risk: ${region.riskLevel}
        </div>`
        )
        .on('click', () => {
          setSelectedRegion(region.region);
        })
        .addTo(mapRef.current!);

      markerLayersRef.current[region.region] = marker;
    });
  }, [regionalStats, selectedRegion]);

  // Generate analysis for selected region
  const handleAnalyzeRegion = async () => {
    if (!selectedRegion) return;
    const openRouterKey = getOpenRouterKey();
    if (!openRouterKey || !isValidOpenRouterKey(openRouterKey)) {
      alert('Please configure OpenRouter API key first');
      return;
    }

    const region = regionalStats.find((r) => r.region === selectedRegion);
    if (!region) return;

    setShowReportPanel(true);
    setAnalysisMessages((prev) => ({
      ...prev,
      [region.region]: '',
    }));
    setIsAnalyzing(true);
    try {
      const summary = formatRegionalSummaryForAI([region]);
      const report = await generateRegionalAnalysis(
        region.region,
        summary,
        openRouterKey,
        getOpenRouterModel('regionalAnalytics')
      );

      setRegionalReports((prev) => ({
        ...prev,
        [region.region]: {
          ...report,
          riskLevel: region.riskLevel,
        },
      }));
      setAnalysisMessages((prev) => ({
        ...prev,
        [region.region]: '',
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error from AI request.';
      setAnalysisMessages((prev) => ({
        ...prev,
        [region.region]: `Request failed: ${message}`,
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openRouterConfigured = isValidOpenRouterKey(getOpenRouterKey());

  const selectedRegionData = regionalStats.find(
    (r) => r.region === selectedRegion
  );
  const selectedReport = selectedRegion
    ? regionalReports[selectedRegion]
    : null;
  const selectedAnalysisMessage = selectedRegion
    ? analysisMessages[selectedRegion]
    : '';

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={32} color="var(--primary-color)" />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Regional Health Analytics
            </h1>
          </div>
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: openRouterConfigured
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(239,68,68,0.15)',
              border: `1px solid ${
                openRouterConfigured
                  ? 'rgba(134,239,172,0.35)'
                  : 'rgba(244,63,94,0.35)'
              }`,
              color: openRouterConfigured ? '#86efac' : '#f87171',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Settings size={16} />
            {openRouterConfigured ? 'AI configured in Settings' : 'Set AI key in Settings'}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <label
            htmlFor="regional-map-provider"
            style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
          >
            Map Provider
          </label>
          <select
            id="regional-map-provider"
            value={selectedMapProvider}
            onChange={(e) => setSelectedMapProvider(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          >
            {FREE_TILE_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: '24px', minHeight: '600px' }}>
        {/* Map */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass"
          style={{
            flex: 1,
            borderRadius: '12px',
            overflow: 'hidden',
            minHeight: '600px',
          }}
        >
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a2e',
            }}
          />
        </motion.div>

        {/* Regional Data Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            width: '360px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Regions List */}
          <div className="glass" style={{ borderRadius: '12px', padding: 0 }}>
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              Regions ({regionalStats.length})
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {regionalStats.map((region) => {
                const isSelected = region.region === selectedRegion;
                const bgColor = {
                  Low: 'rgba(34,197,94,0.1)',
                  Medium: 'rgba(245,158,11,0.1)',
                  High: 'rgba(239,68,68,0.1)',
                };

                return (
                  <motion.button
                    key={region.region}
                    onClick={() => setSelectedRegion(region.region)}
                    whileHover={{ x: 2 }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: isSelected
                        ? 'var(--primary-color)'
                        : bgColor[region.riskLevel],
                      color: isSelected ? '#000' : 'var(--text-primary)',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: isSelected ? 700 : 500,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        {region.region}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {region.patientCount} patients •{' '}
                        {region.recordingCount} recordings
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: isSelected
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(0,0,0,0.2)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {region.riskLevel}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Analyze Button */}
          {selectedRegionData && (
            <button
              onClick={handleAnalyzeRegion}
              disabled={isAnalyzing}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--primary-color)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                opacity: isAnalyzing ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp size={16} /> Generate AI Report
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>

      {/* AI Report Panel */}
      {selectedRegionData && showReportPanel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass"
          style={{
            borderRadius: '12px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {isAnalyzing ? (
              <Loader2 size={24} className="animate-spin" color="#00d2ff" />
            ) : selectedReport?.priorityLevel === 'High' ? (
              <AlertTriangle size={24} color="#ef4444" />
            ) : selectedReport?.priorityLevel === 'Medium' ? (
              <AlertCircle size={24} color="#f59e0b" />
            ) : (
              <Check size={24} color="#22c55e" />
            )}
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              {selectedRegionData.region} AI Report
            </h2>
            {selectedReport && !isAnalyzing && (
              <span
                style={{
                  marginLeft: 'auto',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  background:
                    selectedReport.priorityLevel === 'High'
                      ? 'rgba(239,68,68,0.2)'
                      : selectedReport.priorityLevel === 'Medium'
                      ? 'rgba(245,158,11,0.2)'
                      : 'rgba(34,197,94,0.2)',
                  color:
                    selectedReport.priorityLevel === 'High'
                      ? '#f87171'
                      : selectedReport.priorityLevel === 'Medium'
                      ? '#fbbf24'
                      : '#86efac',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                }}
              >
                {selectedReport.priorityLevel} Priority
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {isAnalyzing && (
              <div
                style={{
                  height: '6px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '40%',
                    borderRadius: '999px',
                    background:
                      'linear-gradient(90deg, rgba(0,210,255,0) 0%, rgba(0,210,255,0.95) 50%, rgba(0,210,255,0) 100%)',
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '360px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              <div
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '82%',
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                Asking AI to analyze aggregated health data for {selectedRegionData.region}.
              </div>

              {isAnalyzing && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '82%',
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'rgba(0,210,255,0.08)',
                    border: '1px solid rgba(0,210,255,0.25)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Loader2 size={16} className="animate-spin" color="#00d2ff" />
                    <strong>Generating report</strong>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ height: '10px', width: '78%', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                      <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, width: '45%', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)' }} />
                    </div>
                    <div style={{ height: '10px', width: '62%', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                      <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: 0.12 }} style={{ position: 'absolute', inset: 0, width: '45%', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,210,255,0.9) 50%, rgba(255,255,255,0) 100%)' }} />
                    </div>
                    <div style={{ height: '10px', width: '90%', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                      <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: 0.24 }} style={{ position: 'absolute', inset: 0, width: '45%', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)' }} />
                    </div>
                  </div>
                </div>
              )}

              {selectedAnalysisMessage.startsWith('Request failed:') && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '82%',
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: selectedAnalysisMessage.startsWith('Request failed:')
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(16,185,129,0.12)',
                    border: selectedAnalysisMessage.startsWith('Request failed:')
                      ? '1px solid rgba(239,68,68,0.28)'
                      : '1px solid rgba(16,185,129,0.28)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}
                >
                  {selectedAnalysisMessage}
                </div>
              )}

              {selectedReport && !isAnalyzing && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '82%',
                    padding: '14px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--primary-color)' }}>
                    Regional AI Assessment
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <strong>Summary:</strong> {selectedReport.summary}
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <strong>Key Findings:</strong>
                  </div>
                  <ul
                    style={{
                      margin: '0 0 14px 18px',
                      padding: 0,
                      display: 'grid',
                      gap: '6px',
                    }}
                  >
                    {selectedReport.keyFindings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>

                  <div style={{ marginBottom: '10px' }}>
                    <strong>Recommendations:</strong>
                  </div>
                  <ol
                    style={{
                      margin: '0 0 0 18px',
                      padding: 0,
                      display: 'grid',
                      gap: '6px',
                    }}
                  >
                    {selectedReport.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ol>
                </div>
              )}

              {!selectedReport && !isAnalyzing && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '82%',
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {selectedAnalysisMessage.startsWith('Request failed:')
                    ? selectedAnalysisMessage
                    : 'Select a region and click Generate AI Report to populate this chat.'}
                </div>
              )}
            </div>

            {selectedReport && !isAnalyzing && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Total Patients
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                    {selectedRegionData.patientCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Total Recordings
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                    {selectedRegionData.recordingCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Avg Age
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                    {selectedRegionData.ageStats.mean.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    Risk Level
                  </div>
                  <div
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      color:
                        selectedRegionData.riskLevel === 'High'
                          ? '#ef4444'
                          : selectedRegionData.riskLevel === 'Medium'
                          ? '#f59e0b'
                          : '#22c55e',
                    }}
                  >
                    {selectedRegionData.riskLevel}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Help Text */}
      {!selectedRegion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '20px',
            background: 'rgba(0,150,200,0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(0,150,200,0.3)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
        }}
        >
          <MapPin size={20} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
          <p style={{ margin: 0 }}>
            Click on a region on the map to view its health data and generate AI-powered recommendations.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RegionalAnalytics;
