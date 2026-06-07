from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from fastapi.responses import RedirectResponse
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from pydantic import BaseModel
import jwt
import compartida.validacion as validacion

flow_global = None

#URL de BD
url_base_datos = "postgresql://admin:admin1234@db:5432/phishing_db"

motor_db = create_engine(url_base_datos, echo=True)


Session = sessionmaker(bind=motor_db, autoflush=False, autocommit=False)

#Clases de ORM para la Base de datos
class Base(DeclarativeBase):
    pass

class Usuario(Base):
    """
    Entidad Usuario representa el usuario autenticado
    """
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True)
    correo: Mapped[str] = mapped_column(unique=True, index=True)
    token_acceso: Mapped[str] = mapped_column(nullable=True)
    token_refresco: Mapped[str] = mapped_column(nullable=True)
    creado_en: Mapped[str] = mapped_column(default=datetime.utcnow)

class UsuarioSalida(BaseModel):
    """Usuario de salida para devolver datos del usuario en la API"""
    id: int
    correo: str
    creado_en: datetime
    class Config:
        from_attributes = True


Base.metadata.create_all(motor_db)

#Definición de la app FASTAPI    
app = FastAPI()

#Claves API
ID_cliente = ""
Secreto_cliente = ""

#Scopes para permisos de la aplicación
scopes = ["https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.modify"]
redirect_uri = "http://localhost:8000/auth/callback"

#Clave JWT
clave_JWT = "clave_secreta_jwt"

"""Función que permite generar un token JWT para gestionar las sesiónes de los usuarios (stateless).
   El token expira en 24 horas.
"""
def generar_token_jwt(usuario_id: int):
    payload = {
        "usuario_id": usuario_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    return jwt.encode(payload, clave_JWT, algorithm="HS256")

"""Función para crear un flujo de Google (Oauth2) para la autenticación del usuario"""
def create_flow():
    flow = Flow.from_client_config({
    "web":{
        "client_id": ID_cliente,
        "client_secret": Secreto_cliente,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost:8000/auth/callback"],
    }
},scopes=scopes
    )
    return flow

"""Endpoint para la autenticación del usuario"""
@app.get("/auth/login")
def login():
    global flow_global

    #Creación del flujo Oauth2
    flow_global = create_flow()

    #Definición del enlace de redirección para el intercambio de tokens
    flow_global.redirect_uri = redirect_uri
    print(flow_global)

    #Generación del enlace de autenticación y solicitud de permisos

    auth_url, estado = flow_global.authorization_url(
        access_type="offline", prompt="consent")
    return RedirectResponse(auth_url)

"""Endpoint de redirección utilizado durante el flujo de autenticación. Se encarga de intercambiar el token generado por
   Los tokens de acceso y refresco del usuario que desea autenticarse
"""
@app.get("/auth/callback")
def callback(code: str):
    global flow_global
    #Si no se ha iniciado el flujo de autenticación lanza un error
    if not flow_global:
        return {"error": "No se ha iniciado el proceso de autenticación"}
    
    #obtención de tokens y credenciales
    flow_global.redirect_uri = redirect_uri
    flow_global.fetch_token(code=code)
    credenciales = flow_global.credentials

    #Error en caso de no obtener las credenciales
    if not credenciales: 
        return {"error": "Error al autenticar el usuario"}
    else:

        #Obtención de datos del usuario de gmail
        cred = Credentials(token=credenciales.token)
        servicio = build("gmail", "v1", credentials=cred)
        perfil = servicio.users().getProfile(userId="me").execute()

        correo_usuario = perfil["emailAddress"]

        #Apertura de una sesión de base de datos
        db = Session()

        try:
            #Comprueba si el usuario ya se ha registrado
            usuario = db.query(Usuario).filter(Usuario.correo == correo_usuario).first()

            #Si el usuario no existe se registra el usuario
            if not usuario:
                usuario = Usuario(correo=correo_usuario, token_acceso=credenciales.token, token_refresco=credenciales.refresh_token)
                db.add(usuario)
            else:
                #En caso contrario se actualicen los tokens de acceso y refresco del usuario existente porque expiran
                usuario.token_acceso = credenciales.token
                usuario.token_refresco = credenciales.refresh_token

            db.commit() #Finalización de cambios con commit
            db.refresh(usuario) #Refrescar para poder obtener el identificador del usuario

            return RedirectResponse( #Redirigir el usuario al frontend y generar el token JWT
                f"http://localhost:3000/auth/callback?token={generar_token_jwt(usuario.id)}"
            )
        except Exception as e: #En caso de error se hace rollback para volver al estado inicial
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al registrar el usuario: {str(e)}")
        finally:
            db.close() #cierre de la sesión
