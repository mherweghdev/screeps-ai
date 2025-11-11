# Screeps AI

Mon Intelligence Artificielle pour Screeps.

## Installation
```bash
npm install
```

## Configuration

1. Copier `.screeps.json.example` vers `.screeps.json`
2. Remplir avec tes credentials Screeps

## Déploiement
```bash
npm run push        # Push vers le serveur principal
npm run push-sim    # Push vers la simulation
npm run watch       # Watch mode (auto-push)
```

## Architecture

- `src/main.js` : Point d'entrée
- `src/managers/` : Gestionnaires de haut niveau
- `src/roles/` : Comportements des creeps
- `src/utils/` : Utilitaires

## Roadmap

- [x] Spawn manager basique
- [x] Rôles harvester/hauler
- [ ] Défense automatique
- [ ] HUD interface
- [ ] Multi-room