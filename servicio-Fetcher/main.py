from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from typing import List
import base64
import email
from sqlalchemy import ForeignKey, UniqueConstraint, create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column 
from email.utils import parsedate_to_datetime
import httpx
import compartida.validacion as validacion
from fastapi.middleware.cors import CORSMiddleware
from celery_app import celery

#Clase para definir las clases ORM
class Base(DeclarativeBase):
    pass

#Clase para modelar la entidad correo como respuesta de la API
class CorreoSalida(BaseModel):
    mensaje_id: str
    asunto: str
    cuerpo: str
    remitente: str
    fecha: datetime

    class Config:
        from_attributes = True

#Definición de la entidad Correo para almacenar los correos electrónicos en la base de datos
class Correo(Base):
    __tablename__ = "correos"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    mensaje_id: Mapped[str] = mapped_column()
    asunto: Mapped[str] = mapped_column()
    cuerpo: Mapped[str] = mapped_column()
    remitente: Mapped[str] = mapped_column()
    fecha: Mapped[datetime] = mapped_column(index=True)
    creado_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("usuario_id", "mensaje_id"),) 

#Definición de la entidad Resultados para almacenar los resultados de las predicciones
class Resultados(Base):
    __tablename__ = "resultados"
    id: Mapped[int] = mapped_column(primary_key=True)
    prediccion: Mapped[str] = mapped_column()
    confianza: Mapped[float] = mapped_column()
    verificado: Mapped[bool] = mapped_column()
    fecha_analisis: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    id_correo: Mapped[int] = mapped_column(ForeignKey("correos.id"))

#Definición de la entidad Usuario para almacenar los usuarios del sistema
class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True)
    correo: Mapped[str] = mapped_column(unique=True, index=True)
    token_acceso: Mapped[str] = mapped_column(nullable=True)
    token_refresco: Mapped[str] = mapped_column(nullable=True)
    creado_en: Mapped[str] = mapped_column(default=datetime.utcnow)

#Parámetros de conexión con la bd
motor_db = create_engine("postgresql://admin:admin1234@db:5432/phishing_db", echo=True)
Session = sessionmaker(bind=motor_db, autoflush=False, autocommit=False)
Base.metadata.create_all(motor_db)

#Claves API
ID_cliente = ""
secreto_cliente = ""

#Modelo Pydantic para recibir datos en los endpoints
class TokenRequest(BaseModel):
    token_acceso: str
    token_refresco: str

app = FastAPI()
#Configuración para permitir llamadas desde el frontend hacia el contenedor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
        "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
    Worker que permite enviar correos al microservicio ML para analizar y
    almacena los resultados en la bd
"""
@celery.task
def job_analisis(id_correos: list[int]):
    db = Session()

    try: #Obtiene los correos pasados como parametro
        correos = db.query(Correo).filter(Correo.id.in_(id_correos)).all()

        #Preparación de envío de los datos
        datos = {
            "correos": [
                {
                    "id": correo.id,
                    "asunto": correo.asunto,
                    "cuerpo": correo.cuerpo,
                    "remitente": correo.remitente
                
                } for correo in correos
            ]
        }
        #realiza la llamada al microservicio de análisis
        respuesta = httpx.post(
            "http://servicio-ml:8002/analizar_correo",
            json=datos,
            timeout=120.0
        )

        respuesta.raise_for_status()
        datos = respuesta.json()
        resultados = datos["resultados"]

        #Recibe los resultados y los inserta en la bd
        for resultado in resultados:
            print("INSERTANDO:", resultado)
            db.add(Resultados(
                id_correo=resultado["id"],
                prediccion=resultado["prediccion"],
                confianza=resultado["probabilidad_phishing"] or 0.0,
                verificado=resultado["verificado"],
                fecha_analisis=datetime.utcnow()
            ))

        db.commit()
    except Exception as e:
        db.rollback()
        print("Error worker:", e)

    finally:
        db.close()
"""
    Endpoint que descarga los correos recientes del inbox del usuario autenticado
    y los almacena en la bd
"""
@app.post("/descargar_correos", response_model=List[CorreoSalida])
def descargar_correos(
    background_tasks: BackgroundTasks,
    usuario_id: int = Depends(validacion.verificar_token_jwt),
    max_correos: int = 25 #Número máximo de correos
):
    db = Session() #apertura de sesión 

    try:
        #Comprueba la existencia del usuario
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

        #Si no existe lanza un error
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        #Construcción de credenciales OAuth2 de Google a partir de los tokens almacenados
        credenciales = Credentials(
            token=usuario.token_acceso,
            refresh_token=usuario.token_refresco,
            client_id=ID_cliente,
            client_secret=secreto_cliente,
            token_uri="https://oauth2.googleapis.com/token"
        )

        #Si el token ha expirado se refresca y actualiza en la bd
        if credenciales.expired and credenciales.refresh_token:
            credenciales.refresh(Request())
            usuario.token_acceso = credenciales.token
            db.commit()

        servicio = build("gmail", "v1", credentials=credenciales)

        #Obtención de los ultimos 25 correos recientes 
        resultados = servicio.users().messages().list(
            userId="me",
            maxResults=max_correos,
            labelIds=["INBOX"],
            q="in:inbox newer_than:7d"
        ).execute()

        correos = resultados.get("messages", [])

        #Obtención de correos ya almacenados para evitar la duplicación de datos
        id_correos = db.query(Correo.mensaje_id).filter(
            Correo.usuario_id == usuario_id
        ).all()

        id_correos = {id_[0] for id_ in id_correos}

        correos_descargados = []
        ids_correos = []

        #Se recorre sobre los correos obtenidos a través de gmail
        for correo in correos:

            if correo["id"] in id_correos:
                continue

            mensaje = servicio.users().messages().get(
                userId="me",
                id=correo["id"],
                format="full"
            ).execute()

            payload = mensaje["payload"]
            #Conversión del timestamp de gmail al formato datetime
            marcatiempo = int(mensaje["internalDate"]) / 1000
            fecha = datetime.fromtimestamp(marcatiempo,tz=timezone.utc)

            #Extracciñon del asunto desde las cabeceras
            asunto = next(
                (h["value"] for h in payload.get("headers", [])
                 if h["name"] == "Subject"), ""
            )
            #Extracción del remitente
            remitente = next(
                (h["value"] for h in payload.get("headers", [])
                 if h["name"] == "From"), ""
            )

            cuerpo = ""
            #Extracción del cuerpo del correo (texto plano si es del tipo)
            if "parts" in payload:
                for parte in payload["parts"]:
                    if parte["mimeType"] == "text/plain":
                        data = parte["body"].get("data")
                        if data:
                            cuerpo = base64.urlsafe_b64decode(data).decode("utf-8")
                            break
            
            #Registro y almacenamiento del correo obtenido
            correo_db = Correo(
                usuario_id=usuario_id,
                mensaje_id=correo["id"],
                asunto=asunto,
                cuerpo=cuerpo,
                remitente=remitente,
                fecha=fecha
            )

            db.add(correo_db)
            db.flush()
            #Tras almacenarlos se hace flush para poder obtener los identificadores sin hacer commit aun

            ids_correos.append(correo_db.id)

            correos_descargados.append({ #para la salida
                "mensaje_id": correo["id"],
                "asunto": asunto,
                "cuerpo": cuerpo,
                "remitente": remitente,
                "fecha": fecha
            })

        db.commit()

        #Envío del analisis al worker Celery para insertar en la cola redis (proceso asíncrono)
        job_analisis.delay(ids_correos)

        correos_descargados.sort( #Ordena los correos por fecha más recientes primero
            key=lambda x: x["fecha"] or datetime.min,
            reverse=True
        )

        return correos_descargados

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()

"""Endpoint para obtener los correos asociados al usuario autenticado"""
@app.get("/obtener_correos")
def obtener_correos(usuario_id: int = Depends(validacion.verificar_token_jwt)):

    
    db = Session()

    try:
        resultados = ( #Obtención de los correos y sus resultados correspondientes ordenados en función de la fecha
            db.query(Correo, Resultados)
            .outerjoin(Resultados, Correo.id == Resultados.id_correo)
            .filter(Correo.usuario_id == usuario_id)
            .order_by(Correo.fecha.desc())
            .all()
        )

        return [
            {
                "id": correo.id,
                "asunto": correo.asunto,
                "remitente": correo.remitente,
                "fecha": resultado.fecha_analisis if resultado else None,
                "prediccion": resultado.prediccion if resultado else None,
                "confianza": resultado.confianza if resultado else None
            }
            for correo, resultado in resultados
        ]

    finally:
        db.close()

"""Endpoint para obtener las estadísticas de los correos analizados"""
@app.get("/estadisticas")
def obtener_estadisticas(usuario_id: int = Depends(validacion.verificar_token_jwt)):

    db = Session()
    try: 
        #Se obtiene el total de correos analizados, el num_phishing, legitimos
        correos_analizados = (db.query(Resultados).join(Correo,Resultados.id_correo == Correo.id).filter(Correo.usuario_id == usuario_id).all())
        total_correos = len(correos_analizados)
        num_phishing = sum(1 for correo_analizado in correos_analizados if correo_analizado.prediccion == "PHISHING")
        num_legitimo = sum(1 for correo_analizado in correos_analizados if correo_analizado.prediccion == "LEGITIMO")

        if total_correos > 0: #Si el total de correos es mayor que 0 se calcula la media de probabilidad
            media_probabilidad = sum(correo_analizado.confianza for correo_analizado in correos_analizados) / total_correos
        else:
            media_probabilidad = 0

        return { #devuelve los datos
            "total": total_correos,
            "phishing": num_phishing,
            "legitimo": num_legitimo,
            "media_probabilidad": media_probabilidad
        }

    except Exception as e:
        print(f"Error al obtener estadisticas: {str(e)}")
    finally:
        db.close()

"""Endpoint para cargar un archivo .eml (Usuario autenticado)"""
@app.post("/cargar_eml")
def cargar_eml(file: UploadFile = File(...), usuario_id: int = Depends(validacion.verificar_token_jwt)):

    #Comprobación del tipo de archivo debe coincidir con el tipo "message/rfc822"
    if file.content_type != "message/rfc822" and not file.filename.endswith(".eml"):
        raise HTTPException(status_code=400, detail="El archivo subido debe ser un archivo de tipo .eml")
    else:
        db = Session()

        try:
            #Realiza el parsing del archivo
            #lectura del archivo
            contenido = file.file.read() 

            #Parsing del correo en formato RFC822
            mensaje = email.message_from_bytes(contenido)

            #Extracción de metadatos básicos
            asunto = mensaje["Subject"] or ""
            remitente = mensaje["From"] or ""
            fecha_str = mensaje["Date"] or ""

            #Conversión de la fecha a datetime
            #Si la fecha no es válida se utiliza la fecha actual
            fecha = parsedate_to_datetime(fecha_str) if fecha_str else datetime.utcnow()

            cuerpo = ""
            #Extracción deñ cuerpo del correo en caso de ser multiparte (con varias partes MIME)
            if mensaje.is_multipart():
                for parte in mensaje.walk():
                    if parte.get_content_type() == "text/plain":
                        payload = parte.get_payload(decode=True)
                        if payload:
                            cuerpo = payload.decode(
                                parte.get_content_charset() or "utf-8",
                                errors="ignore"
                            )
                            break
            else: #En caso de ser correo simple:    
                payload = mensaje.get_payload(decode=True)
                if payload:
                    cuerpo = payload.decode(
                        mensaje.get_content_charset() or "utf-8",
                        errors="ignore"
                    )
            #Registro del correo en la bd
            correo_db = Correo(
                usuario_id=usuario_id,
                mensaje_id=f"eml-{datetime.utcnow().timestamp()}",
                asunto=asunto,
                cuerpo=cuerpo,
                remitente=remitente,
                fecha=fecha
            )

            db.add(correo_db)
            db.flush()
            db.commit()

            job_analisis.delay([correo_db.id]) #envio al worker celery para el análisis
            
            return {
                "mensaje": "archivo .eml cargado correctamente",
                "id": correo_db.id
            }
        
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al procesar el archivo .eml: {str(e)}")
        finally:
            db.close()

"""Endpoint para la subida de un archivo .eml (Usuario no autenticado)"""
@app.post("/cargar_eml_publico")
def cargar_eml_publico(file: UploadFile = File(...)):
    #Comprobación del tipo de archivo
    if file.content_type != "message/rfc822" and not file.filename.endswith(".eml"):
        raise HTTPException(status_code=400, detail="El archivo subido debe ser un archivo de tipo .eml")
    try:
        #Lectura y parsing
        contenido = file.file.read()

        mensaje  = email.message_from_bytes(contenido)

        #Extracción de metadatos
        asunto = mensaje["Subject"] or ""
        remitente = mensaje["From"] or ""
        fecha_str = mensaje["Date"] or ""

        #Conversión de fecha a datetime
        fecha = parsedate_to_datetime(fecha_str) if fecha_str else datetime.utcnow()

        cuerpo = ""

        #Extracción del cuerpo, manejo de ambos casos multipart y sencillo
        if mensaje.is_multipart():
            for parte in mensaje.walk():
                if parte.get_content_type() == "text/plain":
                    payload = parte.get_payload(decode=True)
                    if payload:
                        cuerpo = payload.decode(
                            parte.get_content_charset() or "utf-8",
                            errors="ignore"
                        )
                        break
        else:
            payload = mensaje.get_payload(decode=True)
            if payload:
                cuerpo = payload.decode(
                    mensaje.get_content_charset() or "utf-8",
                    errors="ignore"
                )

        respuesta = httpx.post( #Envio al servicio de analisis con id negativa porque no se almacena y no existe en la bd
            "http://servicio-ml:8002/analizar_correo",
            json={
                "correos": [
                    {"id": -2,
                    "asunto": asunto,
                    "cuerpo": cuerpo,
                    "remitente": remitente
                    }
                ]
            },
            timeout=30.0
        )

        respuesta.raise_for_status()
        resultado = respuesta.json()["resultados"][0] #Obtención de resultados

        return { #devolución de resultados
            "prediccion": resultado["prediccion"],
            "confianza": resultado["probabilidad_phishing"],
            "verificado": resultado.get("verificado", False)
        }
    except httpx.RequestError: #gestion de errores en caso de fallar
        raise HTTPException(
            status_code=502, detail="Error al conectar con el servicio ML"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error procesando el archivo .eml: {str(e)}"
            )

"""Función para obtener todos los correos marcados como PHISHING asociados al usuario pasado como parametro"""                       
def obtener_correos_phishing(usuario_id: int):
    db = Session()

    try:
        correos_phishing = db.query(Correo.mensaje_id).join( #Obiene los ids (id gmail) de los correos clasificados como phishing
            Resultados, Correo.id == Resultados.id_correo
        ).filter(Resultados.prediccion == "PHISHING", Correo.usuario_id == usuario_id).all()

        if not correos_phishing: #En caso de fallo tira este error
            return {"Error": "No se ha podido obtener los identificadores correspondientes"}

        correos_phishing = [c[0] for c in correos_phishing]
        return correos_phishing #Devolución de identificadore
    finally:
        db.close()
"""Endpoint para eliminar todos los correos phishing gmail marcados como Phishing hasta el momento,
   Traslada los correos de la bandeja principal a la papelera (TRASH)
"""
@app.post("/eliminar_phishing")
def eliminar_phishing(usuario_id: int = Depends(validacion.verificar_token_jwt)):
    db = Session()

    try:
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first() #Comprueba la existencia del usuario autenticado
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
        credenciales = Credentials( #Definición de credenciales necesarias para llamar a la API de Gmail
            token = usuario.token_acceso,
            refresh_token = usuario.token_refresco,
            client_id=ID_cliente,
            client_secret=secreto_cliente,
            token_uri="https://oauth2.googleapis.com/token"
        )

        if credenciales.expired and credenciales.refresh_token: #Si el token ha expirado se refresca y se actualiza en la base de datos
            credenciales.refresh(Request())
            usuario.token_acceso = credenciales.token
            db.commit()
        #Construcción del servicio y obtención de todos los correos marcados como phishing dentro de Gmail (excluye archivos .eml)
        servicio = build("gmail", "v1", credentials=credenciales)
        phishing_ids = obtener_correos_phishing(usuario_id)

        for id in phishing_ids:
            #Si el archivo se ha subido como .eml se ignora
            if id.startswith("eml-"):
                    continue
            try:
                mensaje = servicio.users().messages().get(
                    userId="me",
                    id=id,
                    format="metadata",
                    metadataHeaders=[]
                ).execute() #obtiene las etiquetas del usuario autenticado

                etiquetas = mensaje.get("labelIds", [])

                #si el correo se encuentra en la bandeja principal y no en TRASH o SPAM se traslada a TRASH
                if "INBOX" in etiquetas and "TRASH" not in etiquetas and "SPAM" not in etiquetas: 
                    servicio.users().messages().trash(
                        userId="me",
                        id=id,
                    ).execute()
            except Exception as e:
                print(f"Error al eliminar correos phishing: {e}")
        
        return {"mensaje": "Correos eliminados con éxito"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
    
"""Endpoint para enviar todos los correos marcados como phishing hasta el momento, a la carpeta spam en Gmail"""
@app.post("/enviar_spam")
def enviar_spam(usuario_id: int = Depends(validacion.verificar_token_jwt)):

    db = Session()

    try:
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first() #Comprobación de existencia de usuario

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        credenciales = Credentials( #Definición de credenciales del usuario
            token = usuario.token_acceso,
            refresh_token = usuario.token_refresco,
            client_id=ID_cliente,
            client_secret=secreto_cliente,
            token_uri="https://oauth2.googleapis.com/token"
        )

        #Si el token ha expirado se refresca y se actualiza en la base de datos
        if credenciales.expired and credenciales.refresh_token:
            credenciales.refresh(Request())
            usuario.token_acceso = credenciales.token
            db.commit()
        
        #Construcción del servicio gmail con las credenciales
        servicio = build("gmail", "v1", credentials=credenciales)
        ids_phishing = obtener_correos_phishing(usuario_id) #Obtención de los identificadores de los correos marcados como phishing 

        for id in ids_phishing:
            if id.startswith("eml-"): #Si el correo se ha subido como .eml se ignora 
                    continue
            try:
                mensaje = servicio.users().messages().get(
                    userId="me",
                    id=id,
                    format="metadata",
                    metadataHeaders=[]
                ).execute() #obtención de etiquetas para comprobar la ubicación de los correos en el cliente Gmail

                etiquetas = mensaje.get("labelIds", [])

                #Si el correo se encuentra en la bandeja principal ni en SPAM ni TRASH se traslada a la carpeta spam
                if "INBOX" in etiquetas and "SPAM" not in etiquetas and "TRASH" not in etiquetas:
                    servicio.users().messages().modify(
                        userId="me",
                        id=id,
                        body={
                            "addLabelIds":["SPAM"],
                            "removeLabelIds":["INBOX"]
                        }
                    ).execute()
            except Exception as e:
                print(f"Error al mover {id} a SPAM: {e}")

        return {"mensaje": "Correos trasladados con éxito",
        "num_correos": len(ids_phishing)}
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    finally:
        db.close()
