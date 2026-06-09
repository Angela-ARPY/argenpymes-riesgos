# Verificador de Documentación — Argenpymes Riesgos

Plataforma web para que los agentes comerciales verifiquen la documentación de PyMEs antes de enviarla al área de riesgos.

## Cómo deployar en Vercel (gratis)

### Paso 1 — Subir el código a GitHub

1. Entrá a https://github.com y creá una cuenta si no tenés
2. Creá un repositorio nuevo llamado `argenpymes-riesgos` (privado)
3. Subí todos estos archivos al repo

### Paso 2 — Conectar con Vercel

1. Entrá a https://vercel.com y creá cuenta con tu GitHub
2. Click en **Add New Project**
3. Seleccioná el repo `argenpymes-riesgos`
4. Click en **Deploy**

### Paso 3 — Configurar la API key

1. En Vercel, andá a tu proyecto → **Settings** → **Environment Variables**
2. Agregá:
   - Name: `GEMINI_API_KEY`
   - Value: tu API key de Google (la que generaste en aistudio.google.com)
3. Click **Save**
4. Hacé un nuevo deploy: **Deployments** → **Redeploy**

¡Listo! Tu URL va a ser algo como `argenpymes-riesgos.vercel.app`

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Editá .env.local y poné tu GEMINI_API_KEY
npm run dev
```

Abrí http://localhost:3000
