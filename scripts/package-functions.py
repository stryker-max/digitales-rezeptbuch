"""Package the built handler; public native artifacts are integrity-pinned."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
for name in ['api','worker']:
 output=root/f'dist/functions/{name}.zip'
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
  archive.write(root/f'dist/functions/{name}/index.mjs','index.mjs')
 if output.stat().st_size>10*1024*1024: raise RuntimeError('Paket zu groß.')
 print(f'{name}: {output.stat().st_size} bytes')
