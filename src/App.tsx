import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import OwnerDashboard from "./pages/OwnerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import Employees from "./pages/Employees";
import Roles from "./pages/Roles";
import Reports from "./pages/Reports";
import Sales from "./pages/Sales";
import Incentives from "./pages/Incentives";
import Services from "./pages/Services";
import Attendance from "./pages/Attendance";
import Plans from "./pages/Plans";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/owner-dashboard" element={<OwnerDashboard />} />
              <Route path="/dashboard" element={<EmployeeDashboard />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/incentives" element={<Incentives />} />
              <Route path="/services" element={<Services />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/plans" element={<Plans />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
