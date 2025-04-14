## But du projet
Cet exercice consiste a developper un api qui permet a des utilisateurs de soumettre des tickets




## Fonctionalites
-Creation d'un administrateur
-Login d'un administrateur
-Creation d'utilisateur/technician
-Login d'un utilisateur/technician
-Creation de tickets
-Recuperation de tickets (La liste de tickets au complet, au par son ID)
-Mettre a jour un ticket
-Suppresion d'un ticket

-Creation de base de donnees


## Extensions et dependances necessaires pour ce projet
- Il faut avoir Node, Express, Sqlite3, Knex , bycrypt, jsonwebtoken, express-validator et l'extension REST Client (Pour les requetes http)

-Pour installer, aller sur le terminal et tapez la commande suivante pour installer les modules

npm install node express sqlite3 knex bycrypt jsonwebtoken express-validator

-Chercher et installer l'extension REST Client


## Fichier creation_db.js
Ce fichier est utilisé pour creer les bases de donnes "users" et "tickets"

Tapez cette commande dans le terminal pour creer les bases de donnes: 

node creation_db.js


## Fichier index.js
Ce fichier possede tous les fonctionnalités 

Tapez cette commande dans le terminal pour tester les routes:
node index.js

## Fichier requests.http
Ce fichier est utilisé pour tester les requetes http

Pour tester les requetes il faut avoir l'extension REST Client

## Fichier db.sqlite3
Ce fichier possede la base de donnes 'users' et 'tickets'






