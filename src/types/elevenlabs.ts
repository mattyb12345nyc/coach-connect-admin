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
  description: string;
  difficulty: VoiceAgentDifficulty;
  imageUrl?: string;
}

export const VOICE_AGENTS: VoiceAgentConfig[] = [
  // Beginner — Zoe Chen
  {
    agentId: 'agent_8901kgmmeyptf96tyqky6fm6qy13',
    name: 'Zoe Chen',
    scenario: 'Gen Z · First Purchase',
    description: 'A Gen Z college student shopping for her very first luxury Coach bag. Curious and budget-conscious, she needs reassurance and guidance to feel confident in her choice.',
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  },
  {
    agentId: 'agent_4901kjty2db9ee4se4kykxz45z2z',
    name: 'Zoe Chen',
    scenario: 'Gen Z · Tabby vs Brooklyn',
    description: 'A Gen Z shopper torn between two iconic Coach styles. Help her understand the key differences and find the bag that best fits her lifestyle and aesthetic.',
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  },
  {
    agentId: 'agent_1401kjtwyz8bfetrvtf5745j788s',
    name: 'Zoe Chen',
    scenario: 'Gen Z · Gift Return',
    description: 'A Gen Z customer returning a gifted Coach item that wasn\'t quite right. Handle the return gracefully and turn it into a positive brand experience.',
    difficulty: 'Beginner',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  },
  // Intermediate — Maya Torres
  {
    agentId: 'agent_5201kgmpk85hekj9g3vsss6r7zcg',
    name: 'Maya Torres',
    scenario: 'Tourist · Loyal Customer',
    description: 'A returning Coach loyalist visiting from abroad, looking to add a special piece to her collection. She knows the brand well and has high expectations for service.',
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face',
  },
  {
    agentId: 'agent_7901kjtymmv9evcsma5w296dpsrk',
    name: 'Maya Torres',
    scenario: 'Tourist · Best Value US Purchase',
    description: 'An international tourist focused on getting the best value during her US trip. She\'s comparing prices and styles and needs expert help navigating the range.',
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face',
  },
  {
    agentId: 'agent_3001kjtz96b8emnskjjw3frha3e9',
    name: 'Maya Torres',
    scenario: 'Tourist · Gift Purchase',
    description: 'A tourist buying a Coach gift for someone special back home. Help her find a meaningful piece within her budget that will travel well and impress.',
    difficulty: 'Intermediate',
    imageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face',
  },
  // Advanced — Vanessa Liu
  {
    agentId: 'agent_9101kgmprab4ewfaxnvw02ykbs6g',
    name: 'Vanessa Liu',
    scenario: 'Demanding Customer · Quality Complaint',
    description: 'A high-end shopper with a quality complaint about a recent Coach purchase. She\'s frustrated and expects a resolution that matches the brand\'s premium positioning.',
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  },
  {
    agentId: 'agent_3001kjtzr87tfyxrkgkz460yw88p',
    name: 'Vanessa Liu',
    scenario: 'Demanding Customer · Outlet vs Mainline',
    description: 'A discerning customer pressing hard on the differences between outlet and mainline Coach products. She\'s well-researched and will challenge vague or scripted answers.',
    difficulty: 'Advanced',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  },
];

/** @deprecated Use VOICE_AGENTS instead */
export const VOICE_AGENT_IDS: { id: string; name: string; level: VoiceAgentDifficulty }[] = [
  { id: 'agent_8901kgmmeyptf96tyqky6fm6qy13', name: 'Zoe Chen', level: 'Beginner' },
  { id: 'agent_5201kgmpk85hekj9g3vsss6r7zcg', name: 'Maya Torres', level: 'Intermediate' },
  { id: 'agent_9101kgmprab4ewfaxnvw02ykbs6g', name: 'Vanessa Liu', level: 'Advanced' },
];
