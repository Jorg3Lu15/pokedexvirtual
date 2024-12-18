// --------------------------- IMPORTACIONES ---------------------------
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config(); // Variables de entorno

// --------------------------- CONFIGURACIÓN INICIAL ---------------------------
const app = express();
const PORT = process.env.PORT; // Puerto por defecto si no está definido en el entorno
const SECRET_KEY = process.env.SECRET_KEY;

// --------------------------- MIDDLEWARES ---------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --------------------------- CONEXIÓN A LA BASE DE DATOS ---------------------------
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://jluishuerta07130:<db_password>@pokemon.da1an.mongodb.net/?retryWrites=true&w=majority&appName=Pokemon;';

mongoose
  .connect(mongoURI)
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch((err) => {
    console.error('Error al conectar con MongoDB:', err.message);
    process.exit(1); // Finaliza la aplicación si no puede conectarse a la base de datos
  });

// --------------------------- MODELOS ---------------------------
const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
});
const Admin = mongoose.model('admins', adminSchema);

const pokemonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  nombre: { type: String, required: true },
  tipo: { type: [String], required: true },
  altura: { type: Number, required: true },
  peso: { type: Number, required: true },
  habilidad: { type: String, required: true },
  descripcion: { type: String, required: true },
  sexo: { type: [String], required: true },
  imagen: { type: String, required: true },
});

// Generar un `id` autoincremental antes de guardar un nuevo Pokémon
pokemonSchema.pre('save', async function (next) {
  const lastPokemon = await Pokemon.findOne().sort({ id: -1 });
  this.id = lastPokemon ? lastPokemon.id + 1 : 1;
  next();
});

const Pokemon = mongoose.model('pokemons', pokemonSchema);

// --------------------------- CONFIGURACIÓN DE MULTER ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// --------------------------- AUTORIZACIÓN ---------------------------
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// --------------------------- RUTAS ---------------------------

// Registro de usuarios
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  try {
    const existingUser = await Admin.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'El usuario ya existe.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Admin({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: 'Registro exitoso' });
  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Inicio de sesión
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Admin.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear Pokémon
app.post('/api/pokemons', authenticateToken, upload.single('imagen'), async (req, res) => {
  const { nombre, tipo, altura, peso, habilidad, descripcion, sexo } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : '';

  if (!nombre || !tipo || !altura || !peso || !habilidad || !descripcion || !sexo || !imagen) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const newPokemon = new Pokemon({
      nombre,
      tipo: tipo.split(','),
      altura,
      peso,
      habilidad,
      descripcion,
      sexo: sexo.split(','),
      imagen,
    });

    await newPokemon.save();
    res.status(201).json({ message: 'Pokémon creado con éxito', pokemon: newPokemon });
  } catch (err) {
    console.error('Error al crear Pokémon:', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Obtener Pokédex
app.get('/api/pokedex', authenticateToken, async (req, res) => {
  try {
    const pokemons = await Pokemon.find();
    res.json({ message: `Bienvenido ${req.user.username}`, pokemons });
  } catch (error) {
    console.error('Error al obtener Pokémon:', error);
    res.status(500).json({ message: 'Error al obtener Pokémon' });
  }
});

// --------------------------- INICIO DEL SERVIDOR ---------------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
