from flask import Blueprint, request, jsonify
from extensions import db
from models.schedule import Schedule
from datetime import datetime

schedule_bp = Blueprint('schedules', __name__)
