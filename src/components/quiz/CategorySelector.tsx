import type { Category } from '../../types/category';
import type { CategoryId } from '../../types/category';
import { cn } from '../../lib/utils';

interface CategorySelectorProps {
  categories: Category[];
  selectedIds: CategoryId[];
  onChange: (ids: CategoryId[]) => void;
}

export default function CategorySelector({
  categories,
  selectedIds,
  onChange,
}: CategorySelectorProps) {
  const handleToggle = (id: CategoryId) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const allSelected = selectedIds.length === categories.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(categories.map((c) => c.id));
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleToggleAll}
          className="h-4 w-4 rounded border-input"
        />
        すべてのカテゴリを選択
      </label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {categories.map((cat) => (
          <label
            key={cat.id}
            className={cn(
              'flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors',
              selectedIds.includes(cat.id)
                ? 'border-primary bg-primary/10 font-medium'
                : 'border-input bg-background hover:bg-accent'
            )}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(cat.id)}
              onChange={() => handleToggle(cat.id)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Ch{cat.chapterNum}: {cat.shortName}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
