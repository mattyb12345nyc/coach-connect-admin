/**
 * Types for ElevenLabs Conversational AI API (convai)
 * Used for Practice Floor voice agents.
 */

export interface ElevenLabsAgentConfig {
  agent_id?: string;
  name?: string;
  conversation_config?: {
    agent?: {
      first_message?: string;
      prompt?: {
        prompt?: string;
        temperature?: number;
        llm?: string;
      };
      language?: string;
    };
    tts?: {
      voice_id?: string;
      model_id?: string;
    };
    turn?: {
      turn_timeout?: number;
      turn_eagerness?: number;
      [key: string]: unknown;
    };
    conversation?: {
      max_duration_seconds?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ElevenLabsConversation {
  id?: string;
  agent_id?: string;
  caller?: { name?: string; [key: string]: unknown };
  duration_seconds?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type VoiceAgentDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface VoiceAgentConfig {
  agentId: string;
  name: string;
  scenario: string;
  difficulty: VoiceAgentDifficulty;
}

export const VOICE_AGENTS: VoiceAgentConfig[] = [
  // Beginner — Zoe Chen
  { agentId: 'agent_8901kgmmeyptf96tyqky6fm6qy13', name: 'Zoe Chen', scenario: 'Gen Z — First Purchase', difficulty: 'Beginner' },
  { agentId: 'agent_4901kjty2db9ee4se4kykxz45z2z', name: 'Zoe Chen', scenario: 'Gen Z — Tabby vs Brooklyn', difficulty: 'Beginner' },
  { agentId: 'agent_1401kjtwyz8bfetrvtf5745j788s', name: 'Zoe Chen', scenario: 'Gen Z — Gift Return', difficulty: 'Beginner' },
  // Intermediate — Maya Torres
  { agentId: 'agent_5201kgmpk85hekj9g3vsss6r7zcg', name: 'Maya Torres', scenario: 'Tourist — Loyal Customer', difficulty: 'Intermediate' },
  { agentId: 'agent_7901kjtymmv9evcsma5w296dpsrk', name: 'Maya Torres', scenario: 'Tourist — Best Value US Purchase', difficulty: 'Intermediate' },
  { agentId: 'agent_3001kjtz96b8emnskjjw3frha3e9', name: 'Maya Torres', scenario: 'Tourist — Gift Purchase', difficulty: 'Intermediate' },
  // Advanced — Vanessa Liu
  { agentId: 'agent_9101kgmprab4ewfaxnvw02ykbs6g', name: 'Vanessa Liu', scenario: 'Demanding Customer — Quality Complaint', difficulty: 'Advanced' },
  { agentId: 'agent_3001kjtzr87tfyxrkgkz460yw88p', name: 'Vanessa Liu', scenario: 'Demanding Customer — Outlet vs Mainline', difficulty: 'Advanced' },
];

/** @deprecated Use VOICE_AGENTS instead */
export const VOICE_AGENT_IDS: { id: string; name: string; level: VoiceAgentDifficulty }[] = [
  { id: 'agent_8901kgmmeyptf96tyqky6fm6qy13', name: 'Zoe Chen', level: 'Beginner' },
  { id: 'agent_5201kgmpk85hekj9g3vsss6r7zcg', name: 'Maya Torres', level: 'Intermediate' },
  { id: 'agent_9101kgmprab4ewfaxnvw02ykbs6g', name: 'Vanessa Liu', level: 'Advanced' },
];
