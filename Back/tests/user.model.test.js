const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

// Configuration de la base de test
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';

describe('User Model', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Schema Validation', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    };

    it('devrait créer un utilisateur avec des données valides', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe('testuser');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.password).not.toBe('Password123'); // Doit être hashé
    });

    it('devrait initialiser les valeurs par défaut', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser.stats.gamesPlayed).toBe(0);
      expect(savedUser.stats.gamesWon).toBe(0);
      expect(savedUser.preferences.notifications).toBe(true);
      expect(savedUser.preferences.theme).toBe('light');
      expect(savedUser.preferences.language).toBe('fr');
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.lastLogin).toBeDefined();
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    describe('Username validation', () => {
      it('devrait rejeter un username vide', async () => {
        const user = new User({ ...validUserData, username: '' });
        await expect(user.save()).rejects.toThrow('Le nom d\'utilisateur est requis');
      });

      it('devrait rejeter un username trop court', async () => {
        const user = new User({ ...validUserData, username: 'ab' });
        await expect(user.save()).rejects.toThrow('Le nom d\'utilisateur doit faire au moins 3 caractères');
      });

      it('devrait rejeter un username trop long', async () => {
        const user = new User({ ...validUserData, username: 'a'.repeat(21) });
        await expect(user.save()).rejects.toThrow('Le nom d\'utilisateur ne peut pas dépasser 20 caractères');
      });

      it('devrait rejeter les doublons de username', async () => {
        await new User(validUserData).save();
        
        const duplicateUser = new User({
          ...validUserData,
          email: 'different@example.com'
        });
        
        await expect(duplicateUser.save()).rejects.toThrow();
      });

      it('devrait trim les espaces du username', async () => {
        const user = new User({ ...validUserData, username: '  testuser  ' });
        const savedUser = await user.save();
        
        expect(savedUser.username).toBe('testuser');
      });
    });

    describe('Email validation', () => {
      it('devrait rejeter un email vide', async () => {
        const user = new User({ ...validUserData, email: '' });
        await expect(user.save()).rejects.toThrow('L\'email est requis');
      });

      it('devrait rejeter un email invalide', async () => {
        const invalidEmails = [
          'invalid-email',
          'test@',
          '@example.com',
          'test..test@example.com',
          'test@example',
          'test@.com'
        ];

        for (const email of invalidEmails) {
          const user = new User({ ...validUserData, email });
          await expect(user.save()).rejects.toThrow('Email invalide');
        }
      });

      it('devrait accepter des emails valides', async () => {
        const validEmails = [
          'test@example.com',
          'user.test@domain.co.uk',
          'test-user@example-domain.com',
          'test123@domain123.fr'
        ];

        for (const email of validEmails) {
          const user = new User({ ...validUserData, email, username: `user${Math.random()}` });
          const savedUser = await user.save();
          expect(savedUser.email).toBe(email.toLowerCase());
        }
      });

      it('devrait convertir l\'email en lowercase', async () => {
        const user = new User({ ...validUserData, email: 'TEST@EXAMPLE.COM' });
        const savedUser = await user.save();
        
        expect(savedUser.email).toBe('test@example.com');
      });

      it('devrait rejeter les doublons d\'email', async () => {
        await new User(validUserData).save();
        
        const duplicateUser = new User({
          ...validUserData,
          username: 'different'
        });
        
        await expect(duplicateUser.save()).rejects.toThrow();
      });

      it('devrait trim les espaces de l\'email', async () => {
        const user = new User({ ...validUserData, email: '  test@example.com  ' });
        const savedUser = await user.save();
        
        expect(savedUser.email).toBe('test@example.com');
      });
    });

    describe('Password validation', () => {
      it('devrait rejeter un mot de passe vide', async () => {
        const user = new User({ ...validUserData, password: '' });
        await expect(user.save()).rejects.toThrow('Le mot de passe est requis');
      });

      it('devrait rejeter un mot de passe trop court', async () => {
        const user = new User({ ...validUserData, password: '12345' });
        await expect(user.save()).rejects.toThrow('Le mot de passe doit faire au moins 6 caractères');
      });

      it('devrait accepter un mot de passe de 6 caractères minimum', async () => {
        const user = new User({ ...validUserData, password: '123456' });
        const savedUser = await user.save();
        
        expect(savedUser.password).not.toBe('123456');
        expect(savedUser.password).toMatch(/^\$2[ayb]\$12\$/); // Format bcrypt
      });
    });

    describe('Preferences validation', () => {
      it('devrait accepter un thème valide', async () => {
        const user = new User({ 
          ...validUserData, 
          preferences: { theme: 'dark' }
        });
        const savedUser = await user.save();
        
        expect(savedUser.preferences.theme).toBe('dark');
      });

      it('devrait rejeter un thème invalide', async () => {
        const user = new User({ 
          ...validUserData, 
          preferences: { theme: 'invalid' }
        });
        
        await expect(user.save()).rejects.toThrow();
      });

      it('devrait accepter des préférences de notification boolean', async () => {
        const user = new User({ 
          ...validUserData, 
          preferences: { notifications: false }
        });
        const savedUser = await user.save();
        
        expect(savedUser.preferences.notifications).toBe(false);
      });
    });
  });

  describe('Password Hashing', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    };

    it('devrait hasher le mot de passe automatiquement', async () => {
      const user = new User(userData);
      await user.save();
      
      expect(user.password).not.toBe('Password123');
      expect(user.password).toMatch(/^\$2[ayb]\$12\$/);
      expect(user.password.length).toBeGreaterThan(50);
    });

    it('ne devrait pas re-hasher si le mot de passe n\'a pas changé', async () => {
      const user = new User(userData);
      await user.save();
      
      const originalHash = user.password;
      user.username = 'newusername';
      await user.save();
      
      expect(user.password).toBe(originalHash);
    });

    it('devrait re-hasher si le mot de passe change', async () => {
      const user = new User(userData);
      await user.save();
      
      const originalHash = user.password;
      user.password = 'NewPassword456';
      await user.save();
      
      expect(user.password).not.toBe(originalHash);
      expect(user.password).toMatch(/^\$2[ayb]\$12\$/);
    });

    it('devrait utiliser un salt de force 12', async () => {
      const user = new User(userData);
      await user.save();
      
      // Vérifier que le hash contient bien le salt rounds 12
      expect(user.password.startsWith('$2b$12$') || user.password.startsWith('$2a$12$')).toBe(true);
    });
  });

  describe('comparePassword method', () => {
    let user;
    
    beforeEach(async () => {
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await user.save();
    });

    it('devrait retourner true pour un mot de passe correct', async () => {
      const isValid = await user.comparePassword('Password123');
      expect(isValid).toBe(true);
    });

    it('devrait retourner false pour un mot de passe incorrect', async () => {
      const isValid = await user.comparePassword('WrongPassword');
      expect(isValid).toBe(false);
    });

    it('devrait être sensible à la casse', async () => {
      const isValid = await user.comparePassword('password123');
      expect(isValid).toBe(false);
    });

    it('devrait gérer les chaînes vides', async () => {
      const isValid = await user.comparePassword('');
      expect(isValid).toBe(false);
    });

    it('devrait gérer les valeurs null/undefined', async () => {
      const isValidNull = await user.comparePassword(null);
      const isValidUndefined = await user.comparePassword(undefined);
      
      expect(isValidNull).toBe(false);
      expect(isValidUndefined).toBe(false);
    });
  });

  describe('toPublicJSON method', () => {
    let user;
    
    beforeEach(async () => {
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        avatar: 'avatar.jpg',
        stats: {
          gamesPlayed: 5,
          gamesWon: 3,
          totalMoney: 15000,
          averageGameDuration: 1800
        }
      });
      await user.save();
    });

    it('devrait retourner les informations publiques', () => {
      const publicData = user.toPublicJSON();
      
      expect(publicData).toEqual({
        id: user._id,
        username: 'testuser',
        email: 'test@example.com',
        avatar: 'avatar.jpg',
        stats: {
          gamesPlayed: 5,
          gamesWon: 3,
          totalMoney: 15000,
          averageGameDuration: 1800
        },
        isActive: true,
        createdAt: user.createdAt
      });
    });

    it('ne devrait pas inclure le mot de passe', () => {
      const publicData = user.toPublicJSON();
      
      expect(publicData.password).toBeUndefined();
    });

    it('ne devrait pas inclure les préférences privées', () => {
      const publicData = user.toPublicJSON();
      
      expect(publicData.preferences).toBeUndefined();
      expect(publicData.lastLogin).toBeUndefined();
      expect(publicData.updatedAt).toBeUndefined();
    });

    it('devrait gérer les avatars null', () => {
      user.avatar = null;
      const publicData = user.toPublicJSON();
      
      expect(publicData.avatar).toBeNull();
    });
  });

  describe('Stats Management', () => {
    it('devrait initialiser les stats à zéro', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await user.save();
      
      expect(user.stats.gamesPlayed).toBe(0);
      expect(user.stats.gamesWon).toBe(0);
      expect(user.stats.totalMoney).toBe(0);
      expect(user.stats.averageGameDuration).toBe(0);
    });

    it('devrait permettre la mise à jour des stats', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await user.save();
      
      user.stats.gamesPlayed = 10;
      user.stats.gamesWon = 6;
      user.stats.totalMoney = 25000;
      user.stats.averageGameDuration = 2400;
      
      await user.save();
      
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.stats.gamesPlayed).toBe(10);
      expect(updatedUser.stats.gamesWon).toBe(6);
      expect(updatedUser.stats.totalMoney).toBe(25000);
      expect(updatedUser.stats.averageGameDuration).toBe(2400);
    });
  });

  describe('User Status Management', () => {
    it('devrait être actif par défaut', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await user.save();
      
      expect(user.isActive).toBe(true);
    });

    it('devrait permettre la désactivation d\'un utilisateur', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await user.save();
      
      user.isActive = false;
      await user.save();
      
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isActive).toBe(false);
    });

    it('devrait mettre à jour lastLogin', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await user.save();
      
      const originalLogin = user.lastLogin;
      
      // Attendre 1ms pour s'assurer que la date change
      setTimeout(async () => {
        user.lastLogin = new Date();
        await user.save();
        
        expect(user.lastLogin.getTime()).toBeGreaterThan(originalLogin.getTime());
      }, 1);
    });
  });

  describe('Error Handling', () => {
    it('devrait gérer les erreurs de validation multiples', async () => {
      const user = new User({
        username: 'ab', // Trop court
        email: 'invalid-email', // Email invalide
        password: '123' // Trop court
      });
      
      try {
        await user.save();
        fail('Devrait avoir lancé une erreur de validation');
      } catch (error) {
        expect(error.errors.username).toBeDefined();
        expect(error.errors.email).toBeDefined();
        expect(error.errors.password).toBeDefined();
      }
    });

    it('devrait gérer les erreurs de hash de mot de passe', async () => {
      // Mock bcrypt pour simuler une erreur
      const originalGenSalt = bcrypt.genSalt;
      bcrypt.genSalt = jest.fn().mockRejectedValue(new Error('Hash error'));
      
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      
      await expect(user.save()).rejects.toThrow('Hash error');
      
      // Restaurer la fonction originale
      bcrypt.genSalt = originalGenSalt;
    });
  });
});