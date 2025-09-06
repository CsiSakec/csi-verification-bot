import sqlite3
import json

sqlite_conn = sqlite3.connect("bot.db")
cursor = sqlite_conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

data = {}

for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    data[table_name] = [dict(zip(columns, row)) for row in rows]

with open("sqlite_data.json", "w") as json_file:
    json.dump(data, json_file, indent=4)

sqlite_conn.close()
