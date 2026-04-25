# Autor: Miembro 4
# MaderaControl v1.0 - Microservicio de Inteligencia Artificial
# Servicio FastAPI independiente que consulta al backend Node.js
# para predecir cuando se quedara sin stock cada producto.

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import prediccion

load_dotenv()

app = FastAPI(
    title="MaderaControl IA Service",
    description="Microservicio de prediccion de stock para MaderaControl v1.0",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediccion.router, prefix="/api/ia/prediccion", tags=["prediccion"])


@app.get("/")
def root():
    return {
        "status": "ok",
        "version": "1.0",
        "service": "MaderaControl IA Service",
        "empresa": "Inversiones y Transportes Cesar y Diana EIRL"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
