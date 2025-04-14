//configuration pour la base de donnes

const express = require('express');
const knex = require('knex');
const bcrypt = require('bcryptjs');
const SECRET_KEY = 'ma-cle-tres-secrete';
const jwt = require('jsonwebtoken');


const db = knex({
    client: 'sqlite3',
    connection: {
        filename: './db.sqlite3',
    },
    useNullAsDefault: true,
});

const app = express();
app.use(express.json());

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
  
    if (!authHeader) {
      return res.status(401).json({ message: 'Token manquant.' });
    }
  

    const token = authHeader.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ message: 'Token manquant.' });
    }
  
    console.log('Token utilisé :', token);
  
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {

        return res.status(403).json({ message: 'Token invalide ou expiré.' });
      }
  
      
      req.user = decoded; 
      console.log('Token décodé :', decoded);
      next();             
    });
  }






//creation de admin pour tester: 

app.post('/api/auth/create-admin', async (req, res) => {
    const { username, email, password } = req.body;

    // Validation basique
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    try {

        // Vérifier si l'admin existe déjà
        const adminExists = await db('users')
            .where({ username })
            .orWhere({ email })
            .first();

        if (adminExists) {
            return res.status(400).json({ error: 'Un admin avec ce nom ou email existe déjà' });
        }

        const saltRounds = 10; 
        const hash = await bcrypt.hash(password, saltRounds)


        const [adminId] = await db('users').insert({
            username,
            email,
            password: hash,
            role: 'admin'
        });

        res.status(201).json({
            message: 'Administrateur créé avec succès',
            adminId
        });

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création de l\'admin' });
    }
});

//connexion administrateur:
app.post('/api/auth/admin', async (req, res) => {
    const { username, password } = req.body;

    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: "Nom d'utilisateur et mot de passe requis"
        });
    }

    try {
        
        const admin = await db('users')
            .where({ 
                username,
                role: 'admin' 
            })
            .first();

        

        
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                email: admin.email
            },
            SECRET_KEY,
            { expiresIn: '1h' } 
        );

        
        res.json({
            id:admin.id,
            message: 'Administrateur connecté avec success',
            token:token,
        });

    } catch (err) {
        console.error("Connexion d'erreur au adminstrateur", err);
        res.status(500).json({
    
            error: 'Erreur interne'
        });
    }
});

//creation utilisateur/technician
app.post('/api/auth/new', verifyToken, async (req, res) => {
      const { username, email, password, role } = req.body;
  
      // Validation
      if (!username || !email || !password || !role) {
        return res.status(400).json({ 
          error: 'Tous les champs sont requis (username, email, password, role)' 
        });
      }
  
      
      if (!['user', 'technician'].includes(role)) {
        return res.status(400).json({
          error: 'Le rôle doit être "user" ou "technician"'
        });
      }
  
      try {
        const userExist = await db('users')
          .where({ username })
          .orWhere({ email })
          .first();
  
        if (userExist) {
          return res.status(409).json({
            success: false,
            error: 'Un utilisateur avec ce username ou email existe déjà'
          });
        }
  
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
  
        // Création de l'utilisateur
        const [userId] = await db('users').insert({
          username,
          email,
          password: passwordHash,
          role
        });
  
        
        res.status(201).json({
          success: true,
          message: `${role} créé avec succès`,
          user: {
            id: userId,
            username,
            email,
            role
          }
          
        });
  
      } catch (err) {
        console.error('Erreur création utilisateur/technician:', err);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur',
        });
      }
    }
  );


  //login/authentification d'un utilisateur ou technician
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username et password sont requis'
        });
    }

    try {
        const user = await db('users')
            .where({ username })
            .whereIn('role', ['user', 'technician'])
            .first();

    

        
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            SECRET_KEY,
            { expiresIn: '1h' }
        );


        
        res.json({
            id:user.id,
            message: 'Utilisateur/technician connexion réussie',
            token
        });

    } catch (err) {
        console.error('Erreur de connexion:', err);
        res.status(500).json({
            error: 'Erreur serveur'
        });
    }
});













const port = 3000
app.listen(port, () => {
    console.log("Serveur commencé sur http://localhost:3000")
})