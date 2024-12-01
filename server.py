from flask import Flask, jsonify, request
from flask_pymongo import PyMongo

app = Flask(__name__)

# Configurar la conexión con MongoDB
app.config["MONGO_URI"] = "mongodb://localhost:27017/pokemon_db"
mongo = PyMongo(app)

# Ruta para obtener Pokémon por número
@app.route('/api/pokemon/<int:numero>', methods=['GET'])
def obtener_pokemon(numero):
    pokemon = mongo.db.pokemon.find_one({"_id": numero})
    if not pokemon:
        return jsonify({"error": "Pokémon no encontrado"}), 404
    # Convertir el resultado de MongoDB a un diccionario JSON serializable
    pokemon["_id"] = str(pokemon["_id"])
    return jsonify(pokemon)

# Ruta para listar Pokémon
@app.route('/api/pokemon', methods=['GET'])
def listar_pokemon():
    region = request.args.get('region', 'Kanto')  # Región por defecto
    orden = request.args.get('orden', 'ascendente')  # Orden por defecto
    query = {}
    
    if region != 'Todos':
        query['region'] = region
    
    sort_order = 1 if orden == 'ascendente' else -1
    
    pokemon = list(mongo.db.pokemon.find(query).sort("_id", sort_order))
    for p in pokemon:
        p["_id"] = str(p["_id"])
    return jsonify(pokemon)

if __name__ == '__main__':
    app.run(debug=True)
