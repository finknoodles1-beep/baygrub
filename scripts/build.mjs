import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'restaurants.js']) {
  await copyFile(file, `dist/${file}`);
}
await cp('public', 'dist', { recursive: true });
console.log('Built BayGrub into dist/');
