# config.py
import os
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
          "connect_args": {
            "read_timeout": 30,
            "write_timeout": 30,
            "connect_timeout": 10,
        },
    }
    
    # JWT Settings
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # POINTS PER CLAIM CATEGORY
    POINTS_PER_CATEGORY = {
        "missed_collection": 10,
        "overflow": 15,
        "illegal_dumping": 20,
        "damaged_infrastructure": 25,
        "environmental_hazard": 30,
        "other": 5
    }