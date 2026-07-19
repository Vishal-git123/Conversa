
import { ThemeProvider } from "./Context/ThemeContext";
import { WallpaperProvider } from "./Context/WallpaperContext";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useUser } from "@clerk/react";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";

function ProtectedChat() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return null;
  }

  return isSignedIn ? <ChatPage /> : <Navigate to="/auth" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <WallpaperProvider>
          <Routes>
            <Route path="/auth/*" element={<AuthPage />} />
            <Route path="/" element={<ProtectedChat />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WallpaperProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
