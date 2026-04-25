const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Génération de token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// POST /api/auth/register
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Le nom d\'utilisateur doit faire entre 3 et 20 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et -'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit faire au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà (insensible à la casse pour l'email)
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() }, 
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email.toLowerCase() 
          ? 'Cet email est déjà utilisé' 
          : 'Ce nom d\'utilisateur est déjà utilisé'
      });
    }

    // Créer le nouvel utilisateur
    const user = new User({
      username,
      email: email.toLowerCase(),
      password
    });

    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', [
  body('login')
    .notEmpty()
    .withMessage('Email ou nom d\'utilisateur requis'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { login, password } = req.body;

    // Chercher l'utilisateur par email ou nom d'utilisateur
    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { username: login }
      ],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        message: 'Identifiants invalides'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Identifiants invalides'
      });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    res.json({
      message: 'Connexion réussie',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Récupérer le profil de l'utilisateur connecté
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: req.user.toPublicJSON()
  });
});

// PUT /api/auth/profile - Mettre à jour le profil
router.put('/profile', authMiddleware, [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Le nom d\'utilisateur doit faire entre 3 et 20 caractères'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Thème invalide'),
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Préférence de notification invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array().map(err => err.msg)
      });
    }

    const allowedUpdates = ['username', 'email', 'avatar', 'preferences'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'preferences') {
          updates.preferences = { ...req.user.preferences, ...req.body.preferences };
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profil mis à jour avec succès',
      user: user.toPublicJSON()
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password - Changer le mot de passe
router.post('/change-password', authMiddleware, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit faire au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router; 