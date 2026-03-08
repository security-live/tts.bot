import { useEffect, useRef } from 'react';
import * as tmi from 'tmi.js';
import type { ConnectionStatus } from '../types';

interface TwitchChatOptions {
  channel: string;
  username: string;
  accessToken: string;
  enabled: boolean;
  onChat: (channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) => void;
  onAction: (channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) => void;
  onSub: (...args: any[]) => void;
  onGiftSub: (...args: any[]) => void;
  onRaid: (channel: string, username: string, viewers: string, tags: any) => void;
  onBan: (channel: string, username: string, reason: string) => void;
  onCheer: (channel: string, userstate: tmi.ChatUserstate, message: string) => void;
  onWhisper: (from: string, userstate: tmi.ChatUserstate, message: string, self: boolean) => void;
  onConnecting: () => void;
  onConnected: () => void;
  onUsernotice: (msgid: string, channel: string, tags: any, msg: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export function useTwitchChat(opts: TwitchChatOptions) {
  const clientRef = useRef<tmi.Client | null>(null);

  // Keep handlers in refs so useEffect doesn't need to re-run when they change
  const handlers = useRef(opts);
  useEffect(() => { handlers.current = opts; }, [opts]);

  useEffect(() => {
    if (!opts.enabled || !opts.channel || !opts.accessToken) return;

    const client = tmi.client({
      options: { debug: false, skipUpdatingEmotesets: true },
      connection: { reconnect: true },
      identity: {
        username: opts.username,
        password: opts.accessToken,
      },
      channels: [opts.channel],
    });

    clientRef.current = client;

    client.on('connecting', () => {
      handlers.current.setConnectionStatus('connecting');
      handlers.current.onConnecting();
    });
    client.on('connected', () => {
      handlers.current.setConnectionStatus('connected');
      handlers.current.onConnected();
    });
    client.on('chat', (ch, us, msg, self) => handlers.current.onChat(ch, us, msg, self));
    client.on('action', (ch, us, msg, self) => handlers.current.onAction(ch, us, msg, self));
    (client as any).on('usernotice', (msgid: string, ch: string, tags: any, msg: string) => handlers.current.onUsernotice(msgid, ch, tags, msg));
    client.on('ban', (ch, user, reason) => handlers.current.onBan(ch, user, reason ?? ''));
    client.on('cheer', (ch, us, msg) => handlers.current.onCheer(ch, us, msg));
    client.on('raided', (ch, user, viewers) => handlers.current.onRaid(ch, user, String(viewers), {}));
    (client as any).on('sub', (...args: any[]) => handlers.current.onSub(...args));
    (client as any).on('resub', (...args: any[]) => handlers.current.onSub(...args));
    (client as any).on('primepaidupgrade', (...args: any[]) => handlers.current.onSub(...args));
    (client as any).on('giftpaidupgrade', (...args: any[]) => handlers.current.onSub(...args));
    (client as any).on('subgift', (...args: any[]) => handlers.current.onGiftSub(...args));
    (client as any).on('anonsubgift', (...args: any[]) => handlers.current.onGiftSub(...args));
    (client as any).on('submysterygift', (...args: any[]) => handlers.current.onGiftSub(...args));
    (client as any).on('anonsubmysterygift', (...args: any[]) => handlers.current.onGiftSub(...args));
    (client as any).on('anongiftpaidupgrade', (...args: any[]) => handlers.current.onGiftSub(...args));
    client.on('whisper', (from, us, msg, self) => handlers.current.onWhisper(from, us, msg, self));

    client.connect().catch(console.error);

    return () => {
      client.disconnect().catch(console.error);
      clientRef.current = null;
      handlers.current.setConnectionStatus('disconnected');
    };
  }, [opts.enabled, opts.channel, opts.accessToken, opts.username]);

  return clientRef;
}
