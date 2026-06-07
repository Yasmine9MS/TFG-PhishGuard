import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/tiburon_sin_fondo.png";

function Home() {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredDemo, setIsHoveredDemo] = useState(false);

  const navegar = useNavigate();

  const login = () => {
    window.location.href = "http://localhost:8000/auth/login";
  };

  const irDemo = () => {
    navegar("/demo");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {}
        <div style={styles.logoContainer}>
          <img
            src={logo}
            style={styles.logo}
            alt="PhishGuard AI Logo"
          />
        </div>

        {}
        <h1 style={styles.title}>
          PhishGuard <span style={styles.highlight}>AI</span>
        </h1>

        {}
        <p style={styles.subtitle}>
          Sistema avanzado de detección de phishing basado en análisis inteligente de URLs y APIs externas.
        </p>

        {}
        <div style={styles.containerButtons}>
        <button
          onClick={login}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            ...styles.button,
            ...(isHovered ? styles.buttonHover : {}),
          }}
        >
          Iniciar sesión con Google
        </button>

        <button onClick={irDemo} 
            onMouseEnter={() => setIsHoveredDemo(true)}
            onMouseLeave={() => setIsHoveredDemo(false)}
            style={{
          ...styles.button,
          ...(isHoveredDemo ? styles.buttonHover : {}),
        }}
        >
          Probar Demo (sin Login)
        </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100%",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    padding: "20px",
    position: "relative",
    overflow: "hidden",

    background: `
      radial-gradient(circle at 15% 20%, rgba(18, 130, 162, 0.25) 0%, transparent 40%),
      radial-gradient(circle at 85% 30%, rgba(3, 64, 120, 0.35) 0%, transparent 45%),
      radial-gradient(circle at 50% 80%, rgba(0, 31, 84, 0.6) 0%, transparent 50%),
      linear-gradient(135deg, #0A1128 0%, #001F54 100%)
    `,

    boxShadow: "inset 0 0 150px rgba(18,130,162,0.12)",
  },

  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "60px 45px",
    borderRadius: "18px",
    maxWidth: "620px",
    width: "100%",
  },


  logoContainer: {
    marginBottom: "15px",
  },

  logo: {
    maxWidth: "240px",
    height: "auto",
    filter: "drop-shadow(0 0 18px rgba(18,130,162,0.5))",
  },

  title: {
    fontSize: "3rem",
    fontWeight: "700",
    color: "#FFFCFB",
    margin: "10px 0",
    letterSpacing: "-0.5px",
  },

  highlight: {
    color: "#1282A2",
    textShadow: "0 0 12px rgba(18,130,162,0.4)",
  },

  subtitle: {
    fontSize: "1.05rem",
    color: "#a0aec0",
    maxWidth: "520px",
    lineHeight: "1.6",
    marginBottom: "30px",
    marginTop: "15px"
  },

  button: {
    padding: "14px 32px",
    borderRadius: "10px",
    marginTop: "15px",
    border: "2px solid #1282A2",
    background: "transparent",
    color: "#1282A2",

    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",

    transition: "all 0.3s ease",

    boxShadow: "0 4px 20px rgba(18, 130, 162, 0.25)",
  },
  buttonHover: {
    background: "#1282A2",
    color: "#FFFCFB",
    transform: "translateY(-2px)",
    boxShadow: "0 10px 30px rgba(18, 130, 162, 0.45)",
  },
  containerButtons: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRadius: "18px",
    width: "100%",
    gap: "15px",

  }
};

export default Home;