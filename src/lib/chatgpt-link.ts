import type { Question } from '../types/question';
import type { LearnSection } from '../types/learn';

export function buildChatGptPrompt(question: Question): string {
  const choicesText = question.choices
    .map((choice, index) => `${index + 1}. ${choice.text}`)
    .join('\n');

  return `G検定の講師として、次の問題を初学者向けに解説してください。正解の理由、各誤答が誤りの理由、関連知識も。

【問題】
${question.question}

【選択肢】
${choicesText}

【正解】${question.correctIndex + 1}`;
}

export function buildChatGptUrl(question: Question): string {
  return 'https://chatgpt.com/?q=' + encodeURIComponent(buildChatGptPrompt(question));
}

// URL が長すぎるとブラウザ側で切られるため、本文は抜粋のみ渡す
const LEARN_BODY_EXCERPT_LENGTH = 400;

export function buildLearnChatGptPrompt(chapterTitle: string, section: LearnSection): string {
  const excerpt =
    section.body.length > LEARN_BODY_EXCERPT_LENGTH
      ? section.body.slice(0, LEARN_BODY_EXCERPT_LENGTH) + '…'
      : section.body;

  return `G検定の講師として、次のトピックを初学者向けにわかりやすく解説してください。具体例や関連知識、試験で問われやすいポイントも教えてください。

【章】${chapterTitle}

【トピック】${section.heading}

【教材の説明（抜粋）】
${excerpt}`;
}

export function buildLearnChatGptUrl(chapterTitle: string, section: LearnSection): string {
  return 'https://chatgpt.com/?q=' + encodeURIComponent(buildLearnChatGptPrompt(chapterTitle, section));
}
