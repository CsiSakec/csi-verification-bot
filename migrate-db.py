from pymongo import MongoClient
import json

mongo_client = MongoClient("mongodb+srv://sudarshandate21:Date%402004@cluster0.p2utt.mongodb.net/CSI-BOT?retryWrites=true&w=majority&appName=Cluster0")
mongo_db = mongo_client["CSI-BOT"]

with open("sqlite_data.json") as json_file:
    data = json.load(json_file)

for table_name, records in data.items():
    collection = mongo_db[table_name]  
    if records:
        collection.insert_many(records)

print("Data migration completed!")
