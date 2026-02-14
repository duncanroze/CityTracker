import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-4xl font-bold">CityTracker</h1>
      </div>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
