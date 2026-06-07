import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/tiburon_sin_fondo.png";

function Topbar() {
  const navegar = useNavigate();

  function cerrarSesion(){
    localStorage.removeItem("token");
    navegar("/");
  }
  return (
    <div style={styles.topbar}>
      <div style={styles.logo}>
        <img style={styles.logoImg}src={logo} alt="logotipo PhishGuard"/>
        <span>
        PhishGuard <span style={styles.highlight}>AI</span>
        </span>
      </div>

      <nav style={styles.nav}>
        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/correos" style={styles.link}>Correos</Link>
        <Link to="/eml" style={styles.link}>Cargar EML</Link>
      </nav>

      <div style={styles.right}>
        <button style={styles.logout} onClick={cerrarSesion}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    width: "100%",
    height: "70px",
    background: "#0A1128",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    borderBottom: "1px solid #034078",
    position: "sticky",
    top: 0,
    zIndex: 1000
  },

  logo: {
    // color: "#FEFCFB",
    // fontSize: "1.3rem",
    // fontWeight: "700"
    color: "#FEFCFB",
    fontSize: "1.3rem",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  logoImg: {
    height: "32px",
    width: "auto",
    objectFit: "contain"
  },

  highlight: {
    color: "#1282A2"
  },

  nav: {
    display: "flex",
    gap: "30px"
  },

  link: {
    color: "rgba(254, 252, 251, 0.65)",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: "500",
    transition: "color 0.2s ease"
  },

  right: {
    display: "flex",
    alignItems: "center"
  },

  logout: {
    background: "transparent",
    border: "1px solid #1282A2",
    color: "#1282A2",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease"
  }
};

export default Topbar;