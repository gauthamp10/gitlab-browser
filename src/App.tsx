import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/toaster';
import { ApiProvider } from './api';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/layout/AppLayout';
import ProjectLayout from './components/layout/ProjectLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Profile from './pages/Profile';
import Search from './pages/Search';

// Project pages
import Repository from './pages/project/Repository';
import FileViewer from './pages/project/FileViewer';
import Issues from './pages/project/Issues';
import IssueDetail from './pages/project/IssueDetail';
import MergeRequests from './pages/project/MergeRequests';
import MRDetail from './pages/project/MRDetail';
import Pipelines from './pages/project/Pipelines';
import PipelineDetail from './pages/project/PipelineDetail';
import Compare from './pages/project/Compare';
import Insights from './pages/project/Insights';
import ProjectSettings from './pages/project/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        // Don't retry on 401/403/404
        if (error instanceof Error && /40[134]/.test(error.message)) return false;
        return failureCount < 2;
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<PrivateRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/groups/:id" element={<GroupDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/search" element={<Search />} />

                  <Route path="/projects/:id" element={<ProjectLayout />}>
                    <Route index element={<Navigate to="repository" replace />} />
                    <Route path="repository" element={<Repository />} />
                    <Route path="repository/tree/*" element={<Repository />} />
                    <Route path="repository/blob/*" element={<FileViewer />} />
                    <Route path="commits" element={<Repository />} />
                    <Route path="issues" element={<Issues />} />
                    <Route path="issues/:iid" element={<IssueDetail />} />
                    <Route path="merge_requests" element={<MergeRequests />} />
                    <Route path="merge_requests/:iid" element={<MRDetail />} />
                    <Route path="pipelines" element={<Pipelines />} />
                    <Route path="pipelines/:pid" element={<PipelineDetail />} />
                    <Route path="compare" element={<Compare />} />
                    <Route path="insights" element={<Insights />} />
                    <Route path="settings" element={<ProjectSettings />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </ApiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
