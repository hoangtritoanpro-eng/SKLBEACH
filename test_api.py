import requests
import json

URL = "https://script.google.com/macros/s/AKfycbzsmBgo6qIPnlfrgY1_DdqXMho_u5_CsaeVyFhIkDJxx1tkFk2ryg7fDZRZ4luNmoMU/exec"

# Let's get the public dashboard to see classes and students
resp = requests.post(URL, json={"action": "getPublicDashboard"})
with open('out.json', 'w', encoding='utf-8') as f:
    f.write(resp.text)
