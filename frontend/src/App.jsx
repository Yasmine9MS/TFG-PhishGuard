import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Correos from "./pages/Correos";
import AuthCallback from "./pages/AuthCallback";
import CargarEML from "./pages/CargarEML";
import RutaProtegida from "./components/RutaProtegida";
import AnalizarDemo from "./pages/AnalizarDemo";

function App() {

  return (
    <BrowserRouter> 

      <Routes> 

        <Route path="/" element={<Home />} />

        <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />

        <Route path="/correos" element={<RutaProtegida><Correos /></RutaProtegida>} />
        
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/eml" element={<RutaProtegida><CargarEML /></RutaProtegida>} />

        <Route path="/demo" element={<AnalizarDemo />}/>

      </Routes>

    </BrowserRouter>
  );
}

export default App;