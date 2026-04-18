export type AIFeatureMode = 'liveRecording' | 'regionalAnalytics' | 'assistantChat';

const OPENROUTER_KEY_STORAGE = 'spectru_openrouter_key';
const OPENROUTER_MODELS_STORAGE = 'spectru_openrouter_models';

const DEFAULT_MODELS: Record<AIFeatureMode, string> = {
  liveRecording: 'x-ai/grok-4.1-fast',
  regionalAnalytics: 'anthropic/claude-sonnet-4',
  assistantChat: 'google/gemini-2.0-flash-001',
};

export const AI_MODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { value: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro' },
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast' },
  { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
  { value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
];

const ALLOWED_MODELS = new Set(AI_MODE_OPTIONS.map((option) => option.value));

type StoredModels = Partial<Record<AIFeatureMode, string>>;

function readStoredModels(): StoredModels {
  try {
    const raw = localStorage.getItem(OPENROUTER_MODELS_STORAGE);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as StoredModels;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredModels(models: StoredModels): void {
  localStorage.setItem(OPENROUTER_MODELS_STORAGE, JSON.stringify(models));
}

export function getOpenRouterKey(): string {
  return localStorage.getItem(OPENROUTER_KEY_STORAGE) || '';
}

export function setOpenRouterKey(key: string): void {
  localStorage.setItem(OPENROUTER_KEY_STORAGE, key);
}

export function getOpenRouterModel(mode: AIFeatureMode): string {
  const stored = readStoredModels()[mode];
  if (stored && ALLOWED_MODELS.has(stored)) {
    return stored;
  }

  return DEFAULT_MODELS[mode];
}

export function setOpenRouterModel(mode: AIFeatureMode, model: string): void {
  const models = readStoredModels();
  models[mode] = model;
  writeStoredModels(models);
}

export function getAIModeLabel(mode: AIFeatureMode): string {
  switch (mode) {
    case 'liveRecording':
      return 'Live Recording';
    case 'regionalAnalytics':
      return 'Regional Analytics';
    case 'assistantChat':
      return 'AI Assistant Chat';
  }
}