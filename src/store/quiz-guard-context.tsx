import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

interface QuizGuardContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  showingDialog: boolean;
  pendingTo: string | null;
  requestNavigate: (to: string, e: React.MouseEvent) => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

const QuizGuardContext = createContext<QuizGuardContextValue | null>(null);

export function QuizGuardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [showingDialog, setShowingDialog] = useState(false);
  const [pendingTo, setPendingTo] = useState<string | null>(null);

  const requestNavigate = useCallback(
    (to: string, e: React.MouseEvent) => {
      if (enabled) {
        e.preventDefault();
        setPendingTo(to);
        setShowingDialog(true);
      }
    },
    [enabled]
  );

  const confirmLeave = useCallback(() => {
    setShowingDialog(false);
    setPendingTo(null);
    if (pendingTo !== null) {
      navigate(pendingTo);
    }
  }, [navigate, pendingTo]);

  const cancelLeave = useCallback(() => {
    setShowingDialog(false);
    setPendingTo(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) cancelLeave();
    },
    [cancelLeave]
  );

  return (
    <QuizGuardContext.Provider
      value={{ enabled, setEnabled, showingDialog, pendingTo, requestNavigate, confirmLeave, cancelLeave }}
    >
      {children}
      <Dialog open={showingDialog} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クイズを中断しますか？</DialogTitle>
            <DialogDescription>
              途中で離れると、現在のクイズセッションを再開できません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelLeave}>
              続ける
            </Button>
            <Button variant="destructive" onClick={confirmLeave}>
              中断する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </QuizGuardContext.Provider>
  );
}

export function useQuizGuard(): QuizGuardContextValue {
  const ctx = useContext(QuizGuardContext);
  if (ctx === null) {
    throw new Error('useQuizGuard must be used within a QuizGuardProvider');
  }
  return ctx;
}
