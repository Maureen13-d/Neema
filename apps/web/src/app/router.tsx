import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuardianProvider } from '../hooks/useGuardian';
import { AppLayout } from './AppLayout';
import { RequireAuth } from './RequireAuth';
import { SplashPage } from '../pages/SplashPage';
import { OrientationPage } from '../pages/OrientationPage';
import { ConsentPage } from '../pages/ConsentPage';
import { UnlockPage } from '../pages/UnlockPage';
import { HomePage } from '../pages/HomePage';
import { VitalsPage } from '../pages/VitalsPage';
import { BpPage } from '../pages/BpPage';
import { SymptomsPage } from '../pages/SymptomsPage';
import { AlertPage } from '../pages/AlertPage';
import { PassportPage } from '../pages/PassportPage';
import { SummaryPage } from '../pages/SummaryPage';
import { ContactsPage } from '../pages/ContactsPage';
import { SettingsPage } from '../pages/SettingsPage';

/** Mother-facing routes. Harness remains at /dev/harness. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <GuardianProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<SplashPage />} />
            <Route path="/orient" element={<OrientationPage />} />
            <Route path="/consent" element={<ConsentPage />} />
            <Route path="/unlock" element={<UnlockPage />} />
            <Route
              path="/home"
              element={
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              }
            />
            <Route
              path="/vitals"
              element={
                <RequireAuth>
                  <VitalsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/bp"
              element={
                <RequireAuth>
                  <BpPage />
                </RequireAuth>
              }
            />
            <Route
              path="/symptoms"
              element={
                <RequireAuth>
                  <SymptomsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/alert"
              element={
                <RequireAuth>
                  <AlertPage />
                </RequireAuth>
              }
            />
            <Route
              path="/passport"
              element={
                <RequireAuth>
                  <PassportPage />
                </RequireAuth>
              }
            />
            <Route
              path="/summary"
              element={
                <RequireAuth>
                  <SummaryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/contacts"
              element={
                <RequireAuth>
                  <ContactsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </GuardianProvider>
    </BrowserRouter>
  );
}
