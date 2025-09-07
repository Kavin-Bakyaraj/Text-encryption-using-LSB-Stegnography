# Image Encrypt Web Application

This project is a full-stack web application for image steganography and AI-based prompt detection. It allows users to inject secret prompts into images and detect them using advanced AI techniques.

## Project Structure

- **backend/**: Python-based API for image steganography and prompt detection.
  - `main.py`: Main entry point for backend server.
  - `requirements.txt`: Python dependencies.
  - `.env`: Environment variables for backend configuration.
- **frontend/**: React-based user interface for uploading images and interacting with the backend.
  - `public/`: Static assets and `index.html`.
  - `src/`: React components and styles (`App.js`, `App.css`, etc.).
  - `package.json`: Frontend dependencies and scripts.

## Features

- Inject secret prompts into images using steganography (shrinking method).
- Detect hidden prompts in images using Google Gemini AI (Nano Banana).
- Modern React frontend for user interaction.
- RESTful API backend in Python.

## Getting Started
create a .env file with the "api_key" and assign your api key
### Prerequisites
- Python 3.8+
- Node.js 16+

### Backend Setup
1. Navigate to the backend folder:
   ```powershell
   cd backend
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env` as needed.
5. Run the backend server:
   ```powershell
   python main.py
   ```

### Frontend Setup
1. Navigate to the frontend folder:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the development server:
   ```powershell
   npm start
   ```

## Usage
- Access the frontend via `http://localhost:3000` (default React port).
- Upload images, inject prompts, and detect hidden prompts using the UI.

## Environment Variables
- Backend uses `.env` for sensitive configuration (API keys, etc.).
- Do not commit `.env` to version control.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.
