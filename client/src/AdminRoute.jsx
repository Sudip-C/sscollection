import { lazy, Suspense } from 'react'

const AdminPage = lazy(() => import('./AdminPage.jsx'))

export default function AdminRoute() {
  return (
    <Suspense fallback={<p className="p-15 text-3xl font-extrabold">Loading admin…</p>}>
      <AdminPage />
    </Suspense>
  )
}