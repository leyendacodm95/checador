import os
import re

path = 'src/components/biometrics/BiometricTeacherScanner.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'const EAR_THRESHOLD = 0\.25;.*?\} else \{\s*setStatus\([^)]+\);\s*\}\s*\}'
new_logic = """// Bypass Liveness (Blink) to make it instant and reliable
                setStatus(`Identidad verificada para ${matchedUser.nombre || matchedUser.name}! Registrando...`);
                onSuccess(matchedUser);
              }"""

if re.search(pattern, c, flags=re.DOTALL):
    c = re.sub(pattern, new_logic, c, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Blink logic removed.")
else:
    print("Pattern not found!")
