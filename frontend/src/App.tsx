import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { Login } from '@/pages/Login';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { Categories } from '@/pages/Categories';
import { Sales } from '@/pages/Sales';
import { SalesHistory } from '@/pages/SalesHistory';
import { Orders } from '@/pages/Orders';
import { Users } from '@/pages/Users';
import { Companies } from '@/pages/Companies';
import { Expenses } from '@/pages/Expenses';
import { Reports } from '@/pages/Reports';
import { Loading } from '@/components/Loading';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, fetchMe } = useAuthStore();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const init = async () => {
      if (token && !user) {
        try {
          await fetchMe();
        } catch (error) {
          console.error('Erro ao buscar usuário:', error);
        }
      }
      setLoading(false);
    };
    init();
  }, [token, user, fetchMe]);

  if (loading) {
    return <Loading />;
  }

  return token && user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <Products />
              </PrivateRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <PrivateRoute>
                <Categories />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <PrivateRoute>
                <Sales />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales-history"
            element={
              <PrivateRoute>
                <SalesHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Users />
              </PrivateRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <PrivateRoute>
                <Companies />
              </PrivateRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <PrivateRoute>
                <Expenses />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
