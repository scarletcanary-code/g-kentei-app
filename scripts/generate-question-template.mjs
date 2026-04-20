import { stdout } from 'node:process';

const template = {
  "id": "chN-XXX",
  "categoryId": "chN",
  "question": "（問題文を入力）",
  "choices": [
    { "text": "（選択肢1）" },
    { "text": "（選択肢2）" },
    { "text": "（選択肢3）" },
    { "text": "（選択肢4）" }
  ],
  "correctIndex": 0,
  "explanation": "（解説を40文字以上で入力）",
  "relatedTermIds": [],
  "difficulty": 1,
  "tags": [],
  "source_ref": "（NotebookLMの返答に記載された出典箇所を転記）"
};

stdout.write(JSON.stringify(template, null, 2) + '\n');
