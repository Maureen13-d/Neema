/**
 * CareLoop-style signed conversation script for Neema.
 * Clips are How2Sign research ASL — not KSL, not clinical messaging.
 * Tap answers are local; the guide reply is scripted on-device (offline).
 */

export type SignAnswer = { id: string; labelEn: string; labelSw: string };

export type GuideReply = {
  textEn: string;
  textSw: string;
  /** When true, UI stresses facility / SMS. */
  danger: boolean;
  /** Optional handoff after this answer. */
  handoff?: 'continue' | 'alert_sms' | 'facility' | 'home' | 'end';
};

/** Ordered How2Sign clip ids available under /signing/asl/packets/. */
export const SIGN_ORDER = [
  '--8pSDeC-fg_0-5', // Hi.
  '1xKU91ggLeI_2-5', // How are you?
  '--8pSDeC-fg_7-5', // How do you feel about yourself?
  '06jk1stVwMI_2-5', // Are you comfortable?
  'CE23zzfUBDw_7-5', // Have you seen any problems with that?
  'cQBrXCcfDyc_22-5', // Are you ready?
  'g1HXoDkax5A_20-3', // It's extremely painful.
  'Cu1rDgWOZ9w_15-8', // See you in the next step.
  '5dodEz2r56M_16-8', // Take care.
  '-0N0jbyBW6g_11-5', // Thank you.
  '-F6vN4bOBWs_16-8', // …goodbye.
] as const;

const okay: SignAnswer = { id: 'better', labelEn: "I'm okay", labelSw: 'Niko sawa' };
const same: SignAnswer = { id: 'same', labelEn: 'About the same', labelSw: 'Karibu vile vile' };
const pain: SignAnswer = { id: 'worse', labelEn: "I'm in extreme pain", labelSw: 'Nina maumivu makali' };
const help: SignAnswer = { id: 'need help', labelEn: 'I need help', labelSw: 'Nahitaji msaada' };
const thanks: SignAnswer = { id: 'thank you', labelEn: 'Thank you', labelSw: 'Asante' };
const hello: SignAnswer = { id: 'hello', labelEn: 'Hello', labelSw: 'Habari' };
const here: SignAnswer = { id: "i'm here", labelEn: "Hi, I'm here", labelSw: 'Niko hapa' };
const notYet: SignAnswer = { id: 'not_yet', labelEn: 'Not yet', labelSw: 'Bado' };
const goodbye: SignAnswer = { id: 'goodbye', labelEn: 'Goodbye', labelSw: 'Kwaheri' };
const welcome: SignAnswer = { id: "you're welcome", labelEn: "You're welcome", labelSw: 'Karibu' };

/** Tap choices for each signed line (clip id). */
export const SIGN_REPLIES: Record<string, SignAnswer[]> = {
  '--8pSDeC-fg_0-5': [hello, here],
  '1xKU91ggLeI_2-5': [okay, same, pain],
  '--8pSDeC-fg_7-5': [okay, help, pain],
  '06jk1stVwMI_2-5': [okay, pain, help],
  'CE23zzfUBDw_7-5': [okay, pain, help],
  'cQBrXCcfDyc_22-5': [okay, notYet, help],
  'g1HXoDkax5A_20-3': [help, pain, okay],
  'Cu1rDgWOZ9w_15-8': [thanks, help],
  '5dodEz2r56M_16-8': [thanks, goodbye],
  '-0N0jbyBW6g_11-5': [welcome, thanks],
  '-F6vN4bOBWs_16-8': [goodbye, thanks],
};

/** Guide text after a tap — never invents clinical advice beyond “get to care”. */
export const GUIDE_BY_ANSWER: Record<string, GuideReply> = {
  hello: {
    textEn: 'Hello mama. I am a guide, not a doctor. We will go one line at a time.',
    textSw: 'Habari mama. Mimi ni mwongozo, si daktari. Tutakwenda mstari mmoja baada ya mwingine.',
    danger: false,
    handoff: 'continue',
  },
  "i'm here": {
    textEn: 'I am with you. Tap an answer under the signing figure.',
    textSw: 'Niko nawe. Gusa jibu chini ya mtu anayefanya ishara.',
    danger: false,
    handoff: 'continue',
  },
  better: {
    textEn: 'Good. Stay near your phone. If anything feels worse, tap “I need help”.',
    textSw: 'Vizuri. Kaa karibu na simu. Ukijisikia vibaya zaidi, gusa “Nahitaji msaada”.',
    danger: false,
    handoff: 'continue',
  },
  same: {
    textEn: 'Understood. Keep watching with Neema. Recheck blood pressure if she asks.',
    textSw: 'Nimeelewa. Endelea na Neema. Pima shinikizo tena akikuomba.',
    danger: false,
    handoff: 'continue',
  },
  worse: {
    textEn: 'Do not wait. Open the message to your CHP and go to a health facility now.',
    textSw: 'Usisubiri. Fungua ujumbe kwa CHP yako na uende kituo cha afya sasa.',
    danger: true,
    handoff: 'facility',
  },
  'need help': {
    textEn: 'Help is one step away. Open the SMS to your CHP, then go to a facility.',
    textSw: 'Msaada uko karibu. Fungua SMS kwa CHP, kisha nenda kituo.',
    danger: true,
    handoff: 'alert_sms',
  },
  not_yet: {
    textEn: 'That is okay. We can continue when you are ready — or ask for help anytime.',
    textSw: 'Sawa. Tutaendelea ukiwa tayari — au unaweza kuomba msaada wakati wowote.',
    danger: false,
    handoff: 'continue',
  },
  'thank you': {
    textEn: 'You are welcome. Neema stays on this phone with you.',
    textSw: 'Karibu. Neema anabaki kwenye simu hii nawe.',
    danger: false,
    handoff: 'continue',
  },
  "you're welcome": {
    textEn: 'Thank you for answering. Take care of yourself.',
    textSw: 'Asante kwa kujibu. Jitunze.',
    danger: false,
    handoff: 'continue',
  },
  goodbye: {
    textEn: 'Take care. You can return to Home or keep following Neema’s steps.',
    textSw: 'Jitunze. Unaweza kurudi Nyumbani au kuendelea na hatua za Neema.',
    danger: false,
    handoff: 'end',
  },
};

export function answersForClip(clipId: string): SignAnswer[] {
  return SIGN_REPLIES[clipId] ?? [okay, help];
}

export function guideForAnswer(answerId: string): GuideReply {
  return (
    GUIDE_BY_ANSWER[answerId] ?? {
      textEn: 'I heard you. If you feel worse, go to the nearest clinic.',
      textSw: 'Nimekusikia. Ukijisikia vibaya zaidi, nenda kliniki iliyo karibu.',
      danger: false,
      handoff: 'continue',
    }
  );
}
