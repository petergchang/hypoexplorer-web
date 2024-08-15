from contextlib import asynccontextmanager
import json
import os
from pathlib import Path
import psycopg2

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from pydantic import BaseModel

DATABASE_URL = os.getenv('DATABASE_URL')


def load_mnist(
    num_pixels_per_dim: int = 14,
) -> tuple[np.ndarray, np.ndarray]:
    """Load the pre-downloaded MNIST dataset. The pixel values are normalized to [0, 1].

    Args:
        num_pixels_per_dim: The number of pixels per dimension (downsampled from 28).
        train: Whether to load the training set.
        num_images: The number of images to load. If None, load all images.
        num_classes: The number of classes to consider.
        data_dir: The directory to save the dataset.
        seed: The random seed.

    Returns:
        A tuple of images and labels.
    """
    mnist_data_dir = Path(Path.cwd(), "static_data")
    images = np.load(mnist_data_dir / f"mnist_images_{num_pixels_per_dim}px.npy")
    labels = np.load(mnist_data_dir / f"mnist_labels_{num_pixels_per_dim}px.npy")
    return images, labels


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def init_db():
    db = get_db()
    cursor = db.cursor()

    # Recreate the games table with the new schema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            image_idx INTEGER,
            true_label INTEGER,
            final_guess INTEGER,
            num_turns INTEGER,
            trajectory TEXT, -- List of (row, col) pairs
            thought_trajectory TEXT, -- List of thought processes
            probability_distribution_trajectory TEXT -- List of probability distributions
        )
    ''')
    
    # Recreate the turns table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS turns (
            id SERIAL PRIMARY KEY,
            game_id INTEGER,
            turn_number INTEGER,
            pixel_row INTEGER,
            pixel_col INTEGER,
            probability_distribution TEXT,
            thought_process TEXT,
            FOREIGN KEY (game_id) REFERENCES games (id)
        )
    ''')

    db.commit()
    cursor.close()
    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the database
    init_db()
    yield
    # Shutdown: You can add cleanup code here if needed


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GameStart(BaseModel):
    user_id: str


class Turn(BaseModel):
    game_id: int
    turn_number: int
    pixel_row: int
    pixel_col: int
    probability_distribution: list[float]
    thought_process: str


class GameEnd(BaseModel):
    game_id: int
    final_guess: int
    num_turns: int
    trajectory: list[tuple[int, int]]
    thought_trajectory: list[str]
    probability_distribution_trajectory: list[list[float]]


@app.post("/api/start_game")
async def start_game(game: GameStart):
    images, labels = load_mnist()
    # Randomly select an index and set it as game_id
    img_idx = int(np.random.Generator(np.random.PCG64()).choice(len(images), size=1))
    image = images[img_idx].tolist()
    label = int(labels[img_idx])
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute('INSERT INTO games (user_id, image_idx, true_label) VALUES (%s, %s, %s) RETURNING id',
                   (game.user_id, img_idx, label))
    game_id = cursor.fetchone()[0]  # Get the ID of the newly inserted game
    db.commit()
    
    return {
        'game_id': game_id,
        'image_idx': img_idx,
        'image': image,
        'label': label
    }


@app.post("/api/record_turn")
async def record_turn(turn: Turn):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO turns 
        (game_id, turn_number, pixel_row, pixel_col, probability_distribution, thought_process)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (turn.game_id, turn.turn_number, turn.pixel_row, turn.pixel_col,
          json.dumps(turn.probability_distribution), turn.thought_process))
    db.commit()
    return {'success': True}


@app.post("/api/end_game")
async def end_game(game: GameEnd):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE games
        SET end_time = CURRENT_TIMESTAMP, final_guess = %s, num_turns = %s,
            trajectory = %s, thought_trajectory = %s, probability_distribution_trajectory = %s
        WHERE id = %s
    ''', (game.final_guess, game.num_turns,
          json.dumps(game.trajectory), json.dumps(game.thought_trajectory),
          json.dumps(game.probability_distribution_trajectory),
          game.game_id))
    db.commit()
    return {'success': True}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
