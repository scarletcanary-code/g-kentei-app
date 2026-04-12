import { Input } from '../ui/input';

interface GlossarySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function GlossarySearch({ value, onChange }: GlossarySearchProps) {
  return (
    <Input
      type="text"
      placeholder="用語を検索…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full"
    />
  );
}
