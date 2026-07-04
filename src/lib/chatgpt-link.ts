import type { Question } from '../types/question';

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
