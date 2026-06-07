from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import  joblib
import re
from sqlalchemy import ForeignKey, UniqueConstraint, create_engine
from sqlalchemy.orm import  DeclarativeBase
import compartida.validacion as validacion
import httpx
from typing import List

class Base(DeclarativeBase):
    pass

app = FastAPI()

#Carga del modelo ML
modelo = joblib.load("modelo_phishing_exp07_v1.pkl")

#Definición de clases de correo
class Correo(BaseModel):
    id: int
    asunto: str
    cuerpo: str
    remitente: str

#Definición del modelo para obtener los datos como Lote
class BatchRequest(BaseModel):
    correos: List[Correo]

"""Función que realiza el preprocesado y limpieza general del correo a analizar"""
def limpieza_general(correo: Correo):
    texto_limpiado = (correo.asunto or "") + " " +(correo.cuerpo or "")
    texto_limpiado = re.sub(r"-{2,}", " ", texto_limpiado)
    texto_limpiado = re.sub(r"forwarded by .*?\n", " ", texto_limpiado)
    texto_limpiado = re.sub(r"\d{1,2}\s*/\s*\d{1,2}\s*/\s*\d{2,4}", " ", texto_limpiado)
    texto_limpiado = re.sub(r"\b\d+\b", " ", texto_limpiado)
    texto_limpiado = re.sub(r"[;/]", " ", texto_limpiado)

    return texto_limpiado

"""Función que comprueba si se requiere verifiación externa"""
def requiere_verificacion(probabilidad:float):

    if probabilidad == None:
        return True
    elif probabilidad >= 0.40 and probabilidad <= 0.80: #Si se encuentra en la zona gris devuelve true
        return True
    
    return False

"""Función que se encarga de tomar la decisión en función de los datos de verificación"""
def tomar_decision_verificacion(vt, gsb):

    vt_malicious = vt.get("malicious", 0)
    vt_suspicious = vt.get("suspicious", 0)

    gsb_phishing = gsb.get("Es_Phishing") is True

    if gsb_phishing or vt_malicious > 0: #Si se marca como malicioso o phishing devuelve phishing
        return "phishing"

    if vt_suspicious > 0: #Si es sospechoso devuelve sospechos
        return "sospechoso"

    vt_desconocido = vt_malicious == 0 and vt_suspicious == 0
    gsb_desconocido = gsb.get("Es_Phishing") is None

    if vt_desconocido and gsb_desconocido: #Si no se conoce devuelve desconocido
        return "desconocido"

    return "legítimo" #En cualquier otro caso es legítimo

"""Endpoint que realiza el analisis de correos electrónicos"""
@app.post("/analizar_correo")
def analizar_correo(datos: BatchRequest):

    resultados = []

    patron_url = re.compile(r"http[s]?://|www\.")
    patron_correo = re.compile(r"\b\w+@\w+\.\w+\b")
    patron_signos = re.compile(r"[!?;]")

    for correo in datos.correos: #Realiza el preprocesado y extracción de características para asegurar que esta en el formato correcto

        texto_limpiado = limpieza_general(correo)

        num_palabras = len(texto_limpiado.split())
        num_caracteres = len(texto_limpiado)
        num_urls = len(patron_url.findall(texto_limpiado))
        num_emails = len(patron_correo.findall(texto_limpiado))
        num_signos = len(patron_signos.findall(texto_limpiado))
        num_mayus = sum(1 for w in texto_limpiado.split() if w.isupper())

        entrada_df = pd.DataFrame([{ #Construye el dataframe para pasar al modelo ML
            "texto": texto_limpiado,
            "num_palabras": num_palabras,
            "num_caracteres": num_caracteres,
            "num_urls": num_urls,
            "num_emails": num_emails,
            "num_signos": num_signos,
            "num_mayus": num_mayus
        }])

        pred = modelo.predict(entrada_df)[0] #Se obtiene la predicción (PHISHING O LEGITIMO)

        try:
            prob = modelo.predict_proba(entrada_df)[0][1] #Probabilidad (confianza)
        except:
            prob = None

        verificacion = requiere_verificacion(prob) #LLama a la función que determina se necesita realizar comprobaciones adicionales
        datos_verificacion = None
        verificado = False

        if verificacion: #Si se requiere verificación invoca al microservicio de verificación
            try:
                texto_completo = f"{correo.asunto} {correo.cuerpo}"
                respuesta = httpx.post(
                    "http://servicio-verificacion:8003/verificar",
                    json={"texto": texto_completo},
                    timeout=8.0
                ) #se pasa el asunto y cuerpo al servicio de verificación
                if respuesta.status_code == 200: #si la respuesta es 200 = OK se obtienen los datos y se marca el correo como verificado
                    datos_verificacion = respuesta.json()
                    verificado = True
                    phishing_detectado = False

                    for r in datos_verificacion.get("resultados", []): #Obtiene los datos de verificación de cada API
                        vst = r.get("virustotal", {}) #Datos VirusTotal
                        gsb = r.get("google_safe_browsing", {}) #Datos Google Safe Browsing

                        decision = tomar_decision_verificacion(vst, gsb) #LLama a la función de tomar_decisiion
                        
                        if decision == "phishing": #Si devuelve phishing se fija la prediccion a phishing
                            phishing_detectado = True #actualiza la variable 
                            pred = 1
                            break
                    if phishing_detectado:#si se ha detectado phishing se marca la prediccion como 1 
                        pred = 1
                    else:
                        pred = 0  #sino se marca como legítimo

  
            except:
                datos_verificacion = None

        resultados.append({ #devolución de resultados
            "id": correo.id,
            "prediccion": "PHISHING" if pred == 1 else "LEGITIMO",
            "probabilidad_phishing": float(prob) if prob is not None else None,
            "datos_verificacion": datos_verificacion,
            "verificado": verificado
        })

    return {"resultados": resultados}
