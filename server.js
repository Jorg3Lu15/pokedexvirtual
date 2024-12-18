// --------------------------- IMPORTACIONES ---------------------------
const { MongoClient, ServerApiVersion } = require('mongodb');
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
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'pokeKey999';
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/MundoPokemon';

// --------------------------- MIDDLEWARES ---------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --------------------------- CONEXIÓN A LA BASE DE DATOS ---------------------------
const uri = "mongodb+srv://jluishuerta07130:<db_password>@pokemon.da1an.mongodb.net/?retryWrites=true&w=majority&appName=Pokemon";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);


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
  imagen: { type: String, required: true }, // Ruta de la imagen del Pokémon
});

// Generar un `id` autoincremental antes de guardar un nuevo Pokémon
pokemonSchema.pre('save', async function (next) {
  const lastPokemon = await Pokemon.findOne().sort({ id: -1 }); // Obtener el Pokémon con el ID más alto
  this.id = lastPokemon ? lastPokemon.id + 1 : 1; // Incrementar el ID o iniciar en 1
  next();
});

const Pokemon = mongoose.model('pokemons', pokemonSchema);

// --------------------------- CONFIGURACIÓN DE MULTER ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para la imagen
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

  // Validar que los datos sean correctos
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ message: 'El nombre de usuario es obligatorio y debe ser una cadena de texto válida.' });
  }
  if (typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ message: 'La contraseña es obligatoria y debe ser una cadena de texto válida.' });
  }

  try {
    const existingUser = await Admin.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'El usuario ya existe.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Admin({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: 'Registro exitoso, puedes iniciar sesión ahora.' });
  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Inicio de sesión
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ message: 'El nombre de usuario debe ser una cadena de texto válida.' });
  }

  if (typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ message: 'La contraseña debe ser una cadena de texto válida.' });
  }

  try {
    const user = await Admin.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

    // Generar token JWT
    const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear Pokémon con subida de imagen
app.post('/api/pokemons', authenticateToken, upload.single('imagen'), async (req, res) => {
  const { nombre, tipo, altura, peso, habilidad, descripcion, sexo } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : ''; // Ruta de la imagen

  // Validar que los campos necesarios estén presentes
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
      imagen, // Ruta de la imagen
    });

    await newPokemon.save();
    
    // Incluimos el 'id' generado en la respuesta
    res.status(201).json({
      message: 'Pokémon creado con éxito',
      pokemon: {
        id: newPokemon.id,  // Aquí mostramos el id generado en la base de datos
        nombre: newPokemon.nombre,
        tipo: newPokemon.tipo,
        altura: newPokemon.altura,
        peso: newPokemon.peso,
        habilidad: newPokemon.habilidad,
        descripcion: newPokemon.descripcion,
        sexo: newPokemon.sexo,
        imagen: newPokemon.imagen,
      }
    });
  } catch (err) {
    console.error('Error al crear Pokémon:', err);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});


// Endpoint protegido para la Pokédex
app.get('/api/pokedex', authenticateToken, async (req, res) => {
  try {
    const pokemons = await Pokemon.find(); // Obtener todos los Pokémon de la base de datos
    res.json({ message: `Bienvenido ${req.user.username}, aquí está tu Pokédex.`, pokemons });
  } catch (error) {
    console.error('Error al obtener Pokémon:', error);
    res.status(500).json({ message: 'Error al obtener Pokémon' });
  }
});

// Ruta para obtener Pokémon específicos
app.get('/api/pokemons', authenticateToken, async (req, res) => {
  try {
    const pokemons = await Pokemon.find();
    res.json(pokemons);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los Pokémon' });
  }
});

// --------------------------- RUTAS HTML ---------------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'register.html')));
app.get('/pokedex', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'pokedex.html')));
app.get('/add',(req, res) => res.sendFile(path.join(__dirname, 'templates', 'add.html')));

// --------------------------- INICIO DEL SERVIDOR ---------------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
