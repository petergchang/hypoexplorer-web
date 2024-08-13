from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import sqlite3
import json
from your_module import load_mnist  # adjust this import as needed

app = FastAPI()

DATABASE = 'mnist_game.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

class GameStart(BaseModel):
    user_id: str

class Turn(BaseModel):
    game_id: int
    turn_number: int
    pixel_x: int
    pixel_y: int
    probability_distribution: List[float]
    thought_process: str

class GameEnd(BaseModel):
    game_id: int
    final_guess: int
    num_turns: int

@app.on_event("startup")
async def startup():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            true_label INTEGER,
            final_guess INTEGER,
            num_turns INTEGER
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            turn_number INTEGER,
            pixel_x INTEGER,
            pixel_y INTEGER,
            probability_distribution TEXT,
            thought_process TEXT,
            FOREIGN KEY (game_id) REFERENCES games (id)
        )
    ''')
    db.commit()

@app.post("/api/start_game")
async def start_game(game: GameStart):
    images, labels = load_mnist(num_images=1)
    image = images[0].tolist()
    label = int(labels[0])
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute('INSERT INTO games (user_id, true_label) VALUES (?, ?)',
                   (game.user_id, label))
    game_id = cursor.lastrowid
    db.commit()
    
    return {
        'game_id': game_id,
        'image': image,
        'label': label
    }

@app.post("/api/record_turn")
async def record_turn(turn: Turn):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO turns 
        (game_id, turn_number, pixel_x, pixel_y, probability_distribution, thought_process)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (turn.game_id, turn.turn_number, turn.pixel_x, turn.pixel_y,
          json.dumps(turn.probability_distribution), turn.thought_process))
    db.commit()
    return {'success': True}

@app.post("/api/end_game")
async def end_game(game: GameEnd):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE games
        SET end_time = CURRENT_TIMESTAMP, final_guess = ?, num_turns = ?
        WHERE id = ?
    ''', (game.final_guess, game.num_turns, game.game_id))
    db.commit()
    return {'success': True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
