import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReservePage from './pages/ReservePage';
import LoginPage from './pages/LoginPage';
import MyTicketsPage from './pages/MyTicketsPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/reserve" element={<ReservePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/my-tickets" element={<MyTicketsPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
