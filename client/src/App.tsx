import { createBrowserRouter, RouterProvider } from 'react-router';
import Layout from './components/Layout';
import ItinerairePage from './pages/ItinerairePage';
import LignesPage from './pages/LignesPage';
import LigneDetailPage from './pages/LigneDetailPage';
import TraficPage from './pages/TraficPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ItinerairePage />,
      },
      {
        path: 'lignes',
        element: <LignesPage />,
      },
      {
        path: 'lignes/:lineCode',
        element: <LigneDetailPage />,
      },
      {
        path: 'trafic',
        element: <TraficPage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
