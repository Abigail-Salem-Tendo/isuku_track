from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from utils.auth_helpers import role_required
from utils.appwrite_client import get_storage_client
from appwrite.input_file import InputFile
from appwrite.id import ID
import os

upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('/photo', methods=['POST'])
@role_required('resident')
def upload_photo():
    # Check if file is in the request
    if 'photo' not in request.files:
        return jsonify({"error": "No photo file provided"}), 400

    file = request.files['photo']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use jpg, jpeg, png, or webp"}), 400

    # Read file content and check size
    file_content = file.read()
    if len(file_content) > MAX_FILE_SIZE:
        return jsonify({"error": "File too large. Maximum size is 5MB"}), 400

    try:
        storage = get_storage_client()
        bucket_id = os.getenv('APPWRITE_BUCKET_ID')

        # Upload to Appwrite
        result = storage.create_file(
            bucket_id=bucket_id,
            file_id=ID.unique(),
            file=InputFile.from_bytes(file_content, file.filename)
        )

        file_id = result.id
        endpoint = os.getenv('APPWRITE_ENDPOINT')
        project_id = os.getenv('APPWRITE_PROJECT_ID')

        # Build the public view URL
        photo_url = f"{endpoint}/storage/buckets/{bucket_id}/files/{file_id}/view?project={project_id}"

        return jsonify({
            "message": "Photo uploaded successfully",
            "photo_url": photo_url,
            "file_id": file_id
        }), 201

    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500
