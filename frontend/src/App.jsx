//

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { CustomerLayout } from './components/layout/CustomerLayout'
import { DriverLayout } from './components/layout/DriverLayout'
import { RequireAuth } from './components/RequireAuth'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import TripsPage from './pages/TripsPage'
import DriversPage from './pages/DriversPage'
import OrdersPage from './pages/OrdersPage'
import InvoicesPage from './pages/InvoicesPage'
import WalletPage from './pages/WalletPage'
import CustomersPage from './pages/CustomersPage'
import GeomappingPage from './pages/GeomappingPage'
import GeoAnalyticsPage from './pages/GeoAnalyticsPage'
import NotificationsPage from './pages/NotificationsPage'
import {
  FuelLogsPage,
  YardFeesPage,
  AirportFeesPage,
  SalariesPage,
} from './pages/ExpensesPages'
import AssetsOverviewPage from './pages/assets/AssetsOverviewPage'
import YardsPage from './pages/assets/YardsPage'
import VehiclesPage from './pages/assets/VehiclesPage'
import TrailersPage from './pages/assets/TrailersPage'
import EquipmentPage from './pages/assets/EquipmentPage'
import CheckInPage from './pages/assets/CheckInPage'
import RailPage from './pages/assets/RailPage'
import MaritimePage from './pages/assets/MaritimePage'
import AirportsPage from './pages/assets/AirportsPage'
import AeroplanesPage from './pages/assets/AeroplanesPage'
import AirEquipmentPage from './pages/assets/AirEquipmentPage'
import CrewPage from './pages/assets/CrewPage'
import CustomerAccountPage from './pages/customer/CustomerAccountPage'
import CustomerOverviewPage from './pages/customer/CustomerOverviewPage'
import CustomerTrackingPage from './pages/customer/CustomerTrackingPage'
import CustomerDocumentsPage from './pages/customer/CustomerDocumentsPage'
import CustomerInvoicesPage from './pages/customer/CustomerInvoicesPage'
import CustomerContractsPage from './pages/customer/CustomerContractsPage'
import CustomerBookingHistoryPage from './pages/customer/CustomerBookingHistoryPage'
import CustomerNotificationsPage from './pages/customer/CustomerNotificationsPage'
import CustomerPaymentsPage from './pages/customer/CustomerPaymentsPage'
import DriverProfilePage from './pages/driver/DriverProfilePage'
import DriverParcelsPage from './pages/driver/DriverParcelsPage'
import DriverTripsPage from './pages/driver/DriverTripsPage'
import DriverDamageLogsPage from './pages/driver/DriverDamageLogsPage'
import DriverHistoryPage from './pages/driver/DriverHistoryPage'
import WarehouseOverviewPage from './pages/warehouse/WarehouseOverviewPage'
import LabellingPage from './pages/warehouse/LabellingPage'
import AssignmentPage from './pages/warehouse/AssignmentPage'
import WarehouseZonesPage from './pages/warehouse/WarehouseZonesPage'
import DispatchPage from './pages/warehouse/DispatchPage'
import WarehouseRoutesPage from './pages/warehouse/WarehouseRoutesPage'
import WarehouseDriversPage from './pages/warehouse/WarehouseDriversPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <RequireAuth role="operator">
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="warehouse" element={<WarehouseOverviewPage />} />
            <Route path="warehouse/labelling" element={<LabellingPage />} />
            <Route path="warehouse/assignment" element={<AssignmentPage />} />
            <Route path="warehouse/zones" element={<WarehouseZonesPage />} />
            <Route path="warehouse/dispatch" element={<DispatchPage />} />
            <Route path="warehouse/routes" element={<WarehouseRoutesPage />} />
            <Route path="warehouse/drivers" element={<WarehouseDriversPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="assets" element={<AssetsOverviewPage />} />
            <Route path="assets/yards" element={<YardsPage />} />
            <Route path="assets/vehicles" element={<VehiclesPage />} />
            <Route path="assets/trailers" element={<TrailersPage />} />
            <Route path="assets/equipment" element={<EquipmentPage />} />
            <Route path="assets/check-in" element={<CheckInPage />} />
            <Route path="assets/rail" element={<RailPage />} />
            <Route path="assets/maritime" element={<MaritimePage />} />
            <Route path="assets/air/airports" element={<AirportsPage />} />
            <Route path="assets/air/aeroplanes" element={<AeroplanesPage />} />
            <Route path="assets/air/equipment" element={<AirEquipmentPage />} />
            <Route path="assets/air/crew" element={<CrewPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/pending" element={<OrdersPage filter="pending" />} />
            <Route path="orders/history" element={<OrdersPage filter="history" />} />
            <Route path="orders/invoices" element={<InvoicesPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="expenses/fuel" element={<FuelLogsPage />} />
            <Route path="expenses/yard-fees" element={<YardFeesPage />} />
            <Route path="expenses/airport-fees" element={<AirportFeesPage />} />
            <Route path="expenses/salaries" element={<SalariesPage />} />
            <Route path="geomapping" element={<GeomappingPage />} />
            <Route path="geo-analytics" element={<GeoAnalyticsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route
            path="/customer"
            element={
              <RequireAuth role="customer">
                <CustomerLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<CustomerOverviewPage />} />
            <Route path="tracking" element={<CustomerTrackingPage />} />
            <Route path="documents" element={<CustomerDocumentsPage />} />
            <Route path="bookings" element={<CustomerBookingHistoryPage />} />
            <Route path="invoices" element={<CustomerInvoicesPage />} />
            <Route path="contracts" element={<CustomerContractsPage />} />
            <Route path="payments" element={<CustomerPaymentsPage />} />
            <Route path="notifications" element={<CustomerNotificationsPage />} />
            <Route path="account" element={<CustomerAccountPage />} />
          </Route>
 <Route path="deliveries" element={<CustomerDeliveriesPage />} />
          <Route
            path="/driver"
            element={
              <RequireAuth role="driver">
                <DriverLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="trips" replace />} />
            <Route path="profile" element={<DriverProfilePage />} />
            <Route path="parcels" element={<DriverParcelsPage />} />
            <Route path="trips" element={<DriverTripsPage />} />
            <Route path="damage-logs" element={<DriverDamageLogsPage />} />
            <Route path="history" element={<DriverHistoryPage />} />
          </Route>

          <Route
            path="/driver"
            element={
              <RequireAuth role="driver">
                <DriverLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="trips" replace />} />
            <Route path="profile" element={<DriverProfilePage />} />
            <Route path="parcels" element={<DriverParcelsPage />} />
            <Route path="trips" element={<DriverTripsPage />} />
            <Route path="damage-logs" element={<DriverDamageLogsPage />} />
            <Route path="history" element={<DriverHistoryPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
