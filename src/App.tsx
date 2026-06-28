import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import QuizSetupPage from './pages/QuizSetupPage';
import QuizPage from './pages/QuizPage';
import GlossaryPage from './pages/GlossaryPage';
import ProgressPage from './pages/ProgressPage';
import LearnIndexPage from './pages/LearnIndexPage';
import LearnChapterPage from './pages/LearnChapterPage';
import { AuthProvider } from './store/auth-context';
import { ProgressProvider } from './store/progress-context';
import { QuizGuardProvider } from './store/quiz-guard-context';
import ScrollToTop from './components/layout/ScrollToTop';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ScrollToTop />
        <QuizGuardProvider>
          <ProgressProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/quiz/setup" element={<QuizSetupPage />} />
                <Route path="/quiz/session" element={<QuizPage />} />
                <Route path="/glossary" element={<GlossaryPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/learn" element={<LearnIndexPage />} />
                <Route path="/learn/:categoryId" element={<LearnChapterPage />} />
              </Routes>
            </Layout>
          </ProgressProvider>
        </QuizGuardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
