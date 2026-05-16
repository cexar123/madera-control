# Instrucciones para subir tu parte al GitHub

Hola equipo. Aqui tienen las instrucciones de Git para que cada uno suba su carpeta correspondiente.
**Antes de empezar:** asegurense de tener Git instalado (si no lo tienen, miren la seccion de instalacion en `SETUP_EXTERNO.md`).

> Cesar es el responsable del repositorio. El crea el repo principal y hace los merges.

## Configuracion inicial (todos lo hacen una sola vez)

Abre **Git Bash** y ejecuta (cambiando los datos por los tuyos):

```bash
git config --global user.name "Tu Nombre Completo"
git config --global user.email "tu-correo@gmail.com"
```

---

## Cesar - parte-1-cesar

Tu carpeta es: `parte-1-cesar/`
Es la primera persona en subir cosas al repositorio (eres el responsable del repo principal).

Pasos:

1. Crea el repositorio en GitHub (mira `SETUP_EXTERNO.md` seccion 1 si no sabes como).
2. Abre Git Bash dentro de la carpeta `parte-1-cesar/`.
3. Ejecuta los siguientes comandos uno por uno:

```bash
git init
git add .
git commit -m "feat: estructura base, schema de base de datos y configuracion del backend"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/madera-control.git
git push -u origin main
```

4. Avisa a los demas para que ya pueden clonar el repositorio.

---

## Yarkoff - parte-2-yarkoff

Tu carpeta es: `parte-2-yarkoff/`

Pasos (copialos en Git Bash uno por uno):

```bash
git clone https://github.com/USUARIO/madera-control.git
cd madera-control
git checkout -b feature/yarkoff-auth
```

Copia tu carpeta `parte-2-yarkoff` dentro de `madera-control` (arrastrala con el explorador de Windows).

```bash
git add .
git commit -m "feat: autenticacion JWT, middlewares y arquitectura en capas"
git push origin feature/yarkoff-auth
```

Luego entra a GitHub, busca el repositorio y haz clic en **"Compare & pull request"** -> **"Create pull request"**.
Avisale a Cesar para que haga el merge.

---

## Bruno - parte-3-bruno

Tu carpeta es: `parte-3-bruno/`

Pasos (copialos en Git Bash uno por uno):

```bash
git clone https://github.com/USUARIO/madera-control.git
cd madera-control
git checkout -b feature/bruno-inventario
```

Copia tu carpeta `parte-3-bruno` dentro de `madera-control`.

```bash
git add .
git commit -m "feat: modulo de inventario y gestion de productos"
git push origin feature/bruno-inventario
```

Luego entra a GitHub, busca el repositorio y haz clic en **"Compare & pull request"** -> **"Create pull request"**.
Avisale a Cesar para que haga el merge.

---

## Miembro 4 - parte-4-miembro4

Tu carpeta es: `parte-4-miembro4/`
Te toca el modulo de Ventas + BI (reportes) + microservicio IA en Python.

Pasos:

```bash
git clone https://github.com/USUARIO/madera-control.git
cd madera-control
git checkout -b feature/miembro4-ventas-bi-ia
```

Copia tu carpeta `parte-4-miembro4` dentro de `madera-control`.

```bash
git add .
git commit -m "feat: modulo de ventas, business intelligence y microservicio IA"
git push origin feature/miembro4-ventas-bi-ia
```

Entra a GitHub y crea el Pull Request. Avisale a Cesar para que haga el merge.

---

## Miembro 5 - parte-5-miembro5

Tu carpeta es: `parte-5-miembro5/`
Te toca el frontend completo en React (los 3 modulos al 50%).

Pasos:

```bash
git clone https://github.com/USUARIO/madera-control.git
cd madera-control
git checkout -b feature/miembro5-frontend
```

Copia tu carpeta `parte-5-miembro5` dentro de `madera-control`.

```bash
git add .
git commit -m "feat: frontend React con modulos transaccional, BI e IA al 50%"
git push origin feature/miembro5-frontend
```

Entra a GitHub y crea el Pull Request. Avisale a Cesar para que haga el merge.

---

## Como crear el Pull Request paso a paso (para todos)

1. Despues del `git push`, GitHub te muestra una URL en la terminal. Ahi puedes hacer clic.
2. Si no, entra a `https://github.com/USUARIO/madera-control` directamente.
3. Veras un boton amarillo: **"Compare & pull request"**. Hazle clic.
4. Escribe un titulo claro (ej: "Modulo de inventario") y una descripcion breve.
5. Clic en **"Create pull request"**.
6. Avisale a Cesar por WhatsApp o el grupo del equipo.

---

## Que hacer si te equivocas

- **Hice commit pero quiero cambiar el mensaje:** `git commit --amend -m "nuevo mensaje"` (solo si todavia no hiciste push).
- **Olvide agregar un archivo:** edita lo que falte, luego `git add .` y `git commit --amend --no-edit`.
- **Hice push y quiero subir mas cambios al mismo PR:** simplemente haz mas commits en la misma rama y haz `git push` otra vez. El PR se actualiza solo.
- **Me confundi de rama:** avisa a Cesar, no intentes "borrar" cosas con git, es facil perder trabajo.

---

## Reglas del equipo

1. **Nunca** hagas push directo a `main`. Siempre por una rama `feature/...` y con Pull Request.
2. **Nunca** subas el archivo `.env` (esta en el `.gitignore`, pero por si acaso).
3. **Nunca** subas la carpeta `node_modules/` ni `venv/`.
4. Cada commit debe tener un mensaje claro en espanol que explique que cambiaste.
5. Si tienes dudas, pregunta antes de hacer algo destructivo.
