import Topbar from "../components/Topbar";
import { useEffect, useState } from "react";

function Correos() {
  const [correos, setCorreos] = useState([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingspam, setLoadingSpam] = useState(false);
  const [loadingeliminar, setLoadingEliminar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [esPrevHovered, setEsPrevHovered] = useState(false);
  const [esSigHovered, setEsSigHovered] = useState(false);
  const porPagina = 7;

  const correosFiltrados = correos.filter(correo => 
    correo.asunto.toLowerCase().includes(busqueda.toLowerCase()) || 
    correo.remitente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.ceil(correosFiltrados.length / porPagina);
  
  const inicio = pagina * porPagina;
  const fin = inicio + porPagina;

  const correosPaginados = correosFiltrados.slice(inicio, fin);

  const cargarCorreos = async () => {
    try {
      const token = localStorage.getItem("token");

      const respuesta = await fetch("http://localhost:8001/obtener_correos", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!respuesta.ok) {
        throw new Error("Error cargando correos");
      }

      const data = await respuesta.json();
      setCorreos(data);

    } catch (error) {
      console.error(error);
      setCorreos([]);
    }
  };

  const enviarSpam = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoadingSpam(true);

      const respuesta = await fetch(
        "http://localhost:8001/enviar_spam", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

      if (!respuesta.ok) {
        throw new Error("Error al enviar correos a spam");
      }

      const datos = await respuesta.json();
      console.log(datos);

    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSpam(false);
    }
  };

  const eliminarPhishing = async () => {
    try{
      const token = localStorage.getItem("token");
      setLoadingEliminar(true);

      const respuesta = await fetch("http://localhost:8001/eliminar_phishing",
        {
          method: "POST",
          headers:{
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if(!respuesta.ok){
          throw new Error("Error al eliminar phishing");
        }

        const datos = await respuesta.json()
        console.log(datos);
    } catch(error){
      console.error(error);
    } finally{
      setLoadingEliminar(false);
    }
  };

  useEffect(() => {
    cargarCorreos();

    const intervalo = setInterval(() => {
      cargarCorreos();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  const sincronizarCorreos = async () => {
    try {
      setLoadingSync(true);

      const token = localStorage.getItem("token");
      const respuesta = await fetch("http://localhost:8001/descargar_correos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!respuesta.ok) {
        throw new Error("Error al sincronizar los correos del usuario");
      }

      const correos_nuevos = await respuesta.json();
      console.log("Correos nuevos", correos_nuevos);

      await cargarCorreos();
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingSync(false);
    }
  };

  if (!correos) {
    return (
      <div style={styles.cargando}>
        Cargando correos...
      </div>
    );
  }

  return (
    <div style={styles.pagina}>
      <Topbar />

      <div style={styles.contenido}>
        <h1 style={styles.titulo}>Correos Cargados</h1>
        <p style={styles.subtituloPagina}>Historial de Correos analizados</p>

        <div style={styles.contenedorFunciones}>
          <button 
            style={{
              ...styles.botonSync,
              ...(loadingSync ? styles.botonSyncDesactivado : {})
            }}
            onClick={sincronizarCorreos}
            disabled={loadingSync}
          >
            {loadingSync ? "Sincronizando..." : "Sincronizar Bandeja"}
          </button>
          
          <button
            style={{
              ...styles.botonSync,
              ...(loadingspam ? styles.botonSyncDesactivado : {})
            }}
            onClick={enviarSpam} 
            disabled={loadingspam}
          >
            {loadingspam ? "Enviando..." : "Enviar Phishing a Spam"}
          </button>

          <button style={
            {...styles.botonSync,
            ...(loadingeliminar ? styles.botonSyncDesactivado: {})
            }}
            onClick={eliminarPhishing}
            disabled={loadingeliminar}
            >
              {loadingeliminar ? "Eliminando..." : "Eliminar Phishing"}
          </button>
          
          <div style={styles.contenedorBuscador}>
            <input 
              style={styles.cajaBusqueda} 
              type="text" 
              placeholder="buscar por asunto o remitente..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "#1282A2";
                e.target.style.boxShadow = "0 0 12px rgba(18, 130, 162, 0.5)";
                e.target.style.background = "rgba(254, 252, 251, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(254, 252, 251, 0.2)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.25)";
                e.target.style.background = "rgba(254, 252, 251, 0.08)";
              }}
            />
          </div>
        </div>

        <div style={styles.tablaWrapper}>
          <table style={styles.tabla}>
            <thead style={styles.thead}>
              <tr>
                <th style={{ ...styles.th, width: "35%", textAlign: "left" }}>Asunto</th>
                <th style={{ ...styles.th, width: "25%", textAlign: "left" }}>Remitente</th>
                <th style={{ ...styles.th, width: "15%" }}>Predicción</th>
                <th style={{ ...styles.th, width: "10%" }}>Confianza</th>
                <th style={{ ...styles.th, width: "15%" }}>Fecha Predicción</th>
              </tr>
            </thead>

            <tbody>
              {correosPaginados.map((c) => (
                <tr key={c.id} style={styles.fila}>
                  <td style={{ ...styles.td, ...styles.asunto }}>
                    {c.asunto}
                  </td>

                  <td style={{ ...styles.td, ...styles.remitente }}>
                    {c.remitente}
                  </td>

                  <td style={{ ...styles.td, ...styles.prediccion }}>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          c.prediccion === "PHISHING"
                            ? "rgba(255,77,77,0.15)"
                            : c.prediccion === "LEGITIMO"
                            ? "rgba(0,208,132,0.15)"
                            : "rgba(120,120,120,0.15)",

                        color:
                          c.prediccion === "PHISHING"
                            ? "#ff5c5c"
                            : c.prediccion === "LEGITIMO"
                            ? "#00d084"
                            : "#9fb3c8",

                        border:
                          c.prediccion === "PHISHING"
                            ? "1px solid rgba(255,77,77,0.4)"
                            : c.prediccion === "LEGITIMO"
                            ? "1px solid rgba(0,208,132,0.4)"
                            : "1px solid rgba(120,120,120,0.4)",
                      }}
                    >
                      {c.prediccion || "SIN ANALIZAR"}
                    </span>
                  </td>

                  <td style={{ ...styles.td, ...styles.confianza }}>
                    {c.confianza !== null && c.confianza !== undefined
                      ? `${(c.confianza * 100).toFixed(1)}%`
                      : "-"}
                  </td>

                  <td style={{ ...styles.td, ...styles.fecha }}>
                    {c.fecha
                      ? new Date(c.fecha).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CONTENEDOR DE PAGINACIÓN COMPACTO Y CENTRADO */}
          <div style={styles.botonesPaginacion}>
            <button 
              onClick={() => setPagina(p => Math.max(p - 1, 0))}
              disabled={pagina === 0}
              onMouseEnter={() => setEsPrevHovered(true)}
              onMouseLeave={() => setEsPrevHovered(false)}
              style={{
                ...styles.botonPaginacion,
                ...(pagina === 0 ? styles.botonPaginacionDesactivado : esPrevHovered ? styles.botonPaginacionHover : {})
              }}
            >
              Anterior
            </button>
            <span style={styles.paginaInfo}>
              Página {pagina + 1} de {totalPaginas || 1}
            </span>
            <button 
              onClick={() => setPagina(p => Math.min(p + 1, totalPaginas - 1))}
              disabled={pagina >= totalPaginas - 1}
              onMouseEnter={() => setEsSigHovered(true)}
              onMouseLeave={() => setEsSigHovered(false)}
              style={{
                ...styles.botonPaginacion,
                ...(pagina >= totalPaginas - 1 ? styles.botonPaginacionDesactivado : esSigHovered ? styles.botonPaginacionHover : {})
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pagina: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #001F54 0%, #0A1128 100%)",
  },

  contenido: {
    width: "100%",
    maxWidth: "1600px",
    margin: "0 auto",
    padding: "10px 20px",
    color: "#FEFCFB",
  },

  titulo: {
    fontSize: "1.8rem",
    fontWeight: "700",
    marginBottom: "8px",
    color: "#FEFCFB",
    letterSpacing: "-1px",
  },

  subtituloPagina: {
    color: "rgba(254, 252, 251, 0.7)", 
    fontSize: "0.95rem",
    marginBottom: "15px",
  },

  subtitulo: {
    color: "#1282A2", 
    marginBottom: "30px",
    fontSize: "1rem",
  },

  contenedorBoton: {
    display: "flex",
    justifyContent: "flex-start", 
    marginBottom: "20px",
  },

  botonSync: {
    background: "#1282A2", 
    color: "#FEFCFB",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s ease",
    boxShadow: "0 4px 12px rgba(18, 130, 162, 0.3)",
    marginTop: "15px",
  },

  botonSyncDesactivado: {
    background: "#034078",
    color: "rgba(254, 252, 251, 0.5)",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  tablaWrapper: {
    width: "100%",
    overflowX: "auto",
    background: "#001F54", 
    border: "1px solid #034078", 
    borderRadius: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    boxSizing: "border-box",
  },

  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#FEFCFB",
    tableLayout: "fixed",
  },

  thead: {
    background: "#034078", 
  },

  td: {
    padding: "8px 12px",
    fontSize: "0.85rem",
  },

  th: {
    padding: "8px 12px", 
    fontSize: "0.85rem",
    fontWeight: "700",
    textAlign: "center",
  },

  fila: {
    transition: "all 0.25s ease",
    background: "transparent",
  },

  asunto: {
    fontWeight: "600",
    color: "#FEFCFB",
    maxWidth: "300px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
  },

  remitente: {
    color: "rgba(254, 252, 251, 0.7)",
    fontSize: "0.85rem",
    maxWidth: "200px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
  },

  badge: {
    padding: "3px 6px",
    borderRadius: "999px",
    fontSize: "0.70rem",
    minWidth: "75px",
    fontWeight: "700",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
  },

  prediccion: {
    textAlign: "center",
  },

  confianza: {
    fontWeight: "600",
    color: "#FEFCFB",
    textAlign: "center",
  },

  fecha: {
    color: "rgba(254, 252, 251, 0.6)",
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
    textAlign: "center",
  },

  cargando: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#1282A2",
    fontSize: "1.2rem",
    background: "#0A1128",
  },

  contenedorFunciones: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: "10px",
    gap: "15px",
  },

  contenedorBuscador: {
    marginLeft: "auto",
    marginTop: "15px",
  },

  cajaBusqueda: {
    background: "rgba(254, 252, 251, 0.08)", 
    border: "1px solid rgba(254, 252, 251, 0.2)", 
    borderRadius: "8px",
    color: "#FEFCFB", 
    padding: "10px 16px",
    fontSize: "0.9rem",
    width: "280px",
    outline: "none",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
  },

  botonesPaginacion: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    padding: "8px 0", 
    background: "rgba(10, 17, 40, 0.3)",
    borderTop: "1px solid rgba(3, 64, 120, 0.5)",
    borderBottomLeftRadius: "14px",
    borderBottomRightRadius: "14px",
  },

  botonPaginacion: {
    background: "rgba(254, 252, 251, 0.05)",
    color: "#FEFCFB",
    border: "1px solid rgba(254, 252, 251, 0.2)",
    padding: "6px 14px", 
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  botonPaginacionHover: {
    background: "rgba(18, 130, 162, 0.15)",
    borderColor: "#1282A2",
    color: "#FEFCFB",
    boxShadow: "0 0 10px rgba(18, 130, 162, 0.3)",
  },

  botonPaginacionDesactivado: {
    background: "transparent",
    color: "rgba(254, 252, 251, 0.2)",
    borderColor: "rgba(254, 252, 251, 0.05)",
    cursor: "not-allowed",
  },

  paginaInfo: {
    fontSize: "0.85rem",
    color: "rgba(254, 252, 251, 0.7)",
    fontWeight: "500",
  }
};

export default Correos;