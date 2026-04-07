# antiflix

**Explora el catalogo de Netflix sin algoritmos.**

antiflix es una aplicacion web que te permite navegar el catalogo de Netflix de forma libre, sin recomendaciones personalizadas ni algoritmos. Filtra por genero, etiquetas, estado de animo, o simplemente deja que el azar te sorprenda.

> Este es un proyecto personal y no comercial.

## Requisitos previos

### Obtener API Key de TMDB

1. Ve a [themoviedb.org](https://www.themoviedb.org/) y crea una cuenta gratuita
2. Ve a **Ajustes** > **API** en tu perfil
3. Solicita una API key (v3 auth, tipo: Developer)
4. Copia tu API Key (v3 auth)

## Instalacion

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/antiflix.git
cd antiflix

# Instalar dependencias
npm install

# Configurar API key
cp .env.example .env
# Edita .env y reemplaza your_key_here con tu API key de TMDB
```

### Encriptar la API key (para despliegue publico)

Si vas a desplegar en GitHub Pages, encripta tu API key con un password:

```bash
npm run encrypt-key TU_API_KEY TU_PASSWORD
```

Esto genera `src/lib/encrypted-key.json` que puedes commitear. Los usuarios necesitaran el password para acceder a la app.

Para desarrollo local, simplemente usa el `.env` — la app se salta la pantalla de password automaticamente.

## Uso

### Desarrollo local

```bash
npm run dev
```

Abre http://localhost:5173/antiflix/ en tu navegador.

### Desplegar en GitHub Pages

```bash
npm run deploy
```

Esto ejecuta `vite build` y publica la carpeta `dist` en la rama `gh-pages`.

Tu sitio estara disponible en `https://tu-usuario.github.io/antiflix/`

## Funcionalidades

- **Explorar**: Navega todo el catalogo de Netflix disponible en tu region
- **Filtros**: Filtra por tipo (peliculas/series), genero, etiquetas
- **Moods**: Explora por estado de animo (terror, drama, adrenalina, etc.)
- **Sorprendeme**: Descubre un titulo aleatorio
- **Importar historial**: Importa tu historial de Netflix desde CSV
- **Lista de vistas**: Marca titulos como vistos para llevar tu propio registro
- **Busqueda**: Busca peliculas y series por nombre
- **Multi-region**: Cambia la region para ver diferentes catalogos

## Stack tecnologico

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4
- API de [TMDB](https://www.themoviedb.org/) (client-side)
- GitHub Pages (despliegue)

## Atribucion

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB" width="120">

This product uses the TMDB API but is not endorsed or certified by TMDB.
