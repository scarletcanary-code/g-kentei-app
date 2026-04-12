import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import QuizSetupPage from './pages/QuizSetupPage';
import QuizPage from './pages/QuizPage';
import GlossaryPage from './pages/GlossaryPage';
import ProgressPage from './pages/ProgressPage';
import { ProgressProvider } from './store/progress-context';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProgressProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quiz/setup" element={<QuizSetupPage />} />
            <Route path="/quiz/session" element={<QuizPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Routes>
        </Layout>
      </ProgressProvider>
    </BrowserRouter>
  );
}

export default App;
