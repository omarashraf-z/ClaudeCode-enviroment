import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookPage from './pages/BookPage';
import TicketPage from './pages/TicketPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/book" element={<BookPage />} />
      <Route path="/ticket/:ref" element={<TicketPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
