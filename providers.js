// providers.js — Multi-provider AI registry
// Each provider defines how to build a request and parse a response.
// Shared between background.js (service worker) and options.js (settings page).

const AI_PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-5, GPT-4.1, o3, etc.',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyPlaceholder: 'sk-...',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: true,
    defaultTextModel: 'gpt-5',
    defaultVisionModel: 'gpt-5',
    textModels: [
      { id: 'gpt-5', name: 'GPT-5 (flagship)' },
      { id: 'gpt-5.5', name: 'GPT-5.5 (latest flagship)' },
      { id: 'gpt-4.1', name: 'GPT-4.1 (stable)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini (fast, cheap)' }
    ],
    visionModels: [
      { id: 'gpt-5', name: 'GPT-5 (vision)' },
      { id: 'gpt-5.5', name: 'GPT-5.5 (vision)' },
      { id: 'gpt-4.1', name: 'GPT-4.1 (vision)' },
      { id: 'gpt-4o', name: 'GPT-4o (vision)' }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude Sonnet 4.5, Haiku, Opus',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyPlaceholder: 'sk-ant-...',
    endpoint: 'https://api.anthropic.com/v1/messages',
    authStyle: 'x-api-key',
    format: 'anthropic',
    supportsVision: true,
    defaultTextModel: 'claude-sonnet-4-5',
    defaultVisionModel: 'claude-sonnet-4-5',
    textModels: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (latest)' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (stable)' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (fast)' },
      { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet' }
    ],
    visionModels: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (vision)' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (vision)' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (vision)' }
    ]
  },

  google: {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini 3 preview, Gemini 2.5 stable',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyPlaceholder: 'AIza...',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    authStyle: 'query-key',
    format: 'google',
    supportsVision: true,
    defaultTextModel: 'gemini-2.5-pro',
    defaultVisionModel: 'gemini-2.5-pro',
    textModels: [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (preview)' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (preview)' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (preview)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (stable)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (stable, fast)' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (lightweight)' }
    ],
    visionModels: [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (preview, vision)' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (preview, vision)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (vision)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (vision)' }
    ]
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large 3, Medium, Small',
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    apiKeyPlaceholder: '...',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: true,
    defaultTextModel: 'mistral-large-latest',
    defaultVisionModel: 'mistral-large-latest',
    textModels: [
      { id: 'mistral-large-latest', name: 'Mistral Large 3 (flagship)' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium (balanced)' },
      { id: 'mistral-small-latest', name: 'Mistral Small (fast)' }
    ],
    visionModels: [
      { id: 'mistral-large-latest', name: 'Mistral Large 3 (vision)' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium (vision)' }
    ]
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast Llama, Mixtral, Gemma',
    apiKeyUrl: 'https://console.groq.com/keys',
    apiKeyPlaceholder: 'gsk_...',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: true,
    defaultTextModel: 'llama-3.3-70b-versatile',
    defaultVisionModel: 'llama-3.2-90b-vision-preview',
    textModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (versatile)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (instant)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B' }
    ],
    visionModels: [
      { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
      { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision' }
    ]
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 200+ models via one API',
    apiKeyUrl: 'https://openrouter.ai/keys',
    apiKeyPlaceholder: 'sk-or-...',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: true,
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/ScreenAI',
      'X-Title': 'ScreenAI'
    },
    defaultTextModel: 'openai/gpt-5',
    defaultVisionModel: 'openai/gpt-5',
    textModels: [
      { id: 'openai/gpt-5', name: 'OpenAI GPT-5' },
      { id: 'anthropic/claude-sonnet-4-5', name: 'Anthropic Claude Sonnet 4.5' },
      { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
      { id: 'mistralai/mistral-large', name: 'Mistral Large' }
    ],
    visionModels: [
      { id: 'openai/gpt-5', name: 'OpenAI GPT-5 (vision)' },
      { id: 'anthropic/claude-sonnet-4-5', name: 'Anthropic Claude Sonnet 4.5 (vision)' },
      { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro (vision)' }
    ]
  },

  xai: {
    id: 'xai',
    name: 'xAI Grok',
    description: 'Grok models from X.AI',
    apiKeyUrl: 'https://console.x.ai/',
    apiKeyPlaceholder: 'xai-...',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: true,
    defaultTextModel: 'grok-4.7',
    defaultVisionModel: 'grok-4.7',
    textModels: [
      { id: 'grok-4.7', name: 'Grok 4.7 (latest flagship)' },
      { id: 'grok-4.6', name: 'Grok 4.6' },
      { id: 'grok-4.5', name: 'Grok 4.5' },
      { id: 'grok-4.3', name: 'Grok 4.3' }
    ],
    visionModels: [
      { id: 'grok-4.7', name: 'Grok 4.7 (vision)' },
      { id: 'grok-4.6', name: 'Grok 4.6 (vision)' }
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V4 Flash, Pro',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    apiKeyPlaceholder: 'sk-...',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: false,
    defaultTextModel: 'deepseek-v4-flash',
    defaultVisionModel: 'deepseek-v4-flash',
    textModels: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash (fast)' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro (powerful)' }
    ],
    visionModels: []
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Sonar models with web search',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    apiKeyPlaceholder: 'pplx-...',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    authStyle: 'bearer',
    format: 'openai',
    supportsVision: false,
    defaultTextModel: 'sonar-pro',
    defaultVisionModel: 'sonar-pro',
    textModels: [
      { id: 'sonar-pro', name: 'Sonar Pro (flagship)' },
      { id: 'sonar', name: 'Sonar (fast)' },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro' },
      { id: 'sonar-deep-research', name: 'Sonar Deep Research' }
    ],
    visionModels: []
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    description: 'Command A, Command R',
    apiKeyUrl: 'https://dashboard.cohere.com/api-keys',
    apiKeyPlaceholder: '...',
    endpoint: 'https://api.cohere.com/v2/chat',
    authStyle: 'bearer',
    format: 'cohere',
    supportsVision: false,
    defaultTextModel: 'command-a-plus-05-2026',
    defaultVisionModel: 'command-a-plus-05-2026',
    textModels: [
      { id: 'command-a-plus-05-2026', name: 'Command A+ (latest)' },
      { id: 'command-a-03-2025', name: 'Command A' },
      { id: 'command-a-reasoning-08-2025', name: 'Command A Reasoning' },
      { id: 'command-r-plus-08-2024', name: 'Command R+' },
      { id: 'command-r-08-2024', name: 'Command R (fast)' }
    ],
    visionModels: []
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run models locally — no API key needed',
    apiKeyUrl: 'https://ollama.com/download',
    apiKeyPlaceholder: 'Not required for local',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    authStyle: 'none',
    format: 'openai',
    supportsVision: true,
    isLocal: true,
    defaultTextModel: 'llama3.2',
    defaultVisionModel: 'llava',
    textModels: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'deepseek-r1', name: 'DeepSeek R1' }
    ],
    visionModels: [
      { id: 'llava', name: 'LLaVA (vision)' },
      { id: 'llama3.2-vision', name: 'Llama 3.2 Vision' }
    ]
  }
};

const PROVIDER_ORDER = [
  'openai', 'anthropic', 'google', 'mistral', 'groq',
  'openrouter', 'xai', 'deepseek', 'perplexity', 'cohere', 'ollama'
];

function getProvider(id) {
  return AI_PROVIDERS[id] || null;
}

function listProviders() {
  return PROVIDER_ORDER.map(id => AI_PROVIDERS[id]).filter(Boolean);
}