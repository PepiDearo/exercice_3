//configuration pour la base de donnes
//dependances
const express = require('express');
const knex = require('knex');
const bcrypt = require('bcryptjs');
const SECRET_KEY = 'ma-cle-tres-secrete';
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');

//configuration
const db = knex({
    client: 'sqlite3',
    connection: {
        filename: './db.sqlite3',
    },
    useNullAsDefault: true,
});

const app = express();
app.use(express.json());


//fonction pour verifier les tokens
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


//fonction d'authorisation admin
function authorisationAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action'
      });
    }
    next();
  }



//Valider les donnees d'entree avec express validator pour les routes
//creation de admin
const createAdmin = [
    body('username')
        .notEmpty().withMessage('Le nom d\'utilisateur est requis'),
    body('email')
        .isEmail().withMessage("L'adresse email n'est pas valide")
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Le mot de passe est requis')

];

//login admin
const adminLogin = [
    body('username')
        .notEmpty().withMessage('Le nom d\'utilisateur est requis'),

    body('password')
        .notEmpty().withMessage('Le mot de passe est requis')
]

//creation utilisateur
const createUser = [
    body('username')
      .notEmpty().withMessage('Le nom d\'utilisateur est requis'),
    body('email')
      .isEmail().withMessage('L\'adresse email n\'est pas valide')
      .notEmpty().withMessage('L\'adresse email est requis')
      .normalizeEmail(),
    
    body('password')
    .notEmpty().withMessage('Le mot de passe est requis'),
    
    body('role')
      .isIn(['user', 'technician']).withMessage('Le rôle doit être "user" ou "technician"')
  ]

  //login dun utilisateur
  const userLogin= [
    body('username')
      .trim()
      .notEmpty().withMessage('Le nom d\'utilisateur est requis'),
    
    body('password')
      .notEmpty().withMessage('Le mot de passe est requis')
  ]

  //creation de ticket
  const createTicket=[
    body('title')
    .notEmpty().withMessage('Le titre est requis'),
    body('description')
      .notEmpty().withMessage('La description est requise'),
    body('status')
      .isIn(['open', 'in progress', 'closed']).withMessage('Statut invalide'),
    body('userId')
      .isInt({ min: 1 }).withMessage('ID utilisateur invalide')
      .custom(async (value) => {
        const user = await db('users').where('id', value).first();
        if (!user) throw new Error('Utilisateur non trouvé');
        return true;
      }),
    body('technicianId')
      .optional()
      .isInt({ min: 1 }).withMessage('ID technicien invalide')
      .custom(async (value) => {
        if (value) {
          const tech = await db('users').where({ id: value, role: 'technician' }).first();
          if (!tech) throw new Error('Technicien non trouvé');
        }
        return true;
      })
      .default(null),
    
    
    body('createdAt')
      .optional()
      .isISO8601().withMessage('Format de date invalide (YYYY-MM-DDTHH:MM:SSZ)')
      .toDate(),
    
    
    body('closedAt')
      .optional()
      .isISO8601().withMessage('Format de date invalide')
      .custom((value, { req }) => {
        if (value && !req.body.createdAt) {
          throw new Error('createdAt est requis quand closedAt est spécifié');
        }
        if (value && new Date(value) <= new Date(req.body.createdAt)) {
          throw new Error('closedAt doit être après createdAt');
        }
        if (value && req.body.status !== 'closed') {
          throw new Error('Le statut doit être "closed" quand closedAt est spécifié');
        }
        return true;
      })
      .default(null)
  ]

  //mis a jour d'un ticket
  const updateTicket=[
    body('title')
      .notEmpty().withMessage('Le titre ne peut pas être vide'),
    
    body('description')
      .notEmpty().withMessage('La description ne peut pas être vide'),
    
    body('status')
      .optional()
      .isIn(['open', 'in progress', 'closed']).withMessage('Statut invalide'),
    
    body('technicianId')
      .optional()
      .isInt({ min: 1 }).withMessage('ID technicien invalide'),
    
    body('closedAt')
      .optional()
      .isISO8601().withMessage('Format de date invalide')
      .custom((value, { req }) => {
        if (value && req.body.status !== 'closed') {
          throw new Error('Le statut doit être "closed" quand closedAt est spécifié');
        }
        return true;
      })
  ]

  



  

//Routes
//creation de admin pour tester: 

app.post('/api/auth/create-admin', createAdmin, async (req, res) => {
    //verifie les erreurs
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    

    try {
        const { username, email, password } = req.body;
        // Vérifier si l'admin existe déjà
        const adminExists = await db('users')
            .where({ username })
            .orWhere({ email })
            .first();

        if (adminExists) {
            return res.status(400).json({ error: 'Un admin avec ce nom ou email existe déjà' });
        }

        //hachage de mot de passe
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
app.post('/api/auth/admin', adminLogin, async (req, res) => {
    //verifie les erreurs
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    


    try {
        const { username, password } = req.body;
        const admin = await db('users')
            .where({
                username,
                role: 'admin'
            })
            .first();
            //verifie si le mot de passe est bon
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (!passwordMatch) {
              return res.status(401).json({
                success: false,
                error: "Mot de passe incorrect"
              });
            }




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
            id: admin.id,
            message: 'Administrateur connecté avec success',
            token: token,
        });

    } catch (err) {
        console.error("Connexion d'erreur au adminstrateur", err);
        res.status(500).json({

            error: 'Erreur interne'
        });
    }
});

//creation utilisateur/technician
app.post('/api/auth/new',createUser, verifyToken, async (req, res) => {
    //verifie les erreurs
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    

    try {

        const { username, email, password, role } = req.body;
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

        //hachage de mot de passe
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
app.post('/api/auth/login',userLogin, async (req, res) => {
    
    //verifie les erreurs
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


    

    try {
        const { username, password } = req.body;
        const user = await db('users')
            .where({ username })
            .whereIn('role', ['user', 'technician'])
            .first();
            //verifie si le mot de passe est bon
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
              return res.status(401).json({
                success: false,
                error: 'Mot de passe incorrect'
              });
            }


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
            id: user.id,
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


//creation de ticket 
app.post('/api/tickets',createTicket,verifyToken,async(req,res)=>{
    //verifie les erreurs
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const ticketData = {
          title: req.body.title,
          description: req.body.description,
          status: req.body.status || 'open',
          userId: req.body.userId,
          technicianId: req.body.technicianId || null,
          createdAt: req.body.createdAt || new Date(),
          closedAt: req.body.closedAt || null
        };
  
        
        if (ticketData.closedAt && ticketData.status !== 'closed') {
          ticketData.status = 'closed';
        }
  
        
        const [ticketId] = await db('tickets').insert(ticketData);
  
        
        res.status(201).json({
          success: true,
          message: 'Ticket créé avec succès',
          ticket: {
            id: ticketId,
            ...ticketData,
            createdAt: ticketData.createdAt.toISOString(),
            closedAt: ticketData.closedAt ? ticketData.closedAt.toISOString() : null
          }
        });
  
      } catch (err) {
        console.error('Erreur création ticket:', err);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur lors de la création du ticket'
        });
    }
}
)


//recuperation de la liste des tickets: 
app.get('/api/tickets', verifyToken, async (req, res) => {
  
    try {
      let tickets;
        //verifie si lutilisateur est un user ou un technician
      if (req.user.role === 'technician') {
        tickets = await db('tickets');
      } else if (req.user.role === 'user') {
        tickets = await db('tickets').where('userId', req.user.id);
      } else {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }
  
      res.json({ success: true, tickets });
    } catch (err) {
      console.error('Erreur lors de la récupération des tickets:', err);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });



  //recuperation des details d'un ticket
  app.get('/api/tickets/:id', verifyToken, async (req, res) => {
    //verifie les erreurs
    const errors=validationResult(req);
    if (!errors.isEmpty()){
        return res.status(400).json({errors: errors.array})
    }


    const ticketId = parseInt(req.params.id);
  
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'ID de ticket invalide' });
    }
  
    try {
      const ticket = await db('tickets').where({ id: ticketId }).first();
  
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
      }
  
      //un user n'a que seulement le droit de voir ses propres tickets
      if (req.user.role === 'user' && ticket.userId !== req.user.id) {
        return res.status(403).json({ error: 'Accès interdit à ce ticket' });
      }
  
      //technician peut voir tous les tickets
      if (req.user.role === 'technician' || ticket.userId === req.user.id) {
        return res.json({ success: true, ticket });
      }
  
      return res.status(403).json({ error: 'Accès non autorisé' });
  
    } catch (err) {
      console.error('Erreur lors de la récupération du ticket:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });


  //mis a jour d'un ticket seulement technician
  app.put('/api/tickets/:id', verifyToken, updateTicket, async (req, res) => {
    //seulement les technicians peuvent mettre a jour un ticket
    if (req.user.role !== 'technician') {
      return res.status(403).json({ error: 'Seuls les techniciens peuvent mettre à jour un ticket.' });
    }
  
    //verifie les erreurs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'ID de ticket invalide.' });
    }
  
    
    const { title, description, status, technicianId, closedAt } = req.body;
  
    
    const updateData = {
      title,
      description,
      status,
      technicianId,
      closedAt: status === 'closed' ? closedAt : null
    };
  
    try {
      
      const ticket = await db('tickets').where({ id: ticketId }).first();
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket non trouvé.' });
      }
  
      //maj du ticket
      await db('tickets').where({ id: ticketId }).update(updateData);
  
      
      const updatedTicket = await db('tickets').where({ id: ticketId }).first();
  
      
      res.json({ success: true, ticket: updatedTicket });
  
    } catch (err) {
      console.error('Erreur mise à jour ticket:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

//supprimer un ticket (admin seulement)
  app.delete('/api/admin/tickets/:id', verifyToken,authorisationAdmin,async (req, res) => {
      try {
        const ticketId = req.params.id;
  
        
        const ticket = await db('tickets')
          .where('id', ticketId)
          .first();
  
        if (!ticket) {
          return res.status(404).json({
            success: false,
            error: 'Ticket non trouvé'
          });
        }
  
        
        await db('tickets').where('id', ticketId).delete();
  
        
        res.json({
          success: true,
          message: 'Ticket supprimé avec succès',
          deletedTicket: {
            id: ticket.id,
            title: ticket.title,
            status: ticket.status
          }
        });
  
      } catch (err) {
        console.error('Erreur suppression ticket:', err);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur lors de la suppression du ticket'
        });
      }
    }
  );



  
  
  
//start serveur
const port = 3000
app.listen(port, () => {
    console.log("Serveur commencé sur http://localhost:3000")
})