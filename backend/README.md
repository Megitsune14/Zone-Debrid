# ⚙️ Zone-Debrid Backend

**API robuste et sécurisée** construite avec Node.js et TypeScript, offrant des services de débridage de liens avancés avec intégration AllDebrid.

## ✨ **Points Forts**

- **🔍 Scraping Intelligent** : Détection automatique des changements d'URL Zone Téléchargement
- **🔐 Sécurité Avancée** : Chiffrement AES-256 des clés API et authentification JWT
- **📥 Débridage Automatique** : Intégration transparente avec l'API AllDebrid
- **⚡ Temps Réel** : WebSocket pour le suivi des téléchargements en direct
- **🗄️ Base de Données** : MongoDB avec modèles optimisés et indexation

## 🛠️ **Technologies**

- **Node.js 20+** avec TypeScript pour la robustesse
- **Express.js 5** pour l'API REST performante
- **MongoDB** avec Mongoose ODM pour la persistance
- **Socket.IO** pour les communications temps réel
- **Cheerio** pour le scraping HTML intelligent

## 🎯 **Fonctionnalités Clés**

- **Recherche multi-contenu** (films, séries, mangas) avec algorithme de pertinence
- **Authentification sécurisée** avec JWT et hachage bcrypt
- **Rate limiting** pour protéger contre les abus
- **Validation des données** avec Zod
- **Gestion de l'historique** des téléchargements

## 🚀 **Démarrage Rapide**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Le backend fournit une API complète pour le débridage de liens Zone Téléchargement via AllDebrid avec une sécurité renforcée.