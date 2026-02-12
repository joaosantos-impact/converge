# Google OAuth - Configuração para Produção

## O que define o redirect_uri?

O `redirect_uri` enviado ao Google é construído pelo **backend** usando:

```
redirect_uri = BETTER_AUTH_URL + "/api/auth/callback/google"
```

O Google exige que o URI configurado coincida **exatamente** com o enviado.

## Configuração correta

### Backend (Railway)

O `BETTER_AUTH_URL` define para onde o Google redireciona o utilizador após o login. Depende da tua configuração:

- **Se BETTER_AUTH_URL = frontend** → o utilizador volta para o frontend (proxy para backend)
- **Se BETTER_AUTH_URL = backend** → o utilizador é redirecionado diretamente para o backend

### Google Cloud Console

Em **Authorized redirect URIs**, adiciona os URIs que correspondem ao teu `BETTER_AUTH_URL`:

| Quando BETTER_AUTH_URL é... | URI a adicionar |
|-----------------------------|-----------------|
| Frontend | `https://frontend-production-cea4e.up.railway.app/api/auth/callback/google` |
| Backend | `https://backend-production-9d46.up.railway.app:8080/api/auth/callback/google` |
| Localhost | `http://localhost:3000/api/auth/callback/google` |

Em **Authorized JavaScript origins**:

| Ambiente | Origin |
|----------|--------|
| Frontend (produção) | `https://frontend-production-cea4e.up.railway.app` |
| Backend (produção) | `https://backend-production-9d46.up.railway.app:8080` |
| Desenvolvimento | `http://localhost:3000` |

### Se ainda der erro

1. Confirma que `BETTER_AUTH_URL` no backend (Railway) é `https://frontend-production-cea4e.up.railway.app` (sem trailing slash).
2. No Google, o URI tem de ser exatamente `.../callback/google` — não `.../callback/g`.
3. As alterações no Google podem demorar alguns minutos a propagar.
4. Confirma que o Client ID e o Client Secret no backend são os mesmos do Google Console.
