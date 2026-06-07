import Topbar from "../components/Topbar";
import { useState } from "react";

function CargarEML() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const subirEML = async () => {
    if (!file) return;

    setLoading(true);
    const token = localStorage.getItem("token");
    const datosForm = new FormData();
    datosForm.append("file", file);

    try {
      const respuesta = await fetch("http://localhost:8001/cargar_eml", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: datosForm
      });

      const data = await respuesta.json();
      console.log("Análisis completado con éxito:", data);

    } catch (err) {
      console.error("Error al analizar el archivo:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pagina}>
      <Topbar />

      <div style={styles.contenido}>
        <h1 style={styles.titulo}>Cargar archivo EML</h1>
        <p style={styles.subtitulo}>
          Sube un correo en formato .eml para analizarlo en tiempo real
        </p>

        <div style={styles.wrapperCentro}>
          <div style={styles.caja}>
            <label 
              style={{
                ...styles.cajaArchivo,
                ...(isHovered ? styles.cajaArchivoHover : {})
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span style={styles.dropzoneText}>
                {file ? "Archivo seleccionado" : "Haz clic para seleccionar un archivo .eml"}
              </span>
              <input
                type="file"
                accept=".eml"
                onChange={handleFileChange}
                style={styles.inputOculto}
              />
            </label>

            {file && (
              <p style={styles.nombreArchivo}>
                <strong>Nombre:</strong> {file.name}
              </p>
            )}

            <button
              onClick={subirEML}
              disabled={!file || loading}
              style={{
                ...styles.boton,
                ...(!file || loading ? styles.botonDesactivado : {})
              }}
            >
              {loading ? "Analizando..." : "Analizar EML"}
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
    display: "flex",
    flexDirection: "column",
  },

  contenido: {
    width: "100%",
    maxWidth: "1600px",
    margin: "0 auto",
    padding: "10px 20px", 
    color: "#FEFCFB",
    boxSizing: "border-box",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  titulo: {
    fontSize: "1.8rem", 
    fontWeight: "700",
    color: "#FEFCFB",
    marginBottom: "4px",
    letterSpacing: "-1px",
    textAlign: "left",
  },

  subtitulo: {
    color: "rgba(254, 252, 251, 0.7)",
    fontSize: "0.95rem",
    marginBottom: "15px",
    textAlign: "left",
  },

 
  wrapperCentro: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  caja: {
    padding: "20px",
    borderRadius: "14px",
    background: "#001F54", 
    border: "1px solid #034078",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    width: "100%", 
    maxWidth: "500px",
    boxSizing: "border-box",
  },

  inputOculto: {
    display: "none",
  },

  cajaArchivo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "25px 20px",
    background: "rgba(254, 252, 251, 0.06)", 
    border: "2px dashed rgba(254, 252, 251, 0.2)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    marginBottom: "12px",
    textAlign: "center"
  },

  cajaArchivoHover: {
    borderColor: "#1282A2",
    background: "rgba(18, 130, 162, 0.1)",
    boxShadow: "0 0 10px rgba(18, 130, 162, 0.2)",
  },

  dropzoneText: {
    fontSize: "0.9rem",
    color: "rgba(254, 252, 251, 0.8)",
    fontWeight: "500",
  },

  nombreArchivo: {
    color: "#1282A2",
    fontSize: "0.85rem",
    margin: "0 0 12px 0",
    wordBreak: "break-all",
    textAlign: "left",
  },

  boton: {
    width: "100%",
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
  },

  botonDesactivado: {
    background: "#034078",
    color: "rgba(254, 252, 251, 0.5)",
    cursor: "not-allowed",
    boxShadow: "none",
  }
};

export default CargarEML;