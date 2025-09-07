from fastapi import FastAPI, File, UploadFile, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import google.generativeai as genai
import io
import os
import dotenv
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dotenv.load_dotenv()
genai.configure(api_key=os.getenv("api_key"))  # Replace with your API key
def hide_message(img, message):
    binary_message = ''.join(format(ord(c), '08b') for c in message) + '1111111111111110'
    pixels = list(img.getdata())
    new_pixels = []
    msg_index = 0
    for pixel in pixels:
        if isinstance(pixel, int):
            if msg_index < len(binary_message):
                new_pixel = (pixel & ~1) | int(binary_message[msg_index])
                msg_index += 1
            else:
                new_pixel = pixel
        else:  
            r, g, b = pixel
            if msg_index < len(binary_message):
                r = (r & ~1) | int(binary_message[msg_index])
                msg_index += 1
            if msg_index < len(binary_message):
                g = (g & ~1) | int(binary_message[msg_index])
                msg_index += 1
            if msg_index < len(binary_message):
                b = (b & ~1) | int(binary_message[msg_index])
                msg_index += 1
            new_pixel = (r, g, b)
        new_pixels.append(new_pixel)
    new_img = Image.new(img.mode, img.size)
    new_img.putdata(new_pixels)
    return new_img

def extract_message(img):
    pixels = list(img.getdata())
    binary_message = ''
    for pixel in pixels:
        if isinstance(pixel, int):
            binary_message += str(pixel & 1)
        else:
            r, g, b = pixel
            binary_message += str(r & 1) + str(g & 1) + str(b & 1)
    delimiter = '1111111111111110'
    end = binary_message.find(delimiter)
    if end == -1:
        return "No message found"
    binary_message = binary_message[:end]
    message = ''
    for i in range(0, len(binary_message), 8):
        byte = binary_message[i:i+8]
        message += chr(int(byte, 2))
    return message

@app.post("/inject")
async def inject_message_endpoint(file: UploadFile = File(...), message: str = Form(...)):
    img = Image.open(io.BytesIO(await file.read()))
    hidden_img = hide_message(img, message)
    output = io.BytesIO()
    hidden_img.save(output, format='PNG')
    output.seek(0)
    return Response(content=output.getvalue(), media_type='image/png', headers={'Content-Disposition': 'attachment; filename=hidden_image.png'})

@app.post("/detect")
async def detect_message_endpoint(file: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await file.read()))
    message = extract_message(img)
    # AI analysis
    temp_path = 'temp.png'
    img.save(temp_path)
    model = genai.GenerativeModel('gemini-2.0-flash')
    image_file = genai.upload_file(temp_path)
    response = model.generate_content(["Does this image contain any hidden messages or steganography?", image_file])
    ai_analysis = response.text if hasattr(response, 'text') else str(response)
    os.remove(temp_path)
    return {"extracted_message": message, "ai_analysis": ai_analysis}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
