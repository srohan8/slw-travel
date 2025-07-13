import os
from flask import g
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "travel_data.db")

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db
