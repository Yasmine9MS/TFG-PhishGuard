import jwt
from fastapi import Header, HTTPException

clave_JWT = ""

def verificar_token_jwt(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Sin token")

    try:
        token = authorization.replace("Bearer ", "")

        payload = jwt.decode(
            token,
            clave_JWT,
            algorithms=["HS256"]
        )

        return payload["usuario_id"]   

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")

    except Exception as e:
        print("JWT ERROR:", e)
        raise HTTPException(status_code=401, detail="Token inválido")

