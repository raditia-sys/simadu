import os
import zipfile

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, path).replace('\\', '/')
            ziph.write(file_path, arcname)

with zipfile.ZipFile('deploy_fix_python.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('frontend/dist', zipf)
