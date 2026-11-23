import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request

app = Flask(__name__, static_folder="public", static_url_path="")
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", "./data/colleges.sqlite"))


def connect_db():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db():
    with connect_db() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS colleges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                country TEXT NOT NULL,
                college TEXT NOT NULL,
                igcse_needed TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"""
        )


def validate_row(payload):
    if not isinstance(payload, dict):
        return None, "Please provide a JSON object."
    country = payload.get("country")
    college = payload.get("college")
    igcse_needed = payload.get("igcseNeeded")
    if not all(isinstance(value, str) and value.strip() for value in (country, college, igcse_needed)):
        return None, "Please fill in all three fields."
    row = {
        "country": country.strip(),
        "college": college.strip(),
        "igcseNeeded": igcse_needed.strip(),
    }
    if len(row["country"]) > 100 or len(row["college"]) > 160 or len(row["igcseNeeded"]) > 500:
        return None, "Country must be 100 characters or less, college 160, and IGCSE needed 500."
    return row, None


def row_to_dict(row):
    return {"id": row["id"], "country": row["country"], "college": row["college"], "igcseNeeded": row["igcse_needed"]}


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api/colleges")
def list_colleges():
    with connect_db() as connection:
        rows = connection.execute(
            "SELECT id, country, college, igcse_needed FROM colleges ORDER BY country COLLATE NOCASE, college COLLATE NOCASE"
        ).fetchall()
    return jsonify([row_to_dict(row) for row in rows])


@app.post("/api/colleges")
def create_college():
    row, error = validate_row(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400
    with connect_db() as connection:
        cursor = connection.execute(
            "INSERT INTO colleges (country, college, igcse_needed) VALUES (?, ?, ?)",
            (row["country"], row["college"], row["igcseNeeded"]),
        )
        row["id"] = cursor.lastrowid
    return jsonify(row), 201


@app.put("/api/colleges/<int:row_id>")
def update_college(row_id):
    row, error = validate_row(request.get_json(silent=True))
    if error:
        return jsonify(error=error), 400
    with connect_db() as connection:
        cursor = connection.execute(
            "UPDATE colleges SET country = ?, college = ?, igcse_needed = ? WHERE id = ?",
            (row["country"], row["college"], row["igcseNeeded"], row_id),
        )
    if cursor.rowcount == 0:
        return jsonify(error="Row not found."), 404
    row["id"] = row_id
    return jsonify(row)


@app.delete("/api/colleges/<int:row_id>")
def delete_college(row_id):
    with connect_db() as connection:
        cursor = connection.execute("DELETE FROM colleges WHERE id = ?", (row_id,))
    if cursor.rowcount == 0:
        return jsonify(error="Row not found."), 404
    return "", 204


initialize_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "3000")))
