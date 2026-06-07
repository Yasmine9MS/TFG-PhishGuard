import Topbar from "../components/Topbar";
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const obtenerEstadisticas = async () => {
      const token = localStorage.getItem("token");

      const respuesta = await fetch("http://localhost:8001/estadisticas", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const datos = await respuesta.json();
      setStats(datos);
    };
    obtenerEstadisticas();
  }, []);

  if (!stats) return <div style={styles.cargando}>Cargando...</div>;

  const mediaFormateada = `${(stats.media_probabilidad * 100).toFixed(1)}%`;

  const dataPie = [
    { name: "Phishing", value: stats.phishing },
    { name: "Legítimo", value: stats.legitimo }
  ];

  const dataBar = [
    { name: "Total", total: stats.total },
    { name: "Phishing", total: stats.phishing },
    { name: "Legítimo", total: stats.legitimo }
  ];

  return (
    <div style={styles.pagina}>
      <Topbar />

      <div style={styles.contenido}>
        <h1 style={styles.titulo}>Dashboard</h1>
        <p style={styles.subtitulo}>Estadísticas de análisis de amenazas</p>

        <div style={styles.tarjetas}>
          <div style={styles.tarjeta}>
            <h2 style={styles.numTarjeta}>{stats.total}</h2>
            <p style={styles.textoTarjeta}>Total</p>
          </div>
          <div style={styles.tarjeta}>
            <h2 style={{ ...styles.numTarjeta, color: "#EF4444" }}>{stats.phishing}</h2>
            <p style={styles.textoTarjeta}>Phishing</p>
          </div>
          <div style={styles.tarjeta}>
            <h2 style={styles.numTarjeta}>{stats.legitimo}</h2>
            <p style={styles.textoTarjeta}>Legítimos</p>
          </div>
          <div style={styles.tarjeta}>
            <h2 style={styles.numTarjeta}>{mediaFormateada}</h2>
            <p style={styles.textoTarjeta}>Riesgo Promedio</p>
          </div>
        </div>

        <div style={styles.graficas}>
          <div style={styles.cajasGraficas}>
            <h3 style={styles.graficaTitulo}>Distribución</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={dataPie} dataKey="value" outerRadius={90} label>
                  <Cell fill="#EF4444" />
                  <Cell fill="#1282A2" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.cajasGraficas}>
            <h3 style={styles.graficaTitulo}>Resumen</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataBar}>
                <XAxis dataKey="name" stroke="#FEFCFB" style={{ fontSize: '0.80rem', opacity: 0.8 }} />
                <YAxis stroke="#FEFCFB" style={{ fontSize: '0.80rem', opacity: 0.8 }} />
                <Tooltip contenidoStyle={{ backgroundColor: '#001F54', borderColor: '#034078', color: '#FEFCFB' }} />
                <Bar dataKey="total" fill="#1282A2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
    background: "linear-gradient(135deg, #0A1128 30%, #034078 100%)",
  },

  contenido: {
    width: "100%",
    maxWidth: "1600px",
    margin: "0 auto",
    padding: "10px 20px",
    color: "#FEFCFB", 
    boxSizing: "border-box",
  },

  titulo: {
    fontSize: "1.8rem",
    fontWeight: "700",
    color: "#FEFCFB",
    marginBottom: "4px",
    letterSpacing: "-1px",
  },

  subtitulo: {
    color: "rgba(254, 252, 251, 0.7)", 
    fontSize: "0.95rem",
    marginBottom: "15px",
  },

  tarjetas: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "15px",
  },

  tarjeta: {
    flex: 1,
    minWidth: "140px",
    background: "#001F54",
    padding: "12px 15px",
    borderRadius: "14px",
    border: "1px solid #034078",
    boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
    textAlign: "center",
  },

  numTarjeta: {
    color: "#FEFCFB",
    margin: "0 0 2px 0",
    fontSize: "1.8rem",
    fontWeight: "700"
  },

  textoTarjeta: {
    color: "#FEFCFB",
    margin: 0,
    opacity: 0.6,
    fontSize: "0.8rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  graficas: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap"
  },

  cajasGraficas: {
    flex: 1,
    minWidth: "300px",
    background: "#001F54",
    padding: "15px 20px",
    borderRadius: "14px",
    border: "1px solid #034078",
    boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
  },

  graficaTitulo: {
    color: "#FEFCFB",
    marginBottom: "10px",
    fontWeight: "600",
    fontSize: "1.1rem"
  },

  cargando: {
    height: "100vh",
    display: "flex",
    justifycontent: "center",
    alignItems: "center",
    color: "#1282A2",
    background: "#0A1128"
  }
};

export default Dashboard;