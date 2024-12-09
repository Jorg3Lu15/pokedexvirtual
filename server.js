const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const { Schema } = mongoose;
const autoIncrement = require('mongoose-sequence')(mongoose); // Paquete para autoincrementar IDs

const app = express();
const port = 3000;

// Configuración de multer para almacenar las imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para la imagen
  },
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json());

// Configuración para servir archivos estáticos desde la carpeta "static"
app.use('/static', express.static(path.join(__dirname, 'static')));

// Configuración para servir archivos de vistas desde la carpeta "templates"
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// Configuración para servir archivos estáticos desde la carpeta "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Esquema del Pokémon en MongoDB
const pokemonSchema = new Schema({
  id: { type: Number, unique: true }, // Campo autoincrementable
  nombre: String,
  tipo: [String],
  altura: String,
  peso: String,
  categoria: String,
  habilidad: String,
  descripcion: String,
  sexo: [String],
  imagen: String, // Guardamos la URL de la imagen
});

// Plugin para autoincrementar el campo "id"
pokemonSchema.plugin(autoIncrement, { inc_field: 'id' });

const Pokemon = mongoose.model('Pokemon', pokemonSchema);

// Ruta para agregar un nuevo Pokémon con imagen
app.post('/api/pokemons', upload.single('imagen'), async (req, res) => {
  const { nombre, tipo, altura, peso, categoria, habilidad, descripcion, sexo } = req.body;
  const imagenUrl = req.file ? `/uploads/${req.file.filename}` : null; // Guardar la ruta de la imagen

  const nuevoPokemon = new Pokemon({
    nombre,
    tipo: Array.isArray(tipo) ? tipo : tipo.split(','), // Convertir a array si es necesario
    altura,
    peso,
    categoria,
    habilidad,
    descripcion,
    sexo: Array.isArray(sexo) ? sexo : sexo.split(','), // Convertir a array si es necesario
    imagen: imagenUrl, // Guardamos la URL de la imagen
  });

  try {
    const result = await nuevoPokemon.save();
    console.log('Pokémon añadido:', result);
    res.status(201).json({ message: 'Pokémon añadido exitosamente', pokemon: result });
  } catch (err) {
    console.error('Error al añadir el Pokémon:', err);
    res.status(500).json({ message: 'Error al añadir el Pokémon' });
  }
});

// Ruta para obtener todos los Pokémon
app.get('/api/pokemons', async (req, res) => {
  try {
    const pokemons = await Pokemon.find();
    res.json(pokemons);
  } catch (err) {
    console.error('Error al obtener los Pokémon:', err);
    res.status(500).json({ message: 'Error al obtener los Pokémon' });
  }
});

// Ruta para eliminar pokémon registrado
app.delete('/api/pokemons/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Pokemon.findOneAndDelete({ id }); // Buscar y eliminar el Pokémon por ID
    if (result) {
      res.json({ message: 'Pokémon eliminado con éxito' });
    } else {
      res.status(404).json({ message: 'Pokémon no encontrado' });
    }
  } catch (err) {
    console.error('Error al eliminar el Pokémon:', err);
    res.status(500).json({ message: 'Error al eliminar el Pokémon' });
  }
});

// Ruta para la página principal (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Ruta para la página de la Pokédex (pokedex.html)
app.get('/pokedex', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'pokedex.html'));
});

// Ruta para la página de añadir Pokémon (add.html)
app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'add.html'));
});

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/MundoPokemon', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar con MongoDB:', err));

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
