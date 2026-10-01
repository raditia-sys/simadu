import os

files_to_fix = [
    'frontend/src/pages/LaporanPerjalananPage.jsx',
    'frontend/src/pages/SurveiPage.jsx',
    'backend/controllers/LaporanPerjalananController.php'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # The content is currently corrupted (e.g. contains 'â€�').
    # This means the original UTF-8 bytes were read as cp1252 and saved as UTF-8.
    # To reverse this, we encode it back to cp1252, and then decode as utf-8.
    try:
        fixed_content = content.encode('cp1252').decode('utf-8')
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Fixed {file_path}")
    except Exception as e:
        print(f"Failed to fix {file_path}: {e}")
