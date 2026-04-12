import type { Question } from '../../types/question';

import ch1 from './ch1.json';
import ch2 from './ch2.json';
import ch3 from './ch3.json';
import ch4 from './ch4.json';
import ch5 from './ch5.json';
import ch6 from './ch6.json';
import ch7 from './ch7.json';
import ch8 from './ch8.json';

export const ALL_QUESTIONS: Question[] = [
  ...(ch1 as Question[]),
  ...(ch2 as Question[]),
  ...(ch3 as Question[]),
  ...(ch4 as Question[]),
  ...(ch5 as Question[]),
  ...(ch6 as Question[]),
  ...(ch7 as Question[]),
  ...(ch8 as Question[]),
];
