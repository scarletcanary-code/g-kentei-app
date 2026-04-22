import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../types/category';
import CategorySelector from '../components/quiz/CategorySelector';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useProgress } from '../hooks/useProgress';
import { getReviewStats } from '../lib/sr-engine';

const LIMIT_OPTIONS = [
  { label: '10問', value: 10 },
  { label: '20問', value: 20 },
  { label: '30問', value: 30 },
  { label: '全問', value: 0 },
] as const;

export default function QuizSetupPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<CategoryId[]>(
    CATEGORIES.map((c) => c.id)
  );
  const [limit, setLimit] = useState<number>(10);
  const [weakMode, setWeakMode] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [memoryMode, setMemoryMode] = useState(false);

  const { weakQuestionIds, progress } = useProgress();
  const hasWeakQuestions = weakQuestionIds.length > 0;

  const reviewStats = useMemo(
    () => getReviewStats(progress.srStates ?? {}, new Date()),
    [progress.srStates]
  );
  // Due count includes unregistered questions (first-time learners)
  // For the button, we count only registered-and-due entries to avoid showing "all questions due"
  // on a fresh install. Use reviewStats.due for registered ones only.
  const registeredDueCount = reviewStats.due;

  const handleStart = () => {
    if (mockMode) {
      navigate('/quiz/session?mode=mock');
      return;
    }
    if (memoryMode) {
      navigate('/quiz/session?mode=memory');
      return;
    }
    if (weakMode) {
      navigate('/quiz/session?mode=weak');
      return;
    }
    const params = new URLSearchParams();
    if (selectedIds.length > 0) {
      params.set('categories', selectedIds.join(','));
    }
    params.set('limit', String(limit));
    navigate(`/quiz/session?${params.toString()}`);
  };

  const canStart = mockMode
    ? true
    : memoryMode
    ? registeredDueCount > 0
    : weakMode
    ? hasWeakQuestions
    : selectedIds.length > 0;

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">クイズ設定</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">模擬試験モード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(e) => {
                setMockMode(e.target.checked);
                if (e.target.checked) setWeakMode(false);
              }}
              className="accent-primary h-4 w-4"
            />
            <span className="text-sm">模擬試験モードで出題する（全問・120分）</span>
          </label>
        </CardContent>
      </Card>

      {!mockMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">記憶モード（スペースド・リピティション）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="quizMode"
                checked={memoryMode}
                onChange={(e) => {
                  setMemoryMode(e.target.checked);
                  if (e.target.checked) setWeakMode(false);
                }}
                className="accent-primary h-4 w-4"
              />
              <span className="text-sm">記憶モードで復習する</span>
            </label>
            {memoryMode && (
              registeredDueCount > 0
                ? <p className="text-sm text-muted-foreground">今日の復習: {registeredDueCount} 問</p>
                : <p className="text-sm text-muted-foreground">復習は完了です</p>
            )}
          </CardContent>
        </Card>
      )}

      {!mockMode && !memoryMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">苦手復習モード</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={weakMode}
                onChange={(e) => setWeakMode(e.target.checked)}
                className="accent-primary h-4 w-4"
              />
              <span className="text-sm">苦手問題のみ出題する</span>
            </label>
            {weakMode && !hasWeakQuestions && (
              <p className="text-sm text-muted-foreground">苦手問題がありません</p>
            )}
          </CardContent>
        </Card>
      )}

      {!mockMode && !weakMode && !memoryMode && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">カテゴリを選択</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorySelector
                categories={CATEGORIES}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">問題数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {LIMIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLimit(opt.value)}
                    className={
                      limit === opt.value
                        ? 'rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary'
                        : 'rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent cursor-pointer'
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Button
        className="w-full"
        disabled={!canStart}
        onClick={handleStart}
      >
        開始する
      </Button>
    </div>
  );
}
