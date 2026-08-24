import { Link } from 'react-router-dom';
import { Grain, TopBar } from '../components/Chrome';

export default function NotFound() {
  return (
    <div className="page">
      <Grain />
      <TopBar cta={{ label: 'HOME', to: '/' }} />
      <main className="page__body">
        <h1 className="book__h">NOTHING HERE</h1>
        <p className="book__lede">There is only ever one page that matters, and this isn’t it.</p>
        <Link className="btn btn--big" to="/">THE PARTY</Link>
      </main>
    </div>
  );
}
