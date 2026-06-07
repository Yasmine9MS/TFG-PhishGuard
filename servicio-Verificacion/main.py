from fastapi import FastAPI
from pydantic import BaseModel
import re
from urllib.parse import urlparse
import requests
import base64
import compartida.validacion as validacion

app = FastAPI()

#Modelo para pasar como parametro
class CorreoEntrada(BaseModel):
    texto: str

"""Función que permite extraer enlaces mediante expresiones regulares"""
def extraccion_enlaces(texto):
    patron_enlace = r"https?://[^\s]+|www\.[^\s]+" #expresión regular para extraer enlaces
    return re.findall(patron_enlace, texto)

"""Función que permite extraer el dominio de los enlaces"""
def extraer_dominio(enlaces):
    dominios = []

    for e in enlaces:
        if not e.startswith(("http://", "https://")): #obtención de dominios de los enlaces
            e = "http://" + e

        dominio = urlparse(e).netloc.lower().replace("www.", "")
        dominios.append(dominio) 

    return list(set(dominios)) #devolución de enlaces

def comprobar_con_virustotal(enlace: str):

    API_KEY_VT = "" #Clave API

    headers = {
        "x-apikey": API_KEY_VT
    }

    try:
        url_id = base64.urlsafe_b64encode(enlace.encode()).decode().strip("=") #Codificación de la url a base 64 por motivos de formato

        response = requests.get( #llamada a la API de verificación VirusTotal
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers=headers
        )

        if response.status_code == 404: #Si la API devuelve un error se marca como desconocido
            return {
                "enlace": enlace,
                "estado": "desconocido",
                "malicious": 0,
                "suspicious": 0
            }

        if response.status_code != 200: #Si hubo un error devuelve los datos
            return {
                "enlace": enlace,
                "estado": "error",
                "malicious": 0,
                "suspicious": 0
            }
    
        data = response.json() #obtención de datos

        stats = data["data"]["attributes"]["last_analysis_stats"]

        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)

        return { #devolución de datos
            "enlace": enlace,
            "malicious": malicious,
            "suspicious": suspicious,      
            }

    except Exception as e:
        return {
            "enlace": enlace,
            "error": str(e),
            "estado": "no_verificado"
        }

"""Endpoint para comprobar el enlace con la API google safe browsing"""
def comprobar_con_google_safe_browsing(enlace: str):
 
    API_KEY_GSB = "" #clave API

    url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={API_KEY_GSB}"

    payload = { #datos de envío (payload)
        "client": {
            "clientId": "tfg-phishing", #id proyetco
            "clientVersion": "1.0" #version del cliente
        },
        "threatInfo": { #tipos de amenazas que queremos detectar
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": enlace}]
        }
    }

    try: #envío
        response = requests.post(url, json=payload, timeout=10)

        #Si no devuelve un codigo de error distinto de 200 devuelve un error
        if response.status_code != 200:
            return {
                "enlace": enlace,
                "error": f"HTTP {response.status_code}",
                "Es_Phishing": None
            }
            

        data = response.json() #obtencion de datos en caso de recibir respuesta

        matches = data.get("matches", []) #La api devuelve matches si detecta amenazas

        return { #Devolución de resultados
            "enlace": enlace,
            "Es_Phishing": len(matches) > 0
        }

    except Exception as e:
        return {
            "enlace": enlace,
            "error": str(e),
            "Es_Phishing": None
        }

"""Endpoint para realizar la verificación de un correo analizado"""
@app.post("/verificar")
def verificar_correo(correo: CorreoEntrada):

    enlaces = extraccion_enlaces(correo.texto) #extracción de enlaces

    if not enlaces: #Si no encuentra enlaces devuelve el mensaje
        return {
            "mensaje": "No se encontraron enlaces"
        }

    dominios = extraer_dominio(enlaces) #Extracción de dominio de los enlaces

    resultados = []
    hay_phishing = False

    for enlace in enlaces: #por cada enlace extraído realiza la llamada a ambos APIS

        vt = comprobar_con_virustotal(enlace)
        gsb = comprobar_con_google_safe_browsing(enlace)

        print("VT:", vt)
        print("GSB:", gsb)

        resultados.append({  #guarda los resultados de cada enlace
            "enlace": enlace,
            "virustotal": vt,
            "google_safe_browsing": gsb,
        })

    return { #Devuelve los resultados
        "enlaces": enlaces,
        "dominios": dominios,
        "resultados": resultados,
        "hay_phishing": "phishing" if hay_phishing else "legítimo"
    }