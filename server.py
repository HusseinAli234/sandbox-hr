import http.server
import socketserver
import urllib.parse
import os

PORT = 3000
DIRECTORY = "./"  # Путь до папки с фронтом

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Парсим URL, убираем параметры
        parsed_path = urllib.parse.urlparse(path)
        clean_path = parsed_path.path.lstrip("/")

        # Путь к файлу
        full_path = os.path.join(DIRECTORY, clean_path)

        # Если это существующий файл — отдаем его
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return full_path

        # Если путь начинается с /test — отдаем test.html
        if parsed_path.path.startswith("/test"):
            return os.path.join(DIRECTORY, "test.html")

        # По умолчанию — index.html
        return os.path.join(DIRECTORY, "index.html")

    def log_message(self, format, *args):
        return  # Отключаем логгирование

os.chdir(DIRECTORY)

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    httpd.serve_forever()
