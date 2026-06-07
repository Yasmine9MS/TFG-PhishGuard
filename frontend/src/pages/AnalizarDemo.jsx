import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AnalizarDemo() {
    const [archivo, setArchivo] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [esHovered, setEsHovered] = useState(false);
    
    const navegar = useNavigate();

    const cambioArchivo = (e) => {
        if (e.target.files && e.target.files[0]) {
            setArchivo(e.target.files[0]);
        }
    };

    const subirEML = async () => {
        if (!archivo) return;

        setCargando(true);
        setResultado(null); 

        const datosForm = new FormData();
        datosForm.append("file", archivo);

        try {
            const respuesta = await fetch("http://localhost:8001/cargar_eml_publico", {
                method: "POST",
                body: datosForm
            });

            if (!respuesta.ok) {
                throw new Error("Error al procesar el archivo");
            }

            const datos = await respuesta.json();
            setResultado(datos);
            
        } catch (error) {
            console.error(error);
            setResultado({
                error: "Error al analizar el archivo"
            });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={styles.pagina}>
            <div style={styles.cabecera}>
                <button onClick={() => navegar("/")} style={styles.botonVolver}>
                    ← Volver al Inicio
                </button>
            </div>

            <div style={styles.contenido}>
                <h1 style={styles.titulo}>Analizar Demo</h1>
                <p style={styles.subtitulo}>
                    Prueba nuestro motor de detección subiendo un archivo .eml sin necesidad de registro.
                </p>


                <div style={styles.wrapperCentro}>
                    <div style={styles.caja}>
                        

                        {resultado && (
                            <div style={styles.cajaResultados}>
                                {resultado.error ? (
                                    <p style={{ color: "#ff5c5c", margin: 0, fontSize: "0.9rem", fontWeight: "600" }}>
                                        {resultado.error}
                                    </p>
                                ) : (
                                    <>
                                        <h3 style={styles.tituloResultados}>Resultado del Análisis</h3>
                                        <div style={styles.filaResultado}>
                                            <span><b>Predicción:</b></span>
                                            <span
                                                style={{
                                                    ...styles.badge,
                                                    background:
                                                        resultado.prediccion === "PHISHING"
                                                            ? "rgba(255,77,77,0.15)"
                                                            : resultado.prediccion === "LEGITIMO"
                                                            ? "rgba(0,208,132,0.15)"
                                                            : "rgba(120,120,120,0.15)",
                                                    color:
                                                        resultado.prediccion === "PHISHING"
                                                            ? "#ff5c5c"
                                                            : resultado.prediccion === "LEGITIMO"
                                                            ? "#00d084"
                                                            : "#9fb3c8",
                                                    border:
                                                        resultado.prediccion === "PHISHING"
                                                            ? "1px solid rgba(255,77,77,0.4)"
                                                            : resultado.prediccion === "LEGITIMO"
                                                            ? "1px solid rgba(0,208,132,0.4)"
                                                            : "1px solid rgba(120,120,120,0.4)",
                                                }}
                                            >
                                                {resultado.prediccion || "SIN ANALIZAR"}
                                            </span>
                                        </div>
                                        <p style={{ margin: "6px 0 0 0", fontSize: "0.9rem" }}>
                                            <b>Confianza:</b> {resultado.confianza !== undefined && resultado.confianza !== null
                                                ? `${(resultado.confianza * 100).toFixed(1)}%`
                                                : resultado.probabilidad_phishing 
                                                ? `${(resultado.probabilidad_phishing * 100).toFixed(1)}%` 
                                                : "-"}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        <label 
                            style={{
                                ...styles.zonaArrastrar,
                                ...(esHovered ? styles.zonaArrastrarHover : {})
                            }}
                            onMouseEnter={() => setEsHovered(true)}
                            onMouseLeave={() => setEsHovered(false)}
                        >
                            <span style={styles.zonaArrastrarTexto}>
                                {archivo ? "Correo listo para analizar" : "Selecciona un archivo .eml"}
                            </span>
                            <input 
                                type="file" 
                                accept=".eml" 
                                onChange={cambioArchivo} 
                                style={styles.inputOculto}
                            />
                        </label>

                        {archivo && (
                            <p style={styles.nombreArchivo}>
                                <strong>Archivo:</strong> {archivo.name}
                            </p>
                        )}

                        <button 
                            onClick={subirEML} 
                            disabled={!archivo || cargando}
                            style={{
                                ...styles.boton,
                                ...(!archivo || cargando ? styles.botonDesactivado : {})
                            }}
                        >
                            {cargando ? "Analizando Amenazas..." : "Analizar Ahora"}
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

    cabecera: {
        padding: "20px 20px 0 20px",
    },

    botonVolver: {
        background: "transparent",
        border: "none",
        color: "#1282A2",
        cursor: "pointer",
        fontSize: "0.9rem",
        fontWeight: "600",
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
        maxWidth: "600px",
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

    cajaResultados: {
        marginBottom: "15px",
        padding: "15px",
        borderRadius: "10px",
        background: "rgba(10, 17, 40, 0.4)",
        border: "1px solid rgba(3, 64, 120, 0.7)",
        textAlign: "left",
    },

    tituloResultados: {
        margin: "0 0 10px 0",
        fontSize: "1.05rem",
        fontWeight: "600",
        color: "#FEFCFB"
    },

    filaResultado: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "0.9rem"
    },

    badge: {
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: "700",
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
    },

    zonaArrastrar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
        background: "rgba(254, 252, 251, 0.06)", 
        border: "2px dashed rgba(254, 252, 251, 0.2)",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        marginBottom: "15px",
        textAlign: "center"
    },

    zonaArrastrarHover: {
        borderColor: "#1282A2",
        background: "rgba(18, 130, 162, 0.1)",
        boxShadow: "0 0 15px rgba(18, 130, 162, 0.2)",
    },

    zonaArrastrarTexto: {
        fontSize: "0.9rem",
        color: "rgba(254, 252, 251, 0.8)",
        fontWeight: "500",
    },

    nombreArchivo: {
        color: "#1282A2",
        fontSize: "0.85rem",
        margin: "0 0 15px 0",
        wordBreak: "break-all",
        textAlign: "left",
    },

    boton: {
        width: "100%",
        background: "#1282A2", 
        color: "#FEFCFB",
        border: "none",
        padding: "12px 16px",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(18, 130, 162, 0.3)",
    },

    botonDesactivado: {
        background: "#034078",
        color: "rgba(254, 252, 251, 0.5)",
        cursor: "not-allowed",
        boxShadow: "none",
    }
};

export default AnalizarDemo;