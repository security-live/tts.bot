export const TWITCH_CLIENT_ID = 'dan71ek0pct1u7b8ht5u4h55zlcxvq';

export const COGNITO_IDENTITY_POOL_ID = 'us-east-1:e9babc40-c043-4729-91be-de6c1d22b919';
export const AWS_REGION = 'us-east-1';

export const TWITCH_SCOPES = [
  'moderation:read',
  'moderator:manage:shoutouts',
  'whispers:read',
  'whispers:edit',
  'user:manage:whispers',
  'chat:read',
  'chat:edit',
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
  'channel:manage:moderators',
].join('+');

export const TWITCH_SCOPES_MINIMAL = [
  'moderation:read',
  'moderator:manage:shoutouts',
  'whispers:read',
  'whispers:edit',
  'user:manage:whispers',
  'chat:read',
  'chat:edit',
].join('+');

export const DEFAULT_SYSTEM_VOICE = 'Brian';
export const DEFAULT_CHATTER_VOICE = 'Justin';

export const DEFAULT_COLORS = [
  '#b52d2d',
  '#5e5ef2',
  '#5cb55c',
  '#21aabf',
  '#FF7F50',
  '#9ACD32',
  '#FF4500',
  '#2E8B57',
  '#DAA520',
  '#D2691E',
  '#5F9EA0',
  '#1E90FF',
  '#FF69B4',
  '#8A2BE2',
  '#00FF7F',
];

export const INJECT_SCRIPT_REWARD_ID = '9914796b-d33c-4317-bb9e-e66b5d372ac2';
