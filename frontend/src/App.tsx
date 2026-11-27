import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/customers"
            element={
              <PlaceholderPage
                title="Customers"
                description="Searchable customer directory."
                routePath="/customers"
                plannedCapabilities={[
                  'Paginated customer listing and search filtering via customersApi.list()',
                  'Create and edit customer records with validation feedback',
                  'Navigate to customer call history details',
                ]}
              />
            }
          />
          <Route
            path="/customers/:id"
            element={
              <PlaceholderPage
                title="Customer Details"
                description="Customer profile and full chronological call history."
                routePath="/customers/:id"
                plannedCapabilities={[
                  'Fetch customer profile via customersApi.getById(id)',
                  'Display paginated call timeline via customersApi.getCalls(id)',
                  'Initiate or edit customer interactions',
                ]}
              />
            }
          />
          <Route
            path="/calls"
            element={
              <PlaceholderPage
                title="Calls"
                description="Call queue management, multi-criteria filtering, and lifecycle actions."
                routePath="/calls"
                plannedCapabilities={[
                  'Filter calls by status, agent, customer, search, and date range via callsApi.list()',
                  'Create calls via callsApi.create()',
                  'Assign calls, transition statuses, and add operational notes',
                ]}
              />
            }
          />
          <Route
            path="/calls/:id"
            element={
              <PlaceholderPage
                title="Call Details"
                description="Detailed call record, assignment controls, and structured activity timeline."
                routePath="/calls/:id"
                plannedCapabilities={[
                  'Inspect call metadata and audit trail via callsApi.getById(id)',
                  'Change status with valid workflow transitions via callsApi.updateStatus()',
                  'Assign agents and post call notes via callsApi.assign() and callsApi.addNote()',
                ]}
              />
            }
          />
          <Route
            path="/agents"
            element={
              <PlaceholderPage
                title="Agents"
                description="Agent roster, availability status, and admin user management."
                routePath="/agents"
                plannedCapabilities={[
                  'Browse agent directory and filter by availability via agentsApi.list()',
                  'Toggle active/availability status with role-aware controls',
                  'Admin agent creation via agentsApi.create()',
                ]}
              />
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
