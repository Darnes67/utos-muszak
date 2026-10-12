const fs=require('node:fs');
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','auth.js'])fs.copyFileSync(file,'dist/'+file);
console.log('HTML és bejelentkezés: dist/ · ranglista: netlify/functions/ranglista.mjs');
