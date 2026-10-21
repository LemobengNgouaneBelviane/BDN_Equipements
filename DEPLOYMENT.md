# Déploiement du système BND

## Architecture recommandée

Le projet est prêt pour un déploiement professionnel en mode monolithique avec un seul service Node.js qui sert à la fois :
- l’API REST
- le frontend React compilé
- la logique de sécurité et d’authentification

Cette approche est simple, fiable et adaptée à un environnement de production interne ou public.

## Plateforme recommandée

### Option 1 : Render
C’est la plus simple pour ce projet.

1. Créer un compte Render.
2. Lier le dépôt GitHub.
3. Choisir le service web Node.js.
4. Utiliser le fichier `render.yaml` présent dans le dépôt.
5. Ajouter les variables d’environnement manquantes.
6. Déployer.

### Variables d’environnement à configurer

- `DATABASE_URL`
- `PORT`
- `NODE_ENV=production`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Déploiement Docker

```bash
docker build -t bnd-parc-it .
docker run -p 10000:10000 --env-file .env bnd-parc-it
```

## Vérification après déploiement

Tester la route de santé :

```bash
curl https://<votre-domaine>/api/health
```

Réponse attendue :

```json
{ "ok": true, "mode": "postgres" }
```

## Bonnes pratiques

- toujours stocker les secrets dans les variables d’environnement du provider
- utiliser HTTPS
- activer les logs de production
- configurer une sauvegarde automatique de la base PostgreSQL
- gérer les e-mails avec SMTP professionnel
- tester la registration et la vérification e-mail en production

## Important

Les changements locaux ne sont pas déployés automatiquement tant que le dépôt n’a pas été poussé et qu’un nouveau déploiement n’a pas été déclenché.
