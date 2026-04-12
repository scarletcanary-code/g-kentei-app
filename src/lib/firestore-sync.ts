import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProgress } from '../types/progress';

const COLLECTION = 'userProgress';

export async function loadProgressFromCloud(uid: string): Promise<UserProgress | null> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProgress;
  }
  return null;
}

export async function saveProgressToCloud(uid: string, progress: UserProgress): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  await setDoc(ref, progress);
}
