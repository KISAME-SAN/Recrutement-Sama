import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminProvider } from "./contexts/AdminContext";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import CreateJob from "./pages/CreateJob";
import ManageJobs from "./pages/ManageJobs";
import EditJob from "./pages/EditJob";
import Apply from "./pages/Apply";
import ManageApplications from "./pages/ManageApplications";
import JobApplications from "./pages/JobApplications";
import ApplicationDetails from "./pages/ApplicationDetails";
import CreateAdmin from "./pages/CreateAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AdminProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/jobs/:id/apply" element={<Apply />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/create-job" element={<CreateJob />} />
            <Route path="/admin/manage-jobs" element={<ManageJobs />} />
            <Route path="/admin/edit-job/:id" element={<EditJob />} />
            <Route path="/admin/applications" element={<ManageApplications />} />
            <Route path="/admin/applications/:id" element={<JobApplications />} />
            <Route path="/admin/application/:id" element={<ApplicationDetails />} />
            <Route path="/admin/create" element={<CreateAdmin />} />
          </Routes>
        </BrowserRouter>
      </AdminProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;