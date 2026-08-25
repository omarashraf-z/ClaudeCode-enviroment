import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReservePage from './pages/ReservePage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/reserve" element={<ReservePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
