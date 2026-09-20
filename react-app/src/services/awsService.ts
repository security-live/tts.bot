import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { PollyClient, DescribeVoicesCommand, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { AWS_REGION, COGNITO_IDENTITY_POOL_ID } from '../constants';
import type { PollyVoice, VoiceLookup, AudioMessage } from '../types';

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

let pollyClient: PollyClient | null = null;
let translateClient: TranslateClient | null = null;

export async function initializeAWS(): Promise<void> {
  const cognitoClient = new CognitoIdentityClient({ region: AWS_REGION });

  const idResponse = await cognitoClient.send(
    new GetIdCommand({ IdentityPoolId: COGNITO_IDENTITY_POOL_ID })
  );

  const credResponse = await cognitoClient.send(
    new GetCredentialsForIdentityCommand({ IdentityId: idResponse.IdentityId! })
  );

  const credentials: AWSCredentials = {
    accessKeyId: credResponse.Credentials!.AccessKeyId!,
    secretAccessKey: credResponse.Credentials!.SecretKey!,
    sessionToken: credResponse.Credentials!.SessionToken!,
  };

  pollyClient = new PollyClient({ region: AWS_REGION, credentials });
  translateClient = new TranslateClient({ region: AWS_REGION, credentials });
}

export function getPollyClient(): PollyClient {
  if (!pollyClient) throw new Error('AWS not initialized');
  return pollyClient;
}

export function getTranslateClient(): TranslateClient {
  if (!translateClient) throw new Error('AWS not initialized');
  return translateClient;
}

export async function buildVoiceLookup(): Promise<{
  voices: Record<string, VoiceLookup>;
  voicesDesc: PollyVoice[];
}> {
  const polly = getPollyClient();
  const response = await polly.send(new DescribeVoicesCommand({}));
  const rawVoices = (response.Voices ?? []) as PollyVoice[];

  const voices: Record<string, VoiceLookup> = {};
  for (const v of rawVoices) {
    voices[v.Id.toLowerCase()] = {
      name: v.Id,
      engine: v.SupportedEngines[0],
      voiceOptions: v.SupportedEngines,
      languageCode: v.LanguageCode,
      gender: v.Gender,
    };
  }

  const sorted = [...rawVoices].sort((a, b) => {
    if (a.LanguageCode === b.LanguageCode) return 0;
    return a.LanguageCode > b.LanguageCode ? 1 : -1;
  });

  return { voices, voicesDesc: sorted };
}

export async function synthesizeSpeech(
  message: Pick<AudioMessage, 'text' | 'ssmlTextType'> & { voiceId: string; engine: string }
): Promise<Uint8Array> {
  const polly = getPollyClient();
  const response = await polly.send(
    new SynthesizeSpeechCommand({
      OutputFormat: 'mp3',
      Engine: message.engine as 'standard' | 'neural' | 'long-form' | 'generative',
      TextType: message.ssmlTextType,
      Text: message.text,
      VoiceId: message.voiceId as any,
    })
  );

  if (!response.AudioStream) throw new Error('No audio stream returned');
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  maskProfanity = false
): Promise<{ translatedText: string; sourceLangCode: string }> {
  const translate = getTranslateClient();
  const response = await translate.send(
    new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLang,
      TargetLanguageCode: targetLang,
      Settings: maskProfanity ? { Profanity: 'MASK' } : undefined,
    })
  );
  return {
    translatedText: response.TranslatedText ?? text,
    sourceLangCode: response.SourceLanguageCode ?? sourceLang,
  };
}

export function selectRandomVoiceByLanguageCode(
  voicesDesc: PollyVoice[],
  languageCode: string,
  gender?: string
): PollyVoice | null {
  const matching = voicesDesc.filter((v) => v.LanguageCode.startsWith(languageCode));
  if (matching.length === 0) return null;

  let pool = matching;
  if (gender) {
    const gendered = matching.filter((v) => v.Gender === gender);
    if (gendered.length > 0) pool = gendered;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
